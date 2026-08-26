import { Router } from 'express';
import auth from '../middleware.js';
import { randomUUID } from 'crypto';
import { getJob, setJob } from '../lib/cache.js';
import { enqueue, getQueueDepth } from '../lib/queue.js';

const router = Router();

router.post('/search', auth, async (req, res) => {
    const { source, destination, day, min_buffer, max_buffer, max_legs } = req.body;
    if (!source || !destination) {
        return res.status(400).json({ error: 'source and destination are required' });
    }

    const jobId = randomUUID();
    const payload = {
        source,
        destination,
        day:        typeof day === 'number' ? day : Number(day),
        min_buffer: min_buffer ?? 30,
        max_buffer: max_buffer ?? 480,
        max_legs:   max_legs   ?? 8,
    };

    const ttl = Number(process.env.JOB_TTL_SECONDS || 600);
    await setJob(jobId, { status: 'queued', payload, createdAt: Date.now() }, ttl);

    const queued = await enqueue({ jobId, ...payload });
    if (!queued) {
        await setJob(jobId, { status: 'rejected', reason: 'queue_full', createdAt: Date.now() }, ttl);
        return res.status(503).json({ error: 'High demand. Please retry shortly.' });
    }

    res.status(202).json({ jobId, status: 'queued' });
});

router.get('/status/:jobId', auth, async (req, res) => {
    const job = await getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found or expired' });
    res.json(job);
});

router.get('/queue-depth', auth, async (_req, res) => {
    const depth = await getQueueDepth();
    res.json({ depth });
});

export default router;
