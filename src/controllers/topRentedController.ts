import { Request, Response } from 'express';
import { listTopRented } from '../services/topRentedService.js';

export async function getTopRented(_req: Request, res: Response) {
    const films = await listTopRented();
    res.json(films);
}