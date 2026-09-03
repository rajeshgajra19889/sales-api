import { Request, Response } from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../services/categoryService.js';

export async function getCategoriesController(req: Request, res: Response) {
    res.json(await getCategories());
}

export async function getCategoryByIdController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'category id must be a positive integer' });
        return;
    }
    const cat = await getCategoryById(id);
    if (!cat) { res.status(404).json({ message: 'Category not found' }); return; }
    res.json(cat);
}

export async function createCategoryController(req: Request, res: Response) {
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const cat = await createCategory(name.trim());
    res.status(201).json({ success: true, data: cat });
}

export async function updateCategoryController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'category id must be a positive integer' });
        return;
    }
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const cat = await updateCategory(id, name.trim());
    if (!cat) { res.status(404).json({ message: 'Category not found' }); return; }
    res.json({ success: true, data: cat });
}

export async function deleteCategoryController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: 'category id must be a positive integer' });
        return;
    }
    const deleted = await deleteCategory(id);
    if (!deleted) { res.status(404).json({ message: 'Category not found' }); return; }
    res.json({ success: true, message: 'Category deleted' });
}