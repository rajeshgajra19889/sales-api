import { Request, Response, NextFunction } from 'express';
import { listCustomers, getCustomerDetail, createCustomer, updateCustomer, type CustomerSort } from '../services/customerService.js';
import { ZodError } from 'zod';

const SORTS = ['customer_id', 'first_name', 'last_name', 'email'] as const;

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

export async function createCustomerController(req: Request, res: Response, next: NextFunction) {
    try {
        // Pass the raw request body to the service
        const newCustomer = await createCustomer(req.body);

        return res.status(201).json({
            success: true,
            data: newCustomer
        });
    } catch (error) {
        // 1. Catch Validation Errors specifically
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues.map((err) => ({
                    field: err.path.join('.'), // e.g., "first_name"
                    message: err.message       // e.g., "First name is required"
                }))
            });
        }

        // 2. Catch Business Logic Errors (like "email already exists")
        if (error instanceof Error) {
            return res.status(409).json({ // 409 Conflict
                success: false,
                message: error.message
            });
        }

        // 3. Pass unknown errors to Express global error handler
        next(error);
    }
}

export async function updateCustomerController(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ success: false, message: 'Customer id must be a positive integer' });
        return;
    }
    try {
        const result = await updateCustomer(id, req.body);
        if (!result.ok) {
            if (result.reason === 'not-found') {
                res.status(404).json({ success: false, message: 'Customer not found' });
            } else if (result.reason === 'email-taken') {
                res.status(409).json({ success: false, message: 'A customer with this email already exists.' });
            } else if (result.reason === 'store-not-found') {
                res.status(400).json({ success: false, message: 'Store not found' });
            } else {
                res.status(400).json({ success: false, message: 'Address not found' });
            }
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