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

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'omkar@gmail.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Qwert@123';
const JWT_SECRET = process.env.JWT_SECRET || 'rapidrails_super_secret_jwt_key_change_in_production';

async function seedTestUser() {
    try {
        if (!TEST_EMAIL || !TEST_PASSWORD) return;
        const normalizedEmail = TEST_EMAIL.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });
        if (!existing) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);
            const testUser = new User({ email: normalizedEmail, password: hashedPassword });
            await testUser.save();
            console.log(`[Seed] Created test user: ${normalizedEmail}`);
        } else {
            console.log(`[Seed] Test user already exists: ${normalizedEmail}`);
        }
    } catch (err) {
        console.error('[Seed] Error seeding test user:', err.message);
    }
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rapidrails';
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('[MongoDB] Connected successfully');
        seedTestUser();
    })
    .catch((err) => console.error('[MongoDB] Connection error:', err.message));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        engineReady,
        mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const normalizedEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ email: normalizedEmail, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('[Register Error]:', err.message);
        res.status(400).json({ error: 'Registration failed: ' + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, email: user.email });
    } catch (err) {
        console.error('[Login Error]:', err.message);
        res.status(500).json({ error: 'Login failed: ' + err.message });
    }
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
    console.log(`Gateway running on port ${PORT}`)
);