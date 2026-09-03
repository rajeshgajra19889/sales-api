import { Request, Response } from 'express';
import { getRevenueReport } from '../services/revenueService.js';
import { toCsv } from '../utils/csv.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface RevenueFilter {
    storeId?: number;
    customerId?: number;
    dateFrom?: string;
    dateTo?: string;
}

function parsePositiveInt(v: unknown): number | null {
    if (typeof v !== 'string') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 ? n : null;
}

function parseFilter(req: Request, res: Response): RevenueFilter | null {
    const filter: RevenueFilter = {};
    if (req.query.store_id !== undefined) {
        const n = parsePositiveInt(req.query.store_id);
        if (n === null) { res.status(400).json({ error: 'store_id must be a positive integer' }); return null; }
        filter.storeId = n;
    }
    if (req.query.customer_id !== undefined) {
        const n = parsePositiveInt(req.query.customer_id);
        if (n === null) { res.status(400).json({ error: 'customer_id must be a positive integer' }); return null; }
        filter.customerId = n;
    }
    if (req.query.dateFrom !== undefined) {
        if (typeof req.query.dateFrom !== 'string' || !DATE_RE.test(req.query.dateFrom)) { res.status(400).json({ error: 'dateFrom must be a date in YYYY-MM-DD format' }); return null; }
        filter.dateFrom = req.query.dateFrom;
    }
    if (req.query.dateTo !== undefined) {
        if (typeof req.query.dateTo !== 'string' || !DATE_RE.test(req.query.dateTo)) { res.status(400).json({ error: 'dateTo must be a date in YYYY-MM-DD format' }); return null; }
        filter.dateTo = req.query.dateTo;
    }
    return filter;
}

export async function getRevenue(req: Request, res: Response) {
    const filter = parseFilter(req, res);
    if (filter === null) return;
    res.json(await getRevenueReport(filter));
}

export async function exportRevenueController(req: Request, res: Response) {
    const filter = parseFilter(req, res);
    if (filter === null) return;

    const report = await getRevenueReport(filter);

    const summaryCsv = toCsv(
        ['total_revenue', 'total_payments', 'avg_amount'],
        [[report.summary.totalAmount.toFixed(2), report.summary.totalPayments, report.summary.avgAmount.toFixed(2)]]
    );
    const storeCsv = toCsv(
        ['store_id', 'store', 'payments', 'revenue'],
        report.byStore.map(s => [s.store_id, s.store_name, s.totalPayments, s.totalAmount.toFixed(2)])
    );
    const monthlyCsv = toCsv(
        ['month', 'payments', 'revenue'],
        report.monthly.map(m => [m.month, m.totalPayments, m.totalAmount.toFixed(2)])
    );
    const customersCsv = toCsv(
        ['customer_id', 'customer', 'payments', 'spent'],
        report.topCustomers.map(c => [c.customer_id, c.name, c.totalPayments, c.totalAmount.toFixed(2)])
    );

    const body = [
        'SUMMARY',
        summaryCsv,
        '',
        'REVENUE BY STORE',
        storeCsv,
        '',
        'REVENUE BY MONTH',
        monthlyCsv,
        '',
        'TOP CUSTOMERS',
        customersCsv
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
    res.send(body);
}
