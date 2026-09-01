import { Request, Response } from 'express';
import { getLanguages } from '../services/languageService.js';

export async function getLanguagesController(req: Request, res: Response) {
    res.json(await getLanguages());
}
