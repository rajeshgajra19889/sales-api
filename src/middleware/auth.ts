import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AuthStaff } from '../auth/jwt.js';

declare global {
    namespace Express {
        interface Request { auth?: AuthStaff }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
        res.status(401).json({ error: 'Missing token' });
        return;
    }
    try {
        req.auth = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}