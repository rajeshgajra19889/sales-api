import { and, asc, count, desc, eq, ilike, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { customer, film, holds, inventory, rental, waitlist } from '../db/schema.js';

export type WaitlistSort = 'waitlist_id' | 'title' | 'customer' | 'created_at';

export interface WaitlistQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: WaitlistSort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<WaitlistSort, SQL | PgColumn> = {
    waitlist_id: waitlist.waitlist_id,
    title: film.title,
    customer: customer.last_name,
    created_at: waitlist.created_at
};

export async function listWaitlist(q: WaitlistQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);

    const searchTerm = (q.search ?? '').trim();
    const like = `%${searchTerm}%`;
    const where = searchTerm
        ? or(
            ilike(film.title, like),
            ilike(customer.first_name, like),
            ilike(customer.last_name, like)
        )
        : undefined;

    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'created_at'])
        : asc(SORTABLE[q.sortBy ?? 'created_at']);

    // Optimized count query: only join if search filtering requires it
    const totalQuery = db.select({ value: count() }).from(waitlist);
    if (searchTerm) {
        totalQuery
            .innerJoin(film, eq(waitlist.film_id, film.film_id))
            .innerJoin(customer, eq(waitlist.customer_id, customer.customer_id))
            .where(where);
    }

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            waitlist_id: waitlist.waitlist_id,
            film_id: waitlist.film_id,
            title: film.title,
            store_id: waitlist.store_id,
            customer_id: waitlist.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            created_at: waitlist.created_at
        })
            .from(waitlist)
            .innerJoin(film, eq(waitlist.film_id, film.film_id))
            .innerJoin(customer, eq(waitlist.customer_id, customer.customer_id))
            .where(where)
            .orderBy(order)
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        totalQuery
    ]);

    return {
        items: rows.map(r => ({
            waitlist_id: r.waitlist_id,
            film_id: r.film_id,
            title: r.title,
            store_id: r.store_id,
            customer_id: r.customer_id,
            customer_name: `${r.first_name} ${r.last_name}`,
            created_at: r.created_at
        })),
        total,
        page,
        pageSize
    };
}

export async function addToWaitlist(input: { film_id: number; customer_id: number; store_id?: number | null }) {
    return await db.transaction(async (tx) => {
        const [filmRow] = await tx.select({ id: film.film_id }).from(film).where(eq(film.film_id, input.film_id)).limit(1);
        if (!filmRow) return 'film-not-found';

        const [cust] = await tx.select({ id: customer.customer_id }).from(customer).where(eq(customer.customer_id, input.customer_id)).limit(1);
        if (!cust) return 'customer-not-found';

        const store = input.store_id ?? null;
        const [dup] = await tx.select({ value: count() })
            .from(waitlist)
            .where(and(
                eq(waitlist.film_id, input.film_id),
                eq(waitlist.customer_id, input.customer_id),
                store === null ? isNull(waitlist.store_id) : eq(waitlist.store_id, store)
            ));

        if (dup.value > 0) return 'duplicate';

        const [created] = await tx.insert(waitlist).values({
            film_id: input.film_id,
            customer_id: input.customer_id,
            store_id: store
        }).returning({
            waitlist_id: waitlist.waitlist_id,
            film_id: waitlist.film_id,
            customer_id: waitlist.customer_id,
            store_id: waitlist.store_id,
            created_at: waitlist.created_at
        });

        return created;
    });
}

export async function removeFromWaitlist(id: number) {
    const deleted = await db.delete(waitlist).where(eq(waitlist.waitlist_id, id)).returning({ waitlist_id: waitlist.waitlist_id });
    return deleted.length > 0 ? { removed: true, waitlist_id: id } : undefined;
}

export async function promoteWaitlist(input: { inventory_id: number; days: number }) {
    return await db.transaction(async (tx) => {
        // Clear expired holds using database time
        await tx.delete(holds)
            .where(and(eq(holds.inventory_id, input.inventory_id), lte(holds.expires_at, sql`NOW()`)));

        const [copy] = await tx
            .select({ film_id: inventory.film_id, store_id: inventory.store_id })
            .from(inventory)
            .where(eq(inventory.inventory_id, input.inventory_id))
            .for('update')
            .limit(1);

        if (!copy) return 'copy-not-found';

        const [open] = await tx.select({ value: count() })
            .from(rental)
            .where(and(eq(rental.inventory_id, input.inventory_id), isNull(rental.return_date)));
        if (open.value > 0) return 'rented';

        const [existing] = await tx.select({ value: count() })
            .from(holds)
            .where(eq(holds.inventory_id, input.inventory_id));
        if (existing.value > 0) return 'already-held';

        // Select and lock the highest priority waitlist row
        const [waiter] = await tx.select({
            waitlist_id: waitlist.waitlist_id,
            customer_id: waitlist.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name
        })
            .from(waitlist)
            .innerJoin(customer, eq(waitlist.customer_id, customer.customer_id))
            .where(and(
                eq(waitlist.film_id, copy.film_id),
                or(isNull(waitlist.store_id), eq(waitlist.store_id, copy.store_id))
            ))
            .orderBy(asc(waitlist.waitlist_id))
            .for('update')
            .limit(1);

        if (!waiter) return 'no-waiters';

        const expiresAt = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);

        const [hold] = await tx.insert(holds).values({
            inventory_id: input.inventory_id,
            customer_id: waiter.customer_id,
            expires_at: expiresAt
        }).returning({
            hold_id: holds.hold_id,
            inventory_id: holds.inventory_id,
            customer_id: holds.customer_id,
            expires_at: holds.expires_at
        });

        await tx.delete(waitlist).where(eq(waitlist.waitlist_id, waiter.waitlist_id));

        return {
            ...hold,
            film_id: copy.film_id,
            store_id: copy.store_id,
            customer_name: `${waiter.first_name} ${waiter.last_name}`
        };
    });
}