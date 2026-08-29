import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { staff } from '../db/schema.js';
import { verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        res.status(400).json({ error: 'username and password are required' });
        return;
    }
    const row = await db.select().from(staff).where(eq(staff.username, username)).limit(1);
    const found = row[0];
    if (!found || !found.password || !(await verifyPassword(password, found.password))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const token = signToken({ staff_id: found.staff_id, username: found.username });
    res.json({
        token,
        staff: {
            staff_id: found.staff_id,
            username: found.username,
            first_name: found.first_name,
            last_name: found.last_name,
            email: found.email
        }
    });
});

router.get('/me', requireAuth, async (req, res) => {
    const row = await db.select().from(staff).where(eq(staff.staff_id, req.auth!.staff_id)).limit(1);
    const found = row[0];
    if (!found) {
        res.status(404).json({ error: 'Staff not found' });
        return;
    }
    res.json({
        staff_id: found.staff_id,
        username: found.username,
        first_name: found.first_name,
        last_name: found.last_name,
        email: found.email
    });
});

export default router;