import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { randomUUID } from 'crypto';

import User from './userModel.js';
import auth from './middleware.js';

const ENGINE_PATH  = path.join(process.cwd(), 'train_engine');
const DATA_PATH    = path.join(process.cwd(), 'train_data');

const pending = new Map();

let engineReady = false;

const engine = spawn(ENGINE_PATH, [DATA_PATH], {
    stdio: ['pipe', 'pipe', 'inherit'],});

engine.on('error', (err) => {
    console.error('[Engine] Failed to start binary:', err.message);
    console.error('[Engine] Make sure you ran `make` before starting the server.');
    process.exit(1);
});

engine.on('exit', (code) => {
    console.error(`[Engine] Process exited with code ${code}. Restarting server.`);
    process.exit(1);
});

const rl = createInterface({ input: engine.stdout });

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const msg = JSON.parse(line);
        if (!engineReady) {
            if (msg.status === 'ready') {
                engineReady = true;
                console.log(`[Engine] Ready — ${msg.trains} trains loaded.`);
            }
            return;
        }
        const { req_id, results, error } = msg;
        const handler = pending.get(req_id);
        if (!handler) return;

        pending.delete(req_id);
        if (error) handler.reject(new Error(error));
        else       handler.resolve(results);

    } catch (e) {
        console.error('[Engine] Bad JSON from binary:', e.message);
    }
});

function queryEngine(payload) {
    return new Promise((resolve, reject) => {
        if (!engineReady) return reject(new Error('Engine not ready yet'));

        const req_id = randomUUID();
        pending.set(req_id, { resolve, reject });
        const timer = setTimeout(() => {
            if (pending.has(req_id)) {
                pending.delete(req_id);
                reject(new Error('Engine request timed out'));
            }
        }, 30_000);
        pending.get(req_id).timer = timer;
        const original_resolve = resolve;
        const original_reject  = reject;

        pending.set(req_id, {
            resolve: (val) => { clearTimeout(timer); original_resolve(val); },
            reject:  (err) => { clearTimeout(timer); original_reject(err);  },
        });

        engine.stdin.write(JSON.stringify({ ...payload, req_id }) + '\n');
    });
}

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
    } catch {
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
    const { source, destination, day, min_buffer, max_buffer, max_legs, preference } = req.body;

    const payload = {
        source,
        destination,
        day:        typeof day === 'number' ? day : Number(day),
        min_buffer: min_buffer ?? 30,
        max_buffer: max_buffer ?? 480,
        max_legs:   max_legs   ?? 8,
        preference: preference ?? 'convenient',
    };

    try {
        const results = await queryEngine(payload);
        res.json(results);
    } catch (err) {
        console.error('[Search] Engine error:', err.message);
        res.status(500).json({ error: 'Calculation failure: ' + err.message });
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