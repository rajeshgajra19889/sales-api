import { and, asc, count, desc, eq, gt, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { holds, inventory, customer, film, rental } from '../db/schema.js';

export type HoldSort = 'hold_id' | 'title' | 'customer' | 'expires_at';

export interface HoldQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: HoldSort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<HoldSort, SQL | PgColumn> = {
    hold_id: holds.hold_id,
    title: film.title,
    customer: customer.last_name,
    expires_at: holds.expires_at
};

export async function listHolds(q: HoldQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);

    const searchTerm = (q.search ?? '').trim();
    const like = `%${searchTerm}%`;

    const active = gt(holds.expires_at, new Date());
    const where = searchTerm
        ? and(active, or(
            ilike(film.title, like),
            ilike(customer.first_name, like),
            ilike(customer.last_name, like)
        ))
        : active;
    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'expires_at'])
        : asc(SORTABLE[q.sortBy ?? 'expires_at']);

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            hold_id: holds.hold_id,
            inventory_id: holds.inventory_id,
            film_id: inventory.film_id,
            title: film.title,
            store_id: inventory.store_id,
            customer_id: holds.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            created_at: holds.created_at,
            expires_at: holds.expires_at
        })
            .from(holds)
            .innerJoin(inventory, eq(holds.inventory_id, inventory.inventory_id))
            .innerJoin(film, eq(inventory.film_id, film.film_id))
            .innerJoin(customer, eq(holds.customer_id, customer.customer_id))
            .where(where)
            .orderBy(order)
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ value: count() })
            .from(holds)
            .innerJoin(inventory, eq(holds.inventory_id, inventory.inventory_id))
            .innerJoin(film, eq(inventory.film_id, film.film_id))
            .innerJoin(customer, eq(holds.customer_id, customer.customer_id))
            .where(where)
    ]);

    return {
        items: rows.map(r => ({
            hold_id: r.hold_id,
            inventory_id: r.inventory_id,
            film_id: r.film_id,
            title: r.title,
            store_id: r.store_id,
            customer_id: r.customer_id,
            customer_name: `${r.first_name} ${r.last_name}`,
            created_at: r.created_at,
            expires_at: r.expires_at
        })),
        total,
        page,
        pageSize
    };
}

export async function createHold(input: { inventory_id: number; customer_id: number; expires_at: Date }) {
    if (input.expires_at.getTime() <= Date.now()) return 'past-expiry';

    return await db.transaction(async (tx) => {
        // Expired holds on this copy never block a fresh one (clock-safe purge)
        await tx.delete(holds)
            .where(and(eq(holds.inventory_id, input.inventory_id), lte(holds.expires_at, new Date())));

        const [copy] = await tx
            .select({ film_id: inventory.film_id, store_id: inventory.store_id })
            .from(inventory)
            .where(eq(inventory.inventory_id, input.inventory_id))
            .for('update')
            .limit(1);

        if (!copy) return 'copy-not-found';

        const [open] = await tx.select({ value: count() })
            .from(rental)
            .where(and(eq(rental.inventory_id, input.inventory_id), sql`${rental.return_date} IS NULL`));

        if (open.value > 0) return 'rented';

        const [existing] = await tx.select({ value: count() })
            .from(holds)
            .where(eq(holds.inventory_id, input.inventory_id));

        if (existing.value > 0) return 'already-held';

        const [cust] = await tx.select({ id: customer.customer_id })
            .from(customer)
            .where(eq(customer.customer_id, input.customer_id))
            .limit(1);

        if (!cust) return 'customer-not-found';

        const [created] = await tx.insert(holds).values({
            inventory_id: input.inventory_id,
            customer_id: input.customer_id,
            expires_at: input.expires_at
        }).returning({
            hold_id: holds.hold_id,
            inventory_id: holds.inventory_id,
            customer_id: holds.customer_id,
            expires_at: holds.expires_at
        });

        return { ...created, film_id: copy.film_id, store_id: copy.store_id };
    });
}

export async function releaseHold(id: number) {
    const deleted = await db.delete(holds).where(eq(holds.hold_id, id)).returning({ hold_id: holds.hold_id });
    return deleted.length > 0 ? { released: true, hold_id: id } : undefined;
}

export async function activeHoldCopyIds(ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const rows = await db.select({ inventory_id: holds.inventory_id })
        .from(holds)
        .where(and(gt(holds.expires_at, new Date()), inArray(holds.inventory_id, ids)));
    return new Set(rows.map(r => r.inventory_id));
}