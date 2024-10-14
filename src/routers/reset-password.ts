import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';  // Your PostgreSQL pool

const router = express.Router();

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Convert current time to seconds (PostgreSQL expects seconds, not milliseconds)
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);

        // Query the user by reset token and ensure it's not expired
        const result = await pool.query(
            'SELECT * FROM user_table WHERE reset_password_token = $1 AND reset_password_expiration > to_timestamp($2)',
            [token, currentTimeInSeconds]  // Use seconds instead of milliseconds
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const user = result.rows[0];

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear the reset token and expiration
        await pool.query(
            'UPDATE user_table SET password_hash = $1, reset_password_token = NULL, reset_password_expiration = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;