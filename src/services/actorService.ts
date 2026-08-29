import { asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db.js';
import { actor } from '../db/schema.js';

export type ActorSort = 'actor_id' | 'first_name' | 'last_name';

export interface ActorQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: ActorSort;
    sortOrder?: 'asc' | 'desc';
}

export async function listActors(q: ActorQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const column = q.sortBy === 'first_name' ? actor.first_name
        : q.sortBy === 'last_name' ? actor.last_name
        : actor.actor_id;
    const dir = q.sortOrder === 'desc' ? desc : asc;
    const where = q.search?.trim()
        ? or(ilike(actor.first_name, `%${q.search.trim()}%`), ilike(actor.last_name, `%${q.search.trim()}%`))
        : undefined;

    const [rows, [{ value: total }]] = await Promise.all([
        db.select().from(actor).where(where).orderBy(dir(column)).limit(pageSize).offset((page - 1) * pageSize),
        db.select({ value: count() }).from(actor).where(where)
    ]);
    return { items: rows, total, page, pageSize };
}

export async function getActorById(id: number) {
    const row = await db.query.actor.findFirst({
        where: eq(actor.actor_id, id),
        with: {
            films: { with: { film: { columns: { film_id: true, title: true } } } }
        }
    });
    if (!row) return undefined;
    return {
        actor_id: row.actor_id,
        first_name: row.first_name,
        last_name: row.last_name,
        films: row.films.map(f => ({ film_id: f.film.film_id, title: f.film.title }))
    };
}

export async function createActor(input: { first_name: string; last_name: string }) {
    return (await db.insert(actor).values(input).returning())[0];
}

export async function updateActor(id: number, input: { first_name: string; last_name: string }) {
    return (await db.update(actor).set(input).where(eq(actor.actor_id, id)).returning())[0];
}

export async function deleteActor(id: number) {
    return (await db.delete(actor).where(eq(actor.actor_id, id)).returning())[0];
}