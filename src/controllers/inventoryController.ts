import { Request, Response } from 'express';
import { listInventory, getInventoryDetail, type InventoryQuery, type InventorySort } from '../services/inventoryService.js';

const SORTS = ['inventory_id', 'title', 'store_id'] as const;

function parseQuery(query: Record<string, unknown>, res: Response): InventoryQuery | null {
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
        sortBy: (typeof query.sortBy === 'string' && (SORTS as readonly string[]).includes(query.sortBy) ? query.sortBy : 'inventory_id') as InventorySort,
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    };
}

export async function getInventory(req: Request, res: Response) {
    const parsed = parseQuery(req.query, res);
    if (!parsed) return;
    res.json(await listInventory(parsed));
}

export async function getInventoryItem(req: Request, res: Response) {
    const id = Number(req.params.id);
    const detail = await getInventoryDetail(id);
    if (!detail) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
    }
    res.json(detail);
}