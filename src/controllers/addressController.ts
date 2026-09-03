import { Request, Response } from 'express';
import {
    createAddress,
    listAddresses,
    pagedAddresses,
    listCities,
    pagedCities,
    getAddress,
    updateAddress,
    deleteAddress,
    getCity,
    createCity,
    updateCity,
    deleteCity,
    listCountries
} from '../services/addressService.js';

interface AddressCreateBody {
    address: string;
    address2?: string | null;
    district: string;
    city_id: number;
    postal_code?: string | null;
    phone: string;
}

function isAddressBody(x: unknown): x is AddressCreateBody {
    if (typeof x !== 'object' || x === null) return false;
    const o = x as Record<string, unknown>;
    if (typeof o.address !== 'string' || o.address.trim() === '') return false;
    if (typeof o.district !== 'string') return false;
    if (typeof o.phone !== 'string' || o.phone.trim() === '') return false;
    if (typeof o.city_id !== 'number' || !Number.isInteger(o.city_id)) return false;
    if (o.address2 !== undefined && o.address2 !== null && typeof o.address2 !== 'string') return false;
    if (o.postal_code !== undefined && o.postal_code !== null && typeof o.postal_code !== 'string') return false;
    return true;
}

function parseId(v: string | string[] | undefined): number | null {
    if (typeof v !== 'string') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 ? n : null;
}

function parsePagination(req: Request) {
    const q = req.query;
    const paged = q.paged === '1' || q.paged === 'true';
    const page = typeof q.page === 'string' && Number.isInteger(Number(q.page)) && Number(q.page) >= 1 ? Number(q.page) : 1;
    const maxPageSize = 1000;
    const pageSize = typeof q.pageSize === 'string' && Number.isInteger(Number(q.pageSize)) && Number(q.pageSize) >= 1
        ? Math.min(Number(q.pageSize), maxPageSize)
        : 20;
    return { paged, page, pageSize };
}

function addressError(res: Response, reason: string): void {
    switch (reason) {
        case 'city-not-found': res.status(400).json({ error: 'City not found' }); break;
        case 'address-not-found': res.status(404).json({ error: 'Address not found' }); break;
    }
}

export async function getAddresses(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' && req.query.search.trim() !== ''
        ? req.query.search.trim().toLowerCase()
        : undefined;
    const { paged, page, pageSize } = parsePagination(req);
    if (paged) {
        const { items, total } = await pagedAddresses(search, page, pageSize);
        res.json({ items, total, page, pageSize });
        return;
    }
    res.json(await listAddresses(search));
}

export async function createAddressController(req: Request, res: Response) {
    if (!isAddressBody(req.body)) {
        res.status(400).json({ error: 'address, district, phone (strings) and city_id (number) are required' });
        return;
    }
    const result = await createAddress({ ...req.body });
    if (result === 'city-not-found') { res.status(400).json({ error: 'City not found' }); return; }
    if (!result) { res.status(500).json({ error: 'Address creation failed' }); return; }
    res.status(201).json(result);
}

export async function getAddressController(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (id === null) { res.status(400).json({ error: 'address id must be a positive integer' }); return; }
    const row = await getAddress(id);
    if (!row) { res.status(404).json({ error: 'Address not found' }); return; }
    res.json(row);
}

export async function updateAddressController(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (id === null) { res.status(400).json({ error: 'address id must be a positive integer' }); return; }
    if (!isAddressBody(req.body)) {
        res.status(400).json({ error: 'address, district, phone (strings) and city_id (number) are required' });
        return;
    }
    const result = await updateAddress(id, req.body);
    if (typeof result === 'string') { addressError(res, result); return; }
    res.json(result);
}

export async function deleteAddressController(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (id === null) { res.status(400).json({ error: 'address id must be a positive integer' }); return; }
    const deleted = await deleteAddress(id);
    if (!deleted) { res.status(404).json({ error: 'Address not found' }); return; }
    res.json({ success: true, message: 'Address deleted' });
}

export async function getCitiesController(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' && req.query.search.trim() !== ''
        ? req.query.search.trim().toLowerCase()
        : undefined;
    const { paged, page, pageSize } = parsePagination(req);
    if (paged) {
        const { items, total } = await pagedCities(search, page, pageSize);
        res.json({ items, total, page, pageSize });
        return;
    }
    res.json(await listCities(search));
}

export async function getCityController(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (id === null) { res.status(400).json({ error: 'city id must be a positive integer' }); return; }
    const row = await getCity(id);
    if (!row) { res.status(404).json({ error: 'City not found' }); return; }
    res.json(row);
}

function isCityBody(x: unknown): x is { name: string; country_id: number } {
    if (typeof x !== 'object' || x === null) return false;
    const o = x as Record<string, unknown>;
    if (typeof o.name !== 'string' || o.name.trim() === '') return false;
    if (typeof o.country_id !== 'number' || !Number.isInteger(o.country_id)) return false;
    return true;
}

export async function createCityController(req: Request, res: Response) {
    if (!isCityBody(req.body)) {
        res.status(400).json({ error: 'name (string) and country_id (number) are required' });
        return;
    }
    const result = await createCity({ name: req.body.name.trim(), country_id: req.body.country_id });
    if (result === 'country-not-found') { res.status(400).json({ error: 'Country not found' }); return; }
    if (!result) { res.status(500).json({ error: 'City creation failed' }); return; }
    res.status(201).json(result);
}

export async function updateCityController(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (id === null) { res.status(400).json({ error: 'city id must be a positive integer' }); return; }
    if (!isCityBody(req.body)) {
        res.status(400).json({ error: 'name (string) and country_id (number) are required' });
        return;
    }
    const result = await updateCity(id, { name: req.body.name.trim(), country_id: req.body.country_id });
    if (result === 'city-not-found') { res.status(404).json({ error: 'City not found' }); return; }
    if (result === 'country-not-found') { res.status(400).json({ error: 'Country not found' }); return; }
    res.json(result);
}

export async function deleteCityController(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (id === null) { res.status(400).json({ error: 'city id must be a positive integer' }); return; }
    const deleted = await deleteCity(id);
    if (!deleted) { res.status(404).json({ error: 'City not found, or it has addresses attached' }); return; }
    res.json({ success: true, message: 'City deleted' });
}

export async function getCountriesController(req: Request, res: Response) {
    res.json(await listCountries());
}