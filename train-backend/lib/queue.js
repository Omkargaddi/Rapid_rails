import dotenv from 'dotenv';
dotenv.config();

import { redis } from './cache.js';

const QUEUE_NAME = process.env.QUEUE_NAME || 'route_jobs';
const QUEUE_MAX_DEPTH = Number(process.env.QUEUE_MAX_DEPTH || 1000);

export async function connectQueue() {
    if (redis.status === 'wait' || redis.status === 'end') {
        await redis.connect();
    }
}

export async function getQueueDepth() {
    try {
        return await redis.llen(QUEUE_NAME);
    } catch (err) {
        console.error('[Queue] getQueueDepth error:', err.message);
        return 0;
    }
}

export async function enqueue(job) {
    try {
        const depth = await getQueueDepth();
        if (depth >= QUEUE_MAX_DEPTH) return false;
        await redis.rpush(QUEUE_NAME, JSON.stringify(job));
        return true;
    } catch (err) {
        console.error('[Queue] enqueue error:', err.message);
        return false;
    }
}

export default { connectQueue, getQueueDepth, enqueue };
