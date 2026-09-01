import { Request, Response } from 'express';
import { createAddress, listAddresses, listCities } from '../services/addressService.js';

interface AddressCreateBody {
    address: string;
    address2?: string | null;
    district: string;
    city_id: number;
    postal_code?: string | null;
    phone: string;
}

function isCreateBody(x: unknown): x is AddressCreateBody {
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

export async function getAddresses(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' && req.query.search.trim() !== ''
        ? req.query.search.trim().toLowerCase()
        : undefined;
    res.json(await listAddresses(search));
}

export async function createAddressController(req: Request, res: Response) {
    if (!isCreateBody(req.body)) {
        res.status(400).json({ error: 'address, district, phone (strings) and city_id (number) are required' });
        return;
    }
    const result = await createAddress({
        address: req.body.address,
        address2: req.body.address2 ?? null,
        district: req.body.district,
        city_id: req.body.city_id,
        postal_code: req.body.postal_code ?? null,
        phone: req.body.phone
    });
    if (result === 'city-not-found') { res.status(404).json({ error: 'City not found' }); return; }
    if (!result) { res.status(500).json({ error: 'Address creation failed' }); return; }
    res.status(201).json(result);
}

export async function getCities(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' && req.query.search.trim() !== ''
        ? req.query.search.trim().toLowerCase()
        : undefined;
    res.json(await listCities(search));
}