import { Request, Response } from 'express';
import { getRevenueReport } from '../services/revenueService.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePositiveInt(v: unknown): number | null {
    if (typeof v !== 'string') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 ? n : null;
}

export async function getRevenue(req: Request, res: Response) {
    const filter: { storeId?: number; customerId?: number; dateFrom?: string; dateTo?: string } = {};
    if (req.query.store_id !== undefined) {
        const n = parsePositiveInt(req.query.store_id);
        if (n === null) {
            res.status(400).json({ error: 'store_id must be a positive integer' });
            return;
        }
        filter.storeId = n;
    }
    if (req.query.customer_id !== undefined) {
        const n = parsePositiveInt(req.query.customer_id);
        if (n === null) {
            res.status(400).json({ error: 'customer_id must be a positive integer' });
            return;
        }
        filter.customerId = n;
    }
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (req.query.dateFrom !== undefined) {
        if (typeof req.query.dateFrom !== 'string' || !DATE_RE.test(req.query.dateFrom)) {
            res.status(400).json({ error: 'dateFrom must be a date in YYYY-MM-DD format' });
            return;
        }
        dateFrom = req.query.dateFrom;
    }
    if (req.query.dateTo !== undefined) {
        if (typeof req.query.dateTo !== 'string' || !DATE_RE.test(req.query.dateTo)) {
            res.status(400).json({ error: 'dateTo must be a date in YYYY-MM-DD format' });
            return;
        }
        dateTo = req.query.dateTo;
    }

    res.json(await getRevenueReport({ ...filter, dateFrom, dateTo }));
}