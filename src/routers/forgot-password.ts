import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../db';  // Your PostgreSQL pool

const router = express.Router();

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

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
            <h1>Password Reset</h1>
            <p>You requested to reset your password. Click the link below:</p>
            <a href="${resetURL}" target="_blank">${resetURL}</a>
        `;

        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            html: message
        });

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;