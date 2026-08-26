import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { query } from '../db.js';

const router = Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

router.post('/register', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        await query(
            'INSERT INTO users (email, password) VALUES ($1, $2)',
            [req.body.email, hashedPassword]
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        console.error('[Register]', err.message);
        res.status(400).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, email: user.email });
});

router.post('/forgot-password', async (req, res) => {
    const { rows } = await query('SELECT id FROM users WHERE email = $1', [req.body.email]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await query(
        'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE email = $3',
        [resetCode, expiresAt, req.body.email]
    );

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: req.body.email,
            subject: 'Password Reset Code',
            html: `<h2>Your reset code</h2><p><b>${resetCode}</b></p>`
        });
        res.json({ message: 'Reset code sent to email' });
    } catch {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

router.post('/verify-reset-code', async (req, res) => {
    const { rows } = await query(
        'SELECT id, password, reset_code, reset_code_expires FROM users WHERE email = $1',
        [req.body.email]
    );
    const user = rows[0];

    if (!user || user.reset_code !== req.body.code || !user.reset_code_expires || new Date(user.reset_code_expires) < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
    await query(
        'UPDATE users SET password = $1, reset_code = NULL, reset_code_expires = NULL WHERE id = $2',
        [hashedPassword, user.id]
    );

    res.json({ message: 'Password updated successfully' });
});

export default router;
