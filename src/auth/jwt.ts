import 'dotenv/config';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export interface AuthStaff { staff_id: number; username: string; }

export function signToken(staff: AuthStaff): string {
    return jwt.sign(staff, SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): AuthStaff {
    const decoded = jwt.verify(token, SECRET) as { staff_id: number; username: string; exp: number };
    return { staff_id: decoded.staff_id, username: decoded.username };
}