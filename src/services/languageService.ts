import { asc, eq, max } from 'drizzle-orm';
import { db } from '../db.js';
import { language } from '../db/schema.js';

export async function getLanguages() {
    const rows = await db
        .select({ language_id: language.language_id, name: language.name })
        .from(language)
        .orderBy(asc(language.language_id));
    return rows.map(r => ({ language_id: r.language_id, name: r.name.trim() }));
}

export async function getLanguageById(id: number) {
    const [row] = await db.select().from(language).where(eq(language.language_id, id)).limit(1);
    return row ? { language_id: row.language_id, name: row.name.trim() } : undefined;
}

async function nextLanguageId(): Promise<number> {
    const [{ value }] = await db.select({ value: max(language.language_id) }).from(language);
    return (value ?? 0) + 1;
}

export async function createLanguage(name: string) {
    const id = await nextLanguageId();
    const [row] = await db.insert(language).values({ language_id: id, name }).returning();
    return { language_id: row.language_id, name: row.name.trim() };
}

export async function updateLanguage(id: number, name: string) {
    const existing = await db.select({ language_id: language.language_id }).from(language)
        .where(eq(language.language_id, id)).limit(1);
    if (existing.length === 0) return undefined;
    const [row] = await db.update(language).set({ name }).where(eq(language.language_id, id)).returning();
    return { language_id: row.language_id, name: row.name.trim() };
}

export async function deleteLanguage(id: number) {
    const existing = await db.select({ language_id: language.language_id }).from(language)
        .where(eq(language.language_id, id)).limit(1);
    if (existing.length === 0) return false;
    await db.delete(language).where(eq(language.language_id, id));
    return true;
}