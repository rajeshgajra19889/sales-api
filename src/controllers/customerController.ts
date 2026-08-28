import { Request, Response } from 'express';
import { listCustomers } from '../services/customerService.js';

export async function getCustomers(_req: Request, res: Response) {
    const customers = await listCustomers();
    res.json(customers);
}