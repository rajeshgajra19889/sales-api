import { Request, Response } from 'express';
import {
    listFilmsPaginated,
    getFilmById,
    createFilm,
    updateFilm,
    deleteFilm,
    FilmInput,
    SortColumn,
    getActorsForFilm,
    replaceFilmActors
} from '../services/filmService.js';

const MAX_PAGE_SIZE = 50;

function toNumberOrNull(v: unknown): number | null {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}

function parsePageQuery(req: Request) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize) || 10));
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const sortBy = typeof req.query.sortBy === 'string' ? (req.query.sortBy as SortColumn) : 'film_id';
    const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    return { page, pageSize, search, sortBy, sortOrder };
}

function parseFilmInput(body: unknown): FilmInput | null {
    const b = body as Record<string, unknown> | null;
    if (!b || typeof b.title !== 'string' || !b.title.trim()) return null;
    return {
        title: b.title.trim(),
        release_year: toNumberOrNull(b.release_year),
        rental_rate: toNumberOrNull(b.rental_rate)
    };
}

export async function getFilms(req: Request, res: Response) {
    const { page, pageSize, search, sortBy, sortOrder } = parsePageQuery(req);
    const result = await listFilmsPaginated(page, pageSize, search, sortBy, sortOrder);
    res.json(result);
}

export async function getFilmsById(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid film id' });
        return;
    }
    const film = await getFilmById(id);
    if (!film) {
        res.status(404).json({ message: 'Film not found' });
        return;
    }
    res.json(film);
}

export async function createFilms(req: Request, res: Response) {
    const input = parseFilmInput(req.body);
    if (!input) {
        res.status(400).json({ message: 'title is required' });
        return;
    }
    const film = await createFilm(input);
    res.status(201).json(film);
}

export async function updateFilmsById(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid film id' });
        return;
    }
    const input = parseFilmInput(req.body);
    if (!input) {
        res.status(400).json({ message: 'title is required' });
        return;
    }
    const film = await updateFilm(id, input);
    if (!film) {
        res.status(404).json({ message: 'Film not found' });
        return;
    }
    res.json(film);
}

export async function deleteFilmsById(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid film id' });
        return;
    }
    const deleted = await deleteFilm(id);
    if (!deleted) {
        res.status(404).json({ message: 'Film not found' });
        return;
    }
    res.status(204).end();
}

export async function getFilmActors(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid film id' });
        return;
    }
    const actors = await getActorsForFilm(id);
    if (!actors) {
        res.status(404).json({ message: 'Film not found' });
        return;
    }
    res.json(actors);
}

export async function replaceFilmActorsHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    const actor_ids = (req.body as Record<string, unknown> | null)?.actor_ids;
    if (!Array.isArray(actor_ids) || actor_ids.some(x => !Number.isInteger(x))) {
        res.status(400).json({ error: 'actor_ids must be an array of integers' });
        return;
    }

    const cast = await replaceFilmActors(id, [...new Set(actor_ids as number[])]);
    if (!cast) {
        res.status(404).json({ error: 'Film not found' });
        return;
    }
    res.json(cast);
}