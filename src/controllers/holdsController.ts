import { Request, Response } from 'express';
import { listHolds, createHold, releaseHold, type HoldQuery, type HoldSort } from '../services/holdsService.js';

const SORTS = ['hold_id', 'title', 'customer', 'expires_at'] as const;

function parseQuery(query: Record<string, unknown>, res: Response): HoldQuery | null {
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
        sortBy: (typeof query.sortBy === 'string' && (SORTS as readonly string[]).includes(query.sortBy) ? query.sortBy : 'expires_at') as HoldSort,
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    };
}

export async function getHolds(req: Request, res: Response) {
    const parsed = parseQuery(req.query, res);
    if (!parsed) return;
    res.json(await listHolds(parsed));
}

const HOLD_BODY = (b: Record<string, unknown>): b is { inventory_id: number; customer_id: number; expires_at: string } => {
    const { inventory_id, customer_id, expires_at } = b;
    return typeof inventory_id === 'number' && Number.isInteger(inventory_id)
        && typeof customer_id === 'number' && Number.isInteger(customer_id)
        && typeof expires_at === 'string' && !Number.isNaN(new Date(expires_at).getTime());
};

export async function createHoldHandler(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!HOLD_BODY(body)) {
        res.status(400).json({ error: 'Body must be { inventory_id, customer_id, expires_at } with integer ids and ISO expires_at' });
        return;
    }
    const result = await createHold({
        inventory_id: body.inventory_id,
        customer_id: body.customer_id,
        expires_at: new Date(body.expires_at)
    });
    if (result === 'past-expiry') {
        res.status(400).json({ error: 'expires_at must be in the future' });
        return;
    }
    if (result === 'copy-not-found' || result === 'customer-not-found') {
        res.status(404).json({ error: 'Copy or customer not found' });
        return;
    }
    if (result === 'rented' || result === 'already-held') {
        res.status(409).json({ error: result === 'rented' ? 'Copy is currently rented out' : 'Copy already has an active hold' });
        return;
    }
    res.status(201).json(result);
}

export async function deleteHoldHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'hold id must be a positive integer' });
        return;
    }
    const result = await releaseHold(id);
    if (!result) {
        res.status(404).json({ error: 'Hold not found' });
        return;
    }
    res.json(result);
}