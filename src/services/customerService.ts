import { asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { customer, rental } from '../db/schema.js';

export type CustomerSort = 'customer_id' | 'first_name' | 'last_name' | 'email';

export interface CustomerQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: CustomerSort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<CustomerSort, PgColumn> = {
    customer_id: customer.customer_id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email
};

export async function listCustomers(q: CustomerQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const column = SORTABLE[q.sortBy ?? 'customer_id'] ?? SORTABLE.customer_id;
    const like = `%${(q.search ?? '').trim().toLowerCase()}%`;
    const where = q.search?.trim()
        ? or(
            ilike(customer.first_name, like),
            ilike(customer.last_name, like),
            ilike(customer.email, like)
        )
        : undefined;

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            customer_id: customer.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            active: customer.active,
            store_id: customer.store_id
        })
            .from(customer)
            .where(where)
            .orderBy(q.sortOrder === 'desc' ? desc(column) : asc(column))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ value: count() }).from(customer).where(where)
    ]);
    return { items: rows, total, page, pageSize };
}

export async function getCustomerDetail(id: number) {
    const row = await db.query.customer.findFirst({
        where: eq(customer.customer_id, id),
        columns: {
            customer_id: true,
            first_name: true,
            last_name: true,
            email: true,
            active: true,
            store_id: true
        },
        with: {
            rentals: {
                orderBy: desc(rental.rental_date),
                limit: 5,
                with: {
                    inventory: {
                        columns: { inventory_id: true },
                        with: { film: { columns: { title: true } } }
                    }
                }
            }
        }
    });
    if (!row) return undefined;

    const [rentalCount] = await db.select({ value: count() })
        .from(rental)
        .where(eq(rental.customer_id, id));
    return {
        ...row,
        rentals: row.rentals.map(r => ({
            rental_id: r.rental_id,
            rental_date: r.rental_date,
            title: r.inventory.film.title
        })),
        rentalCount: rentalCount.value
    };
}