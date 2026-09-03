import { Request, Response } from 'express';
import { getLanguages, getLanguageById, createLanguage, updateLanguage, deleteLanguage } from '../services/languageService.js';

export async function getLanguagesController(req: Request, res: Response) {
    res.json(await getLanguages());
}

export async function getLanguageByIdController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'language id must be a positive integer' });
        return;
    }
    const lang = await getLanguageById(id);
    if (!lang) { res.status(404).json({ message: 'Language not found' }); return; }
    res.json(lang);
}

export async function createLanguageController(req: Request, res: Response) {
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const lang = await createLanguage(name.trim());
    res.status(201).json({ success: true, data: lang });
}

export async function updateLanguageController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'language id must be a positive integer' });
        return;
    }
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const lang = await updateLanguage(id, name.trim());
    if (!lang) { res.status(404).json({ message: 'Language not found' }); return; }
    res.json({ success: true, data: lang });
}

export async function deleteLanguageController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'language id must be a positive integer' });
        return;
    }
    const deleted = await deleteLanguage(id);
    if (!deleted) { res.status(404).json({ message: 'Language not found' }); return; }
    res.json({ success: true, message: 'Language deleted' });
}
