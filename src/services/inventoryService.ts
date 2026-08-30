import { asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { film, inventory, rental } from '../db/schema.js';

export type InventorySort = 'inventory_id' | 'title' | 'store_id';

export interface InventoryQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: InventorySort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<InventorySort, SQL | PgColumn> = {
    inventory_id: inventory.inventory_id,
    title: film.title,
    store_id: inventory.store_id
};

export async function listInventory(q: InventoryQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const like = `%${(q.search ?? '').trim().toLowerCase()}%`;
    const where = q.search?.trim() ? ilike(film.title, like) : undefined;
    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'inventory_id'])
        : asc(SORTABLE[q.sortBy ?? 'inventory_id']);

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            inventory_id: inventory.inventory_id,
            title: film.title,
            store_id: inventory.store_id
        })
            .from(inventory)
            .innerJoin(film, eq(inventory.film_id, film.film_id))
            .where(where)
            .orderBy(order)
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ value: count() })
            .from(inventory)
            .innerJoin(film, eq(inventory.film_id, film.film_id))
            .where(where)
    ]);
    return { items: rows, total, page, pageSize };
}

export async function getInventoryDetail(id: number) {
    const row = await db.query.inventory.findFirst({
        where: eq(inventory.inventory_id, id),
        with: {
            film: {
                columns: { film_id: true, title: true, release_year: true, rental_rate: true }
            }
        }
    });
    if (!row) return undefined;

    const [rentals] = await db.select({ value: count() })
        .from(rental)
        .where(eq(rental.inventory_id, id));

    return { ...row, rentalCount: rentals.value };
}