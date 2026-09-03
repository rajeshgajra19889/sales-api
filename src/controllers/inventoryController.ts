import { Request, Response } from 'express';
import {
    listInventory,
    getInventoryDetail,
    createStock,
    moveCopy,
    getStockSummary,
    listRenters,
    listFilmInventory,
    deleteCopy,
    type InventoryQuery,
    type InventorySort
} from '../services/inventoryService.js';

const SORTS = ['inventory_id', 'title', 'store_id'] as const;

function parseStoreId(raw: unknown, res: Response): number | undefined {
    if (raw === undefined) return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {
        res.status(400).json({ error: 'store_id must be a positive integer' });
        return undefined;
    }
    return n;
}

function parseQuery(query: Record<string, unknown>, res: Response): InventoryQuery | null {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'page and pageSize must be integers (page >= 1, pageSize 1-100)' });
        return null;
    }
    const storeId = parseStoreId(query.store_id, res);
    if (storeId === undefined && query.store_id !== undefined) return null;
    return {
        page,
        pageSize,
        search: typeof query.search === 'string' ? query.search : undefined,
        storeId,
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
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'inventory id must be an integer' });
        return;
    }
    const detail = await getInventoryDetail(id);
    if (!detail) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
    }
    res.json(detail);
}

const STOCK_BODY = (body: Record<string, unknown>): body is { film_id: number; store_id: number; qty: number } => {
    const { film_id, store_id, qty } = body;
    return typeof film_id === 'number' && Number.isInteger(film_id)
        && typeof store_id === 'number' && Number.isInteger(store_id)
        && typeof qty === 'number' && Number.isInteger(qty)
        && qty >= 1 && qty <= 100;
};

export async function createInventory(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!STOCK_BODY(body)) {
        res.status(400).json({ error: 'Body must be { film_id, store_id, qty } with qty 1-100' });
        return;
    }
    const result = await createStock({ film_id: body.film_id, store_id: body.store_id, qty: body.qty });
    if (result === 'film-not-found') {
        res.status(404).json({ error: 'Film not found' });
        return;
    }
    if (result === 'store-not-found') {
        res.status(404).json({ error: 'Store not found' });
        return;
    }
    if (result === 'store-inactive') {
        res.status(409).json({ error: 'Store is inactive; activate it before adding stock' });
        return;
    }
    res.status(201).json(result);
}

export async function moveInventoryCopy(req: Request, res: Response) {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(id) || !Number.isInteger(body.store_id)) {
        res.status(400).json({ error: 'Path id and body { store_id } must be integers' });
        return;
    }
    const result = await moveCopy(id, body.store_id as number);
    if (result === 'not-found' || result === 'store-not-found') {
        res.status(404).json({ error: 'Inventory item or target store not found' });
        return;
    }
    if (result === 'same-store') {
        res.status(400).json({ error: 'Copy is already at that store' });
        return;
    }
    if (result === 'store-inactive') {
        res.status(409).json({ error: 'Target store is inactive; activate it before moving copies' });
        return;
    }
    if (result === 'rented') {
        res.status(409).json({ error: 'Copy is currently rented out; cannot move it' });
        return;
    }
    if (result === 'held') {
        res.status(409).json({ error: 'Copy has an active hold; release it before moving' });
        return;
    }
    res.json(result);
}

export async function inventoryRenters(req: Request, res: Response) {
    const film_id = Number(req.query.film_id);
    const store_id = Number(req.query.store_id);
    if (!Number.isInteger(film_id) || film_id < 1 || !Number.isInteger(store_id) || store_id < 1) {
        res.status(400).json({ error: 'film_id and store_id query params must be positive integers' });
        return;
    }
    res.json(await listRenters(film_id, store_id));
}

export async function stockSummary(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'page and pageSize must be integers (page >= 1, pageSize 1-100)' });
        return;
    }
    const storeId = parseStoreId(req.query.store_id, res);
    if (storeId === undefined && req.query.store_id !== undefined) return;
    res.json(await getStockSummary({
        page,
        pageSize,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        storeId
    }));
}

export async function getFilmInventory(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'film id must be a positive integer' });
        return;
    }
    res.json(await listFilmInventory(id));
}

export async function deleteInventoryCopy(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'inventory id must be a positive integer' });
        return;
    }
    const result = await deleteCopy(id);
    if (!result.ok) {
        if (result.reason === 'not-found') { res.status(404).json({ error: 'Inventory item not found' }); return; }
        if (result.reason === 'rented') { res.status(409).json({ error: 'Copy is currently rented out; cannot delete' }); return; }
    }
    res.json({ success: true, message: 'Copy removed from inventory' });
}

export async function addFilmInventory(req: Request, res: Response) {
    const filmId = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(filmId) || filmId < 1) {
        res.status(400).json({ error: 'film id must be a positive integer' });
        return;
    }
    const storeId = Number(body.store_id);
    const qty = Number(body.qty);
    if (!Number.isInteger(storeId) || !Number.isInteger(qty) || qty < 1 || qty > 100) {
        res.status(400).json({ error: 'Body must be { store_id, qty } with qty 1-100' });
        return;
    }
    const result = await createStock({ film_id: filmId, store_id: storeId, qty });
    if (result === 'film-not-found') { res.status(404).json({ error: 'Film not found' }); return; }
    if (result === 'store-not-found') { res.status(404).json({ error: 'Store not found' }); return; }
    if (result === 'store-inactive') { res.status(409).json({ error: 'Store is inactive' }); return; }
    res.status(201).json(result);
}