import { Request, Response } from 'express';
import { createStore, deleteStore, getStore, getStoreComparison, getStoreStats, listStores, updateStore } from '../services/storeService.js';

interface NewManagerBody {
    first_name: string;
    last_name: string;
    email?: string | null;
}

function isNewManager(x: unknown): x is NewManagerBody {
    if (typeof x !== 'object' || x === null) return false;
    const o = x as Record<string, unknown>;
    if (typeof o.first_name !== 'string' || o.first_name.trim() === '') return false;
    if (typeof o.last_name !== 'string' || o.last_name.trim() === '') return false;
    if (o.email !== undefined && o.email !== null && typeof o.email !== 'string') return false;
    return true;
}

interface StoreCreateBody {
    manager_staff_id?: number;
    new_manager_staff?: NewManagerBody;
    address_id: number;
}

function isCreateBody(x: unknown): x is StoreCreateBody {
    if (typeof x !== 'object' || x === null) return false;
    const o = x as Record<string, unknown>;
    if (typeof o.address_id !== 'number' || !Number.isInteger(o.address_id)) return false;
    if ('manager_staff_id' in o) {
        if (typeof o.manager_staff_id !== 'number' || !Number.isInteger(o.manager_staff_id)) return false;
        if ('new_manager_staff' in o) return false;
    } else if ('new_manager_staff' in o) {
        if (!isNewManager(o.new_manager_staff)) return false;
    } else {
        return false;
    }
    return true;
}

interface StoreUpdateBody {
    manager_staff_id?: number;
    address_id?: number;
    active?: boolean;
}

function isUpdateBody(x: unknown): x is StoreUpdateBody {
    if (typeof x !== 'object' || x === null) return false;
    const o = x as Record<string, unknown>;
    if (!('manager_staff_id' in o) && !('address_id' in o) && !('active' in o)) return false;
    if ('manager_staff_id' in o && typeof o.manager_staff_id !== 'number') return false;
    if ('address_id' in o && typeof o.address_id !== 'number') return false;
    if ('active' in o && typeof o.active !== 'boolean') return false;
    return true;
}

function parseId(req: Request): number | null {
    const n = Number(req.params.id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function settle(res: Response, status: number, message: string) {
    res.status(status).json({ error: message });
}

export async function getStores(req: Request, res: Response) {
    res.json(await listStores());
}

export async function getStoreById(req: Request, res: Response) {
    const id = parseId(req);
    if (id === null) { settle(res, 400, 'Invalid store id'); return; }
    const store = await getStore(id);
    if (!store) { settle(res, 404, 'Store not found'); return; }
    res.json(store);
}

export async function createStoreController(req: Request, res: Response) {
    if (!isCreateBody(req.body)) {
        settle(res, 400, 'address_id (number) plus manager_staff_id or new_manager_staff are required');
        return;
    }
    const result = await createStore({
        address_id: req.body.address_id,
        ...(req.body.manager_staff_id !== undefined ? { manager_staff_id: req.body.manager_staff_id } : {}),
        ...(req.body.new_manager_staff !== undefined ? { new_manager_staff: req.body.new_manager_staff } : {})
    });
    if (result === 'staff-not-found') { settle(res, 404, 'Manager (staff) not found'); return; }
    if (result === 'address-not-found') { settle(res, 404, 'Address not found'); return; }
    if (result === 'manager-assigned') { settle(res, 409, 'Manager already assigned to another store'); return; }
    if (result === 'manager-missing') { settle(res, 400, 'Manager (staff) not found'); return; }
    res.status(201).json(result);
}

export async function updateStoreController(req: Request, res: Response) {
    const id = parseId(req);
    if (id === null) { settle(res, 400, 'Invalid store id'); return; }
    if (!isUpdateBody(req.body)) { settle(res, 400, 'Provide manager_staff_id, address_id and/or active'); return; }
    const result = await updateStore(id, req.body);
    if (result === undefined) { settle(res, 404, 'Store not found'); return; }
    if (result === 'staff-not-found') { settle(res, 404, 'Manager (staff) not found'); return; }
    if (result === 'address-not-found') { settle(res, 404, 'Address not found'); return; }
    if (result === 'manager-assigned') { settle(res, 409, 'Manager already assigned to another store'); return; }
    res.json(result);
}

export async function deleteStoreController(req: Request, res: Response) {
    const id = parseId(req);
    if (id === null) { settle(res, 400, 'Invalid store id'); return; }
    const result = await deleteStore(id);
    if (result === undefined) { settle(res, 404, 'Store not found'); return; }
    if (result === 'in-use') { settle(res, 409, 'Store still has inventory, staff or waitlist entries'); return; }
    res.status(204).end();
}

export async function getStoreStatsController(req: Request, res: Response) {
    const id = parseId(req);
    if (id === null) { settle(res, 400, 'Invalid store id'); return; }
    const store = await getStore(id);
    if (!store) { settle(res, 404, 'Store not found'); return; }
    res.json(await getStoreStats(id));
}

export async function getStoreComparisonController(req: Request, res: Response) {
    res.json(await getStoreComparison());
}