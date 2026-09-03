import { asc, count, desc, eq, gt, ilike, inArray, isNull, or, and, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { film, inventory, rental, store, customer, holds } from '../db/schema.js';
import { activeHoldCopyIds } from './holdsService.js';

export type InventorySort = 'inventory_id' | 'title' | 'store_id';

export interface InventoryQuery {
    page: number;
    pageSize: number;
    search?: string;
    storeId?: number;
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

    // Minor tweak: ilike is already case-insensitive, so .toLowerCase() is redundant
    const searchTerm = (q.search ?? '').trim();
    const like = `%${searchTerm}%`;

    const conds: SQL[] = [];
    if (searchTerm) conds.push(ilike(film.title, like));
    if (q.storeId !== undefined) conds.push(eq(inventory.store_id, q.storeId));
    const where = conds.length ? and(...conds) : undefined;
    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'inventory_id'])
        : asc(SORTABLE[q.sortBy ?? 'inventory_id']);

    // 1. Fetch paginated rows and total count in parallel
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

    // 2. ONLY check the rental/hold status for the items on the current page
    const inventoryIds = rows.map(r => r.inventory_id);
    const [checkedOut, heldIds] = await Promise.all([
        openRentalInventoryIds(inventoryIds),
        activeHoldCopyIds(inventoryIds)
    ]);

    return {
        items: rows.map(r => ({
            ...r,
            rented: checkedOut.has(r.inventory_id),
            held: heldIds.has(r.inventory_id)
        })),
        total,
        page,
        pageSize
    };
}

// Updated to accept an array of IDs to prevent full-table scans
async function openRentalInventoryIds(ids: number[]): Promise<Set<number>> {
    // Early return if the page is empty
    if (ids.length === 0) return new Set();

    const rows = await db
        .select({ inventory_id: rental.inventory_id })
        .from(rental)
        .where(and(
            isNull(rental.return_date),
            inArray(rental.inventory_id, ids) // Only check the IDs we actually need
        ));

    return new Set(rows.map(r => r.inventory_id));
}

export async function getInventoryDetail(id: number) {
    const row = await db.query.inventory.findFirst({
        where: eq(inventory.inventory_id, id),
        with: {
            film: {
                columns: { film_id: true, title: true, release_year: true, rental_rate: true }
            },
            rentals: {
                columns: { return_date: true } // Only fetch what we need to calculate stats
            },
            holds: {
                columns: { expires_at: true }
            }
        }
    });

    if (!row) return undefined;

    // Compute stats in JavaScript (extremely fast, no extra DB round-trips)
    const rentalCount = row.rentals?.length ?? 0;
    const rented = row.rentals?.some(r => r.return_date === null) ?? false;
    const held = row.holds?.some(h => h.expires_at > new Date()) ?? false;

    // Remove the rentals/holds arrays from the final response to keep the payload clean
    const { rentals, holds, ...inventoryData } = row;

    return {
        ...inventoryData,
        rentalCount,
        rented,
        held
    };
}

export async function createStock(input: { film_id: number; store_id: number; qty: number }) {
    // 1. Guard against invalid quantities
    if (input.qty <= 0) return 'invalid-qty';

    // 2. Run both validation queries in parallel to save time
    const [filmRow, storeRow] = await Promise.all([
        db.select({ id: film.film_id }).from(film).where(eq(film.film_id, input.film_id)).limit(1),
        db.select({ id: store.store_id, active: store.active }).from(store).where(eq(store.store_id, input.store_id)).limit(1)
    ]);

    if (!filmRow[0]) return 'film-not-found';
    if (!storeRow[0]) return 'store-not-found';
    if (!storeRow[0].active) return 'store-inactive';

    // 3. Create the batch array
    const copies = Array.from({ length: input.qty }, () => ({
        film_id: input.film_id,
        store_id: input.store_id
    }));

    // 4. Batch insert and return the count
    const inserted = await db.insert(inventory).values(copies).returning({
        inventory_id: inventory.inventory_id
    });

    return { created: inserted.length };
}



export async function moveCopy(id: number, storeId: number) {
    // 1. Wrap everything in a transaction to ensure atomicity
    return await db.transaction(async (tx) => {

        // 2. Fetch the item AND lock the row so no other request can modify it
        const [copy] = await tx
            .select({ store_id: inventory.store_id })
            .from(inventory)
            .where(eq(inventory.inventory_id, id))
            .for('update') //  Locks this specific row until the transaction finishes
            .limit(1);

        if (!copy) return 'not-found';
        if (copy.store_id === storeId) return 'same-store';

        // 3. Run the remaining independent checks in parallel to save time
        const [storeRow, [open], [held]] = await Promise.all([
            tx.select({ id: store.store_id, active: store.active }).from(store).where(eq(store.store_id, storeId)).limit(1),
            tx.select({ value: count() })
                .from(rental)
                .where(and(eq(rental.inventory_id, id), isNull(rental.return_date))),
            tx.select({ value: count() })
                .from(holds)
                .where(and(eq(holds.inventory_id, id), gt(holds.expires_at, new Date())))
        ]);

        if (!storeRow[0]) return 'store-not-found';
        if (!storeRow[0].active) return 'store-inactive';
        if (open.value > 0) return 'rented';
        if (held.value > 0) return 'held';

        // 4. Perform the update using the transaction object (tx)
        const [moved] = await tx
            .update(inventory)
            .set({ store_id: storeId })
            .where(eq(inventory.inventory_id, id))
            .returning({
                inventory_id: inventory.inventory_id,
                store_id: inventory.store_id
            });

        return moved;
    });
}



export async function listRenters(filmId: number, storeId: number) {
    const rows = await db
        .select({
            inventory_id: rental.inventory_id,
            customer_id: rental.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            rental_date: rental.rental_date
        })
        .from(rental)
        .innerJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .innerJoin(customer, eq(rental.customer_id, customer.customer_id))
        .where(and(
            isNull(rental.return_date),
            eq(inventory.film_id, filmId),
            eq(inventory.store_id, storeId)
        ))
        .orderBy(asc(rental.rental_date));

    return rows.map(r => ({
        inventory_id: r.inventory_id,
        customer_id: r.customer_id,
        customer_name: `${r.first_name} ${r.last_name}`,
        rental_date: r.rental_date
    }));
}

export async function getStockSummary(q: { page: number; pageSize: number; search?: string; storeId?: number }) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const searchTerm = (q.search ?? '').trim();
    const like = `%${searchTerm}%`;
    const conds: SQL[] = [];
    if (searchTerm) conds.push(ilike(film.title, like));
    if (q.storeId !== undefined) conds.push(eq(inventory.store_id, q.storeId));
    const where = conds.length ? and(...conds) : undefined;

    const grouped = db
        .select({
            film_id: inventory.film_id,
            store_id: inventory.store_id,
            title: film.title,
            copies: count(inventory.inventory_id),
            rented: count(rental.rental_id),
            held: count(holds.hold_id),
            available: sql<number>`CAST(COUNT(${inventory.inventory_id}) - COUNT(${rental.rental_id}) - COUNT(${holds.hold_id}) AS INT)`
        })
        .from(inventory)
        .innerJoin(film, eq(inventory.film_id, film.film_id))
        .leftJoin(
            rental,
            and(
                eq(inventory.inventory_id, rental.inventory_id),
                isNull(rental.return_date)
            )
        )
        .leftJoin(
            holds,
            and(
                eq(inventory.inventory_id, holds.inventory_id),
                gt(holds.expires_at, new Date())
            )
        )
        .where(where)
        .groupBy(inventory.film_id, inventory.store_id, film.title);

    const [rows, [{ value: total }]] = await Promise.all([
        grouped.orderBy(film.title).limit(pageSize).offset((page - 1) * pageSize),
        db.select({ value: count() })
            .from(
                db
                    .select({ film_id: inventory.film_id, store_id: inventory.store_id })
                    .from(inventory)
                    .innerJoin(film, eq(inventory.film_id, film.film_id))
                    .where(where)
                    .groupBy(inventory.film_id, inventory.store_id)
                    .as('g')
            )
    ]);

    return { items: rows, total, page, pageSize };
}

export async function listFilmInventory(filmId: number) {
    const rows = await db.select({
        inventory_id: inventory.inventory_id,
        store_id: inventory.store_id,
        rented: sql<boolean>`EXISTS(SELECT 1 FROM ${rental} WHERE ${rental.inventory_id} = ${inventory.inventory_id} AND ${rental.return_date} IS NULL)`
    }).from(inventory)
        .where(eq(inventory.film_id, filmId))
        .orderBy(inventory.store_id, inventory.inventory_id);

    return rows.map(r => ({
        inventory_id: r.inventory_id,
        store_id: r.store_id,
        rented: r.rented
    }));
}

export type DeleteCopyResult =
    | { ok: true; deleted: boolean }
    | { ok: false; reason: 'not-found' | 'rented' };

export async function deleteCopy(id: number): Promise<DeleteCopyResult> {
    const existing = await db.select({ inventory_id: inventory.inventory_id })
        .from(inventory)
        .where(eq(inventory.inventory_id, id))
        .limit(1);
    if (existing.length === 0) return { ok: false, reason: 'not-found' };

    const [open] = await db.select({ value: count() }).from(rental)
        .where(and(eq(rental.inventory_id, id), isNull(rental.return_date)));
    if (open.value > 0) return { ok: false, reason: 'rented' };

    const deleted = await db.delete(inventory).where(eq(inventory.inventory_id, id))
        .returning({ inventory_id: inventory.inventory_id });
    return { ok: true, deleted: deleted !== undefined && deleted.length > 0 };
}