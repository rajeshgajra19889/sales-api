import {  asc } from 'drizzle-orm';
import { db } from '../db.js';
import { language } from '../db/schema.js';

export async function getLanguages() {
    const rows = await db
        .select({ language_id: language.language_id, name: language.name })
        .from(language)
        .orderBy(asc(language.language_id));
    return rows.map(r => ({ language_id: r.language_id, name: r.name.trim() }));
}