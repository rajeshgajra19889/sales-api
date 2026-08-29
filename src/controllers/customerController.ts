import { Request, Response } from 'express';
import { listCustomers, getCustomerDetail, type CustomerSort } from '../services/customerService.js';

function parsePage(query: Record<string, unknown>, res: Response): {
    page: number; pageSize: number; search?: string;
    sortBy: CustomerSort; sortOrder: 'asc' | 'desc';
} | null {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'page and pageSize must be integers (page >= 1, pageSize 1-100)' });
        return null;
    }
    const SORTS = ['customer_id', 'first_name', 'last_name', 'email'] as const;
    const sortBy: CustomerSort =
        typeof query.sortBy === 'string' && (SORTS as readonly string[]).includes(query.sortBy)
            ? query.sortBy as CustomerSort
            : 'customer_id';
    const sortOrder: 'asc' | 'desc' = query.sortOrder === 'desc' ? 'desc' : 'asc';
    return {
        page,
        pageSize,
        search: typeof query.search === 'string' ? query.search : undefined,
        sortBy,
        sortOrder
    };
}

export async function getCustomers(req: Request, res: Response) {
    const parsed = parsePage(req.query, res);
    if (!parsed) return;
    res.json(await listCustomers(parsed));
}

export async function getCustomer(req: Request, res: Response) {
    const id = Number(req.params.id);
    const detail = await getCustomerDetail(id);
    if (!detail) {
        res.status(404).json({ error: 'Customer not found' });
        return;
    }
    res.json(detail);
}