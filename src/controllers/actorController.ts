import { Request, Response } from 'express';
import {
    createActor,
    deleteActor,
    getActorById,
    listActors,
    updateActor
} from '../services/actorService.js';

const MAX_PAGE_SIZE = 50;

export async function getActors(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize) || 10));
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sortBy = req.query.sortBy as 'actor_id' | 'first_name' | 'last_name' | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
    res.json(await listActors({ page, pageSize, search, sortBy, sortOrder }));
}

export async function getActorHandler(req: Request, res: Response) {
    const a = await getActorById(Number(req.params.id));
    if (!a) {
        res.status(404).json({ error: 'Actor not found' });
        return;
    }
    res.json(a);
}

function parseActorInput(body: unknown): { first_name: string; last_name: string } | null {
    const b = body as Record<string, unknown> | null;
    if (!b || typeof b.first_name !== 'string' || !b.first_name.trim()
        || typeof b.last_name !== 'string' || !b.last_name.trim()) {
        return null;
    }
    return { first_name: b.first_name.trim(), last_name: b.last_name.trim() };
}

export async function createActorHandler(req: Request, res: Response) {
    const input = parseActorInput(req.body);
    if (!input) {
        res.status(400).json({ error: 'first_name and last_name are required' });
        return;
    }
    res.status(201).json(await createActor(input));
}

export async function updateActorHandler(req: Request, res: Response) {
    const input = parseActorInput(req.body);
    if (!input) {
        res.status(400).json({ error: 'first_name and last_name are required' });
        return;
    }
    const updated = await updateActor(Number(req.params.id), input);
    if (!updated) {
        res.status(404).json({ error: 'Actor not found' });
        return;
    }
    res.json(updated);
}

function pgErrorCode(err: unknown): string | undefined {
    const e = err as { code?: string; cause?: { code?: string } };
    return e.code ?? e.cause?.code;
}

export async function deleteActorHandler(req: Request, res: Response) {
    try {
        const gone = await deleteActor(Number(req.params.id));
        if (!gone) {
            res.status(404).json({ error: 'Actor not found' });
            return;
        }
        res.status(204).end();
    } catch (err) {
        const code = pgErrorCode(err);
        if (code === '23503' || code === '23001') {
            res.status(409).json({ error: 'Actor has films attached; remove them first.' });
            return;
        }
        throw err;
    }
}