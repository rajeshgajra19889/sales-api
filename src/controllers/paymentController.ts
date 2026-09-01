import { Request, Response, NextFunction } from 'express';
import {
    listPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentHistory,
    type PaymentSort
} from '../services/paymentService.js';
import { ZodError } from 'zod';

const SORTS = ['payment_id', 'amount', 'payment_date', 'customer_id'] as const;

function parsePaymentId(id: unknown): number | null {
    if (typeof id !== 'string') return null;
    const n = Number(id);
    return Number.isInteger(n) && n >= 1 ? n : null;
}

type PaymentErrorReason = 'not-found' | 'customer-not-found' | 'staff-not-found' | 'rental-not-found';

function paymentError(res: Response, reason: PaymentErrorReason): void {
    switch (reason) {
        case 'customer-not-found': res.status(400).json({ success: false, message: 'Customer not found' }); break;
        case 'staff-not-found': res.status(400).json({ success: false, message: 'Staff not found' }); break;
        case 'rental-not-found': res.status(400).json({ success: false, message: 'Rental not found' }); break;
        case 'not-found': res.status(404).json({ success: false, message: 'Payment not found' }); break;
    }
}

export async function getPayments(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'page and pageSize must be integers (page >= 1, pageSize 1-100)' });
        return;
    }
    let customerId: number | undefined;
    if (req.query.customer_id !== undefined) {
        const n = Number(req.query.customer_id);
        if (!Number.isInteger(n) || n < 1) {
            res.status(400).json({ error: 'customer_id must be a positive integer' });
            return;
        }
        customerId = n;
    }
    const sortBy: PaymentSort =
        typeof req.query.sortBy === 'string' && (SORTS as readonly string[]).includes(req.query.sortBy)
            ? req.query.sortBy as PaymentSort
            : 'payment_id';
    res.json(await listPayments({
        page,
        pageSize,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        customerId,
        sortBy,
        sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc'
    }));
}

export async function getPaymentByIdController(req: Request, res: Response) {
    const id = parsePaymentId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'payment id must be a positive integer' });
        return;
    }
    const detail = await getPaymentById(id);
    if (!detail) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
    }
    res.json(detail);
}

export async function createPaymentController(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await createPayment(req.body);
        if (!result.ok) {
            paymentError(res, result.reason);
            return;
        }
        res.status(201).json({ success: true, data: result.data });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.issues.map((err) => ({ field: err.path.join('.'), message: err.message }))
            });
            return;
        }
        next(error);
    }
}

export async function updatePaymentController(req: Request, res: Response, next: NextFunction) {
    const id = parsePaymentId(req.params.id);
    if (id === null) {
        res.status(400).json({ success: false, message: 'payment id must be a positive integer' });
        return;
    }
    try {
        const result = await updatePayment(id, req.body);
        if (!result.ok) {
            paymentError(res, result.reason);
            return;
        }
        res.json({ success: true, data: result.data });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.issues.map((err) => ({ field: err.path.join('.'), message: err.message }))
            });
            return;
        }
        next(error);
    }
}

export async function deletePaymentController(req: Request, res: Response, next: NextFunction) {
    const id = parsePaymentId(req.params.id);
    if (id === null) {
        res.status(400).json({ success: false, message: 'payment id must be a positive integer' });
        return;
    }
    try {
        const result = await deletePayment(id);
        if (!result.ok) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }
        res.json({ success: true, message: 'Payment deleted' });
    } catch (error) {
        next(error);
    }
}

export async function getPaymentHistoryController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'customer id must be a positive integer' });
        return;
    }
    res.json(await getPaymentHistory(id));
}