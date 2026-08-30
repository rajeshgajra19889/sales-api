import { asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db.js';
import { customer, film, inventory, rental } from '../db/schema.js';
import type { PgColumn } from 'drizzle-orm/pg-core';

export type RentalSort = 'rental_id' | 'rental_date' | 'film' | 'customer' | 'returned';

export interface RentalQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: RentalSort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<RentalSort, SQL | PgColumn> = {
    rental_id: rental.rental_id,
    rental_date: rental.rental_date,
    film: film.title,
    customer: sql`concat(${customer.first_name}, ' ', ${customer.last_name})`,
    returned: sql`${rental.return_date} IS NOT NULL`
};

export async function listRentals(q: RentalQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const like = `%${(q.search ?? '').trim().toLowerCase()}%`;
    const where = q.search?.trim()
        ? or(
            ilike(film.title, like),
            ilike(customer.first_name, like),
            ilike(customer.last_name, like)
        )
        : undefined;
    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'rental_id'])
        : asc(SORTABLE[q.sortBy ?? 'rental_id']);

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            rental_id: rental.rental_id,
            rental_date: rental.rental_date,
            return_date: rental.return_date,
            title: film.title,
            customer_name: sql<string>`concat(${customer.first_name}, ' ', ${customer.last_name})`
        })
            .from(rental)
            .innerJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
            .innerJoin(film, eq(inventory.film_id, film.film_id))
            .innerJoin(customer, eq(rental.customer_id, customer.customer_id))
            .where(where)
            .orderBy(order)
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ value: count() })
            .from(rental)
            .innerJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
            .innerJoin(film, eq(inventory.film_id, film.film_id))
            .innerJoin(customer, eq(rental.customer_id, customer.customer_id))
            .where(where)
    ]);
    return { items: rows, total, page, pageSize };
}

export async function getRentalDetail(id: number) {
    const row = await db.query.rental.findFirst({
        where: eq(rental.rental_id, id),
        columns: { rental_id: true, rental_date: true, return_date: true },
        with: {
            customer: { columns: { customer_id: true, first_name: true, last_name: true, email: true } },
             inventory: {
                columns: { inventory_id: true, store_id: true },
                with: { film: { columns: { film_id: true, title: true, release_year: true, rental_rate: true } } }
            }
        }
    });
    if (!row) return undefined;
    return {
        rental_id: row.rental_id,
        rental_date: row.rental_date,
        return_date: row.return_date,
        customer: row.customer,
        inventory_id: row.inventory.inventory_id,
        store_id: row.inventory.store_id,
        film: row.inventory.film
    };
}