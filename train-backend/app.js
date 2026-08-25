import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { connectCache } from './lib/cache.js';
import authRoutes from './routes/authRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import asyncRoutes from './routes/asyncRoutes.js';
import favoritesRoutes from './routes/favoritesRoutes.js';
import EngineClient from './lib/engine.js';

export default async function createApp({ mode = 'all' } = {}) {
    await initDb();
    await connectCache().catch((err) => console.error('[Redis] connect failed:', err.message));

    const app = express();
    app.use(express.json());
    app.use(cors());

    let engine = null;
    if (mode === 'sync' || mode === 'all') {
        engine = new EngineClient();
        await engine.start();
        app.use((req, _res, next) => {
            req.engine = engine;
            next();
        });
    }

    app.use('/api', authRoutes);
    app.use('/api', favoritesRoutes);

    if (mode === 'sync' || mode === 'all') {
        app.use('/api/sync', syncRoutes);
    }
    if (mode === 'async' || mode === 'all') {
        app.use('/api/async', asyncRoutes);
    }

    app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    return app;
}
