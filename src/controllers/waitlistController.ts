import { Request, Response } from 'express';
import { listWaitlist, addToWaitlist, removeFromWaitlist, promoteWaitlist, type WaitlistQuery, type WaitlistSort } from '../services/waitlistService.js';

const SORTS = ['waitlist_id', 'title', 'customer', 'created_at'] as const;

function parseQuery(query: Record<string, unknown>, res: Response): WaitlistQuery | null {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'page and pageSize must be integers (page >= 1, pageSize 1-100)' });
        return null;
    }
    return {
        page,
        pageSize,
        search: typeof query.search === 'string' ? query.search : undefined,
        sortBy: (typeof query.sortBy === 'string' && (SORTS as readonly string[]).includes(query.sortBy) ? query.sortBy : 'created_at') as WaitlistSort,
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    };
}

export async function getWaitlist(req: Request, res: Response) {
    const parsed = parseQuery(req.query, res);
    if (!parsed) return;
    res.json(await listWaitlist(parsed));
}

const WAITLIST_BODY = (b: Record<string, unknown>): b is { film_id: number; customer_id: number; store_id?: number | null } => {
    const { film_id, customer_id, store_id } = b;
    if (typeof film_id !== 'number' || !Number.isInteger(film_id)) return false;
    if (typeof customer_id !== 'number' || !Number.isInteger(customer_id)) return false;
    if (store_id === undefined || store_id === null) return true;
    return typeof store_id === 'number' && Number.isInteger(store_id);
};

const PROMOTE_BODY = (b: Record<string, unknown>): b is { inventory_id: number; days?: number } => {
    const { inventory_id, days } = b;
    if (typeof inventory_id !== 'number' || !Number.isInteger(inventory_id)) return false;
    if (days === undefined) return true;
    return typeof days === 'number' && Number.isInteger(days);
};

export async function createWaitlistHandler(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!WAITLIST_BODY(body)) {
        res.status(400).json({ error: 'Body must be { film_id, customer_id, store_id? } with integer ids' });
        return;
    }
    const result = await addToWaitlist({
        film_id: body.film_id,
        customer_id: body.customer_id,
        store_id: body.store_id ?? null
    });
    if (result === 'film-not-found' || result === 'customer-not-found') {
        res.status(404).json({ error: 'Film or customer not found' });
        return;
    }
    if (result === 'duplicate') {
        res.status(409).json({ error: 'Customer is already on the waitlist for this film/store' });
        return;
    }
    res.status(201).json(result);
}

export async function deleteWaitlistHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'waitlist id must be a positive integer' });
        return;
    }
    const result = await removeFromWaitlist(id);
    if (!result) {
        res.status(404).json({ error: 'Waitlist entry not found' });
        return;
    }
    res.json(result);
}

export async function promoteHandler(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!PROMOTE_BODY(body)) {
        res.status(400).json({ error: 'Body must be { inventory_id, days? } with days 1-30' });
        return;
    }
    const holdDays = body.days ?? 2;
    if (holdDays < 1 || holdDays > 30) {
        res.status(400).json({ error: 'days must be 1-30' });
        return;
    }
    const result = await promoteWaitlist({ inventory_id: body.inventory_id, days: holdDays });
    if (result === 'copy-not-found') {
        res.status(404).json({ error: 'Inventory copy not found' });
        return;
    }
    if (result === 'rented' || result === 'already-held') {
        res.status(409).json({ error: result === 'rented' ? 'Copy is currently rented out' : 'Copy already has an active hold' });
        return;
    }
    if (result === 'no-waiters') {
        res.status(404).json({ error: 'No waiters for this film at this store' });
        return;
    }
    res.status(201).json(result);
}