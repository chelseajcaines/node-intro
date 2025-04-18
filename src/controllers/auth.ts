import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import pool from '../db';  // Your PostgreSQL pool

// Forgot Password Function
export const forgotPassword = async (req: any, res: any) => {
    const { email } = req.body;

    // Check if email is provided in the request body
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        // Query the user by email from PostgreSQL
        const result = await pool.query('SELECT * FROM user_table WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'User with this email does not exist.' });
        }

        const user = result.rows[0];

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiration = Math.floor(Date.now() / 1000) + 3600; // 1-hour expiration in seconds

        // Store the reset token and expiration in the database
        await pool.query(
            'UPDATE user_table SET reset_password_token = $1, reset_password_expiration = to_timestamp($2) WHERE email = $3',
            [resetToken, resetTokenExpiration, email]
        );

        // Send email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetURL = `http://localhost:3000/reset-password?token=${resetToken}`;
        const message = `
    <div style="font-family: Arial, sans-serif; text-align: center;">
        <img src="https://yourdomain.com/path-to-your-logo.png" alt="Your Logo" style="max-width: 200px; margin-bottom: 20px;" />
        <h2>Click below to reset your password.</h2>
        <p>Link will expire after 1 hour.</p>
        <a href="${resetURL}" target="_blank" style="display: inline-block; margin-top: 10px; color: #fff; background-color: #007BFF; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    </div>
`;

        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            html: message
        });

        // Respond with a success message and the reset token
        res.json({ 
            message: 'Password reset email sent',
            resetToken: resetToken // Include the reset token in the response
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reset Password Function
export const resetPassword = async (req: any, res: any) => {
    const { token, newPassword } = req.body;

    // Check if token and newPassword are provided
    if (!token) {
        return res.status(400).json({ message: 'Reset token is required.' });
    }
    if (!newPassword) {
        return res.status(400).json({ message: 'New password is required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);

        const result = await pool.query(
            'SELECT * FROM user_table WHERE reset_password_token = $1 AND reset_password_expiration > to_timestamp($2)',
            [token, currentTimeInSeconds]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE user_table SET password_hash = $1, reset_password_token = NULL, reset_password_expiration = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};