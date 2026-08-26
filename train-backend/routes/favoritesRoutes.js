import { Router } from 'express';
import auth from '../middleware.js';
import { query } from '../db.js';

const router = Router();

router.post('/fav-add', auth, async (req, res) => {
    const { hash, legs, total_duration } = req.body;
    try {
        await query(
            `INSERT INTO favorites (user_id, hash, legs, total_duration)
             VALUES ($1, $2, $3, $4)`,
            [req.user.id, hash, JSON.stringify(legs), total_duration]
        );
        res.json({ message: 'Added to favorites' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'Already in favorites' });
        console.error('[Fav-add]', err.message);
        res.status(500).json({ error: 'Failed to add favorite' });
    }
});

router.delete('/fav-delete/:hash', auth, async (req, res) => {
    await query(
        'DELETE FROM favorites WHERE user_id = $1 AND hash = $2',
        [req.user.id, req.params.hash]
    );
    res.json({ message: 'Deleted from favorites' });
});

router.get('/favorites', auth, async (req, res) => {
    const { rows } = await query(
        'SELECT hash, legs, total_duration FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
    );
    res.json(rows);
});

export default router;
