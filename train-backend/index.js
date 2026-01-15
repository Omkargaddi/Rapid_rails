import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import axios from 'axios';
import nodemailer from 'nodemailer';

import User from './userModel.js';
import auth from './middleware.js';

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, 
    },
});

app.post('/api/register', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const user = new User({ email: req.body.email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch {
        res.status(400).json({ error: 'Email already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, email: user.email });
});


app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Password Reset Code',
            html: `<h2>Your reset code</h2><p><b>${resetCode}</b></p>`
        });
        res.json({ message: 'Reset code sent to email' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.post('/api/verify-reset-code', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+resetCode +resetCodeExpires');

    if (!user || user.resetCode !== code || user.resetCodeExpires < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: 'Password updated successfully' });
});

app.post('/api/search', auth, async (req, res) => {
    // console.log("\n=== /api/search HIT ===");
    // console.log("Incoming body:", req.body);
    // console.log("ENGINE_URL:", process.env.ENGINE_URL);

    const {
        source,
        destination,
        day,
        min_buffer,
        max_buffer,
        max_legs,
        preference
    } = req.body;

    const payload = {
        source,
        destination,
        day: typeof day === "number" ? day : Number(day),
        min_buffer: min_buffer ?? 30,
        max_buffer: max_buffer ?? 480,
        max_legs: max_legs ?? 8,
        preference: preference ?? "convenient"
    };


    try {
        const response = await axios.post(
            `${process.env.ENGINE_URL}/find-route`,
            payload,
            { timeout: 30000 }
        );
        res.json(response.data);
    } catch (err) {
        console.error("=== ENGINE CALL FAILED ===");

        if (err.response) {
            console.error("ENGINE STATUS:", err.response.status);
            console.error("ENGINE BODY:", err.response.data);
        } else if (err.request) {
            console.error("NO RESPONSE FROM ENGINE");
        } else {
            console.error("AXIOS ERROR:", err.message);
        }

        res.status(500).json({ error: "C++ Engine communication failure" });
    }
});

app.post('/api/fav-add', auth, async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user.favorites.some(f => f.hash === req.body.hash)) {
        return res.status(400).json({ message: 'Already in favorites' });
    }
    user.favorites.push(req.body);
    await user.save();
    res.json({ message: 'Added to favorites' });
});

app.delete('/api/fav-delete/:hash', auth, async (req, res) => {
    const user = await User.findById(req.user._id);
    user.favorites = user.favorites.filter(f => f.hash !== req.params.hash);
    await user.save();
    res.json({ message: 'Deleted from favorites' });
});

app.get('/api/favorites', auth, async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json(user.favorites);
});

app.listen(process.env.PORT, () =>
    console.log(`Gateway running on port ${process.env.PORT}`)
);
