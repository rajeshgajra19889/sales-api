import { Request, Response, NextFunction } from 'express';
import { listStaff, getStaffById, createStaff, updateStaff, deleteStaff, type StaffSort } from '../services/staffService.js';
import { ZodError } from 'zod';

const SORTS = ['staff_id', 'first_name', 'last_name', 'email'] as const;
function parseQuery(query: Record<string, unknown>, res: Response): {
    page: number; pageSize: number; search?: string;
    sortBy: StaffSort; sortOrder: 'asc' | 'desc';
} | null {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        res.status(400).json({ error: 'page and pageSize must be integers (page >= 1, pageSize 1-100)' });
        return null;
    }
    const sortBy: StaffSort =
        typeof query.sortBy === 'string' && (SORTS as readonly string[]).includes(query.sortBy)
            ? query.sortBy as StaffSort
            : 'staff_id';
    return {
        page,
        pageSize,
        search: typeof query.search === 'string' ? query.search : undefined,
        sortBy,
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    };
}

export async function getStaff(req: Request, res: Response) {
    const parsed = parseQuery(req.query, res);
    if (!parsed) return;
    res.json(await listStaff(parsed));
}

export async function getStaffByIdController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'staff id must be a positive integer' });
        return;
    }
    const detail = await getStaffById(id);
    if (!detail) {
        res.status(404).json({ success: false, message: 'Staff not found' });
        return;
    }
    res.json(detail);
}

export async function createStaffController(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await createStaff(req.body);
        if (!result.ok) {
            if (result.reason === 'username-taken') {
                res.status(409).json({ success: false, message: 'A staff member with this username already exists.' });
            } else if (result.reason === 'store-not-found') {
                res.status(400).json({ success: false, message: 'Store not found' });
            } else {
                res.status(400).json({ success: false, message: 'Address not found' });
            }
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

export async function updateStaffController(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ success: false, message: 'staff id must be a positive integer' });
        return;
    }
    try {
        const result = await updateStaff(id, req.body);
        if (!result.ok) {
            if (result.reason === 'not-found') {
                res.status(404).json({ success: false, message: 'Staff not found' });
            } else if (result.reason === 'username-taken') {
                res.status(409).json({ success: false, message: 'A staff member with this username already exists.' });
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

export async function deleteStaffController(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ success: false, message: 'staff id must be a positive integer' });
        return;
    }
    try {
        const result = await deleteStaff(id);
        if (!result.ok) {
            res.status(404).json({ success: false, message: 'Staff not found' });
            return;
        }
        res.json({ success: true, message: 'Staff deleted' });
    } catch (error) {
        next(error);
    }
}
