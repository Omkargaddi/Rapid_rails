import dotenv from 'dotenv';
dotenv.config();

import { Redis } from 'ioredis';

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 86400);

export const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
});

redis.on('error', (err) => {
    console.error('[Redis] error:', err.message);
});

export async function connectCache() {
    if (redis.status === 'wait' || redis.status === 'end') {
        await redis.connect();
    }
    console.log('[Redis] connected');
}

export async function getCache(key) {
    try {
        const val = await redis.get(key);
        return val ? JSON.parse(val) : null;
    } catch (err) {
        console.error('[Redis] getCache error:', err.message);
        return null;
    }
}

export async function setCache(key, value) {
    try {
        await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
        console.error('[Redis] setCache error:', err.message);
    }
}

export async function getJob(jobId) {
    try {
        const val = await redis.get(`job:${jobId}`);
        return val ? JSON.parse(val) : null;
    } catch (err) {
        console.error('[Redis] getJob error:', err.message);
        return null;
    }
}

export async function setJob(jobId, value, ttlSeconds) {
    try {
        await redis.set(`job:${jobId}`, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
        console.error('[Redis] setJob error:', err.message);
    }
}

export async function delJob(jobId) {
    try {
        await redis.del(`job:${jobId}`);
    } catch (err) {
        console.error('[Redis] delJob error:', err.message);
    }
}
