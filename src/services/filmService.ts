import { eq, ilike, asc, desc, count } from 'drizzle-orm';
import { db } from '../db.js';
import { film, filmActor } from '../db/schema.js';

const SORT_COLUMNS = ['film_id', 'title', 'release_year', 'rental_rate'] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];

const sortColumn = {
    film_id: film.film_id,
    title: film.title,
    release_year: film.release_year,
    rental_rate: film.rental_rate
} as const;

function orderByExpr(sortBy: SortColumn, sortOrder: 'asc' | 'desc') {
    const col = SORT_COLUMNS.includes(sortBy) ? sortColumn[sortBy] : sortColumn.film_id;
    return sortOrder === 'desc' ? desc(col) : asc(col);
}

export interface FilmInput {
    title: string;
    release_year?: number | null;
    rental_rate?: string | number | null;
}

const filmColumns = {
    film_id: film.film_id,
    title: film.title,
    release_year: film.release_year,
    rental_rate: film.rental_rate
} as const;

export async function listFilmsPaginated(
    page: number,
    pageSize: number,
    search = '',
    sortBy: SortColumn = 'film_id',
    sortOrder: 'asc' | 'desc' = 'asc'
) {
    const offset = (page - 1) * pageSize;
    const where = ilike(film.title, `%${search}%`);

    const [countRow] = await db
        .select({ total: count() })
        .from(film)
        .where(where);
    const items = await db
        .select(filmColumns)
        .from(film)
        .where(where)
        .orderBy(orderByExpr(sortBy, sortOrder))
        .limit(pageSize)
        .offset(offset);

    return {
        items,
        total: countRow?.total ?? 0,
        page,
        pageSize
    };
}

export async function getFilmById(id: number) {
    const row = await db.query.film.findFirst({
        where: eq(film.film_id, id),
        with: {
            language: { columns: { name: true } }
        }
    });
    if (!row) return undefined;
    return {
        film_id: row.film_id,
        title: row.title,
        release_year: row.release_year,
        rental_rate: row.rental_rate,
        language_name: row.language?.name?.trim() ?? null,
    };
}


export async function createFilm(input: FilmInput) {
    const rows = await db
        .insert(film)
        .values({
            title: input.title,
            release_year: input.release_year ?? null,
            rental_rate: input.rental_rate == null ? '4.99' : String(input.rental_rate),
            language_id: 1
        })
        .returning(filmColumns);
    return rows[0];
}

export async function updateFilm(id: number, input: FilmInput) {
    const rows = await db
        .update(film)
        .set({
            title: input.title,
            release_year: input.release_year ?? null,
            rental_rate: input.rental_rate == null ? '4.99' : String(input.rental_rate),
        })
        .where(eq(film.film_id, id))
        .returning(filmColumns);
    return rows[0];
}

export async function deleteFilm(id: number) {
    const rows = await db.delete(film).where(eq(film.film_id, id)).returning({ film_id: film.film_id });
    return rows.length;
}

export async function getActorsForFilm(filmId: number) {
    const getfilm = await db.select({ id: film.film_id }).from(film).where(eq(film.film_id, filmId)).limit(1);
    if (!getfilm[0]) return undefined;
    const rows = await db.query.filmActor.findMany({
        where: eq(filmActor.film_id, filmId),
        with: { actor: { columns: { actor_id: true, first_name: true, last_name: true } } }
    });
    return rows.map(r => r.actor)
}

export async function replaceFilmActors(filmId: number, actorIds: number[]) {
    const getFilm = await db.select({ id: film.film_id }).from(film).where(eq(film.film_id, filmId)).limit(1);
    if (!getFilm[0]) return undefined;
    await db.transaction(async tx => {
        await tx.delete(filmActor).where(eq(filmActor.film_id, filmId));
        if (actorIds.length > 0) {
            await tx.insert(filmActor)
                .values(actorIds.map(actor_id => ({ film_id: filmId, actor_id })))
                .onConflictDoNothing();
        }
    });
    return getActorsForFilm(filmId);
}
