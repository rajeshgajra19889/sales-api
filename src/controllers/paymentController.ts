import { Request, Response } from 'express';
import { getPaymentHistory } from '../services/paymentService.js';

export async function getPaymentHistoryController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'customer id must be a positive integer' });
        return;
    }
    res.json(await getPaymentHistory(id));
}
