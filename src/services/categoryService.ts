import { asc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { category } from '../db/schema.js';

export async function getCategories() {
    return db.select({ category_id: category.category_id, name: category.name })
        .from(category)
        .orderBy(asc(category.category_id));
}

export async function getCategoryById(id: number) {
    const [row] = await db.select().from(category).where(eq(category.category_id, id)).limit(1);
    return row ?? undefined;
}

export async function createCategory(name: string) {
    const [row] = await db.insert(category).values({ name }).returning();
    return { category_id: row.category_id, name: row.name };
}

export async function updateCategory(id: number, name: string) {
    const existing = await db.select({ category_id: category.category_id }).from(category)
        .where(eq(category.category_id, id)).limit(1);
    if (existing.length === 0) return undefined;
    const [row] = await db.update(category).set({ name }).where(eq(category.category_id, id)).returning();
    return { category_id: row.category_id, name: row.name };
}

export async function deleteCategory(id: number) {
    const existing = await db.select({ category_id: category.category_id }).from(category)
        .where(eq(category.category_id, id)).limit(1);
    if (existing.length === 0) return false;
    await db.delete(category).where(eq(category.category_id, id));
    return true;
}