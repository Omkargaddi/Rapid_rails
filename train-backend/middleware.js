import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rapidrails_super_secret_jwt_key_change_in_production';

export default (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access Denied. No token provided.' });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid Token' });
    }
};
