import { Request, Response } from 'express';
import { listRentals, getRentalDetail, type RentalSort, type RentalQuery } from '../services/rentalService.js';

const SORTS = ['rental_id', 'rental_date', 'film', 'customer', 'returned'] as const;

function parseQuery(query: Record<string, unknown>, res: Response): RentalQuery | null {
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
        sortBy: (typeof query.sortBy === 'string' && (SORTS as readonly string[]).includes(query.sortBy) ? query.sortBy : 'rental_id') as RentalSort,
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    };
}

export async function getRentals(req: Request, res: Response) {
    const parsed = parseQuery(req.query, res);
    if (!parsed) return;
    res.json(await listRentals(parsed));
}

export async function getRental(req: Request, res: Response) {
    const id = Number(req.params.id);
    const detail = await getRentalDetail(id);
    if (!detail) {
        res.status(404).json({ error: 'Rental not found' });
        return;
    }
    res.json(detail);
}