import { Router } from 'express';
import auth from '../middleware.js';
import { getCache, setCache } from '../lib/cache.js';

const router = Router();

router.post('/search', auth, async (req, res) => {
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
        const cacheKey = `route:${payload.source}:${payload.destination}:${payload.day}:${payload.min_buffer}:${payload.max_buffer}:${payload.max_legs}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            console.log('[SyncSearch] cache HIT', cacheKey);
            return res.json(cached);
        }
        console.log('[SyncSearch] cache MISS', cacheKey);

        const results = await req.engine.query(payload);
        await setCache(cacheKey, results);
        res.json(results);
    } catch (err) {
        console.error('[SyncSearch] Engine error:', err.message);
        res.status(500).json({ error: 'Calculation failure: ' + err.message });
    }
});

export default router;
