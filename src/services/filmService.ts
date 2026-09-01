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
    description?: string | null;
    release_year?: number | null;
    language_id?: number | null;
    rental_duration?: number | null;
    rental_rate?: string | number | null;
    length?: number | null;
    replacement_cost?: string | number | null;
    rating?: string | null;
    special_features?: string[] | null;
}

const filmColumns = {
    film_id: film.film_id,
    title: film.title,
    description: film.description,
    release_year: film.release_year,
    language_id: film.language_id,
    rental_duration: film.rental_duration,
    rental_rate: film.rental_rate,
    length: film.length,
    replacement_cost: film.replacement_cost,
    rating: film.rating,
    special_features: film.special_features
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
    const rows = await db.query.film.findMany({
        where,
        with: {
            language: { columns: { name: true } }
        },
        orderBy: orderByExpr(sortBy, sortOrder),
        limit: pageSize,
        offset
    });
    const items = rows.map(row => ({
        film_id: row.film_id,
        title: row.title,
        description: row.description,
        release_year: row.release_year,
        language_id: row.language_id,
        language_name: row.language?.name?.trim() ?? null,
        rental_duration: row.rental_duration,
        rental_rate: row.rental_rate,
        length: row.length,
        replacement_cost: row.replacement_cost,
        rating: row.rating,
        special_features: row.special_features
    }));

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
        description: row.description,
        release_year: row.release_year,
        language_id: row.language_id,
        language_name: row.language?.name?.trim() ?? null,
        rental_duration: row.rental_duration,
        rental_rate: row.rental_rate,
        length: row.length,
        replacement_cost: row.replacement_cost,
        rating: row.rating,
        special_features: row.special_features
    };
}


export async function createFilm(input: FilmInput) {
    const rows = await db
        .insert(film)
        .values({
            title: input.title,
            description: input.description ?? null,
            release_year: input.release_year ?? null,
            language_id: input.language_id ?? 1,
            rental_duration: input.rental_duration ?? 3,
            rental_rate: input.rental_rate == null ? '4.99' : String(input.rental_rate),
            length: input.length ?? null,
            replacement_cost: input.replacement_cost == null ? '19.99' : String(input.replacement_cost),
            rating: input.rating ?? 'G',
            special_features: input.special_features ?? null
        })
        .returning(filmColumns);
    return rows[0];
}

export async function updateFilm(id: number, input: FilmInput) {
    const rows = await db
        .update(film)
        .set({
             title: input.title,
            description: input.description ?? null,
            release_year: input.release_year ?? null,
            language_id: input.language_id ?? 1,
            rental_duration: input.rental_duration ?? 3,
            rental_rate: input.rental_rate == null ? '4.99' : String(input.rental_rate),
            length: input.length ?? null,
            replacement_cost: input.replacement_cost == null ? '19.99' : String(input.replacement_cost),
            rating: input.rating ?? 'G',
            special_features: input.special_features ?? null
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
