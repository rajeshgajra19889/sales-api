import { asc, count, desc, eq, ilike, inArray, isNull, or, and, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { film, inventory, rental, store, } from '../db/schema.js';

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

    // Minor tweak: ilike is already case-insensitive, so .toLowerCase() is redundant
    const searchTerm = (q.search ?? '').trim();
    const like = `%${searchTerm}%`;

    const where = searchTerm ? ilike(film.title, like) : undefined;
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

    // 2. ONLY check the rental status for the items on the current page
    const inventoryIds = rows.map(r => r.inventory_id);
    const checkedOut = await openRentalInventoryIds(inventoryIds);

    return {
        items: rows.map(r => ({ ...r, rented: checkedOut.has(r.inventory_id) })),
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
            }
        }
    });

    if (!row) return undefined;

    // Compute stats in JavaScript (extremely fast, no extra DB round-trips)
    const rentalCount = row.rentals?.length ?? 0;
    const rented = row.rentals?.some(r => r.return_date === null) ?? false;

    // Remove the rentals array from the final response to keep the payload clean
    const { rentals, ...inventoryData } = row;

    return {
        ...inventoryData,
        rentalCount,
        rented
    };
}

export async function createStock(input: { film_id: number; store_id: number; qty: number }) {
    // 1. Guard against invalid quantities
    if (input.qty <= 0) return 'invalid-qty';

    // 2. Run both validation queries in parallel to save time
    const [filmRow, storeRow] = await Promise.all([
        db.select({ id: film.film_id }).from(film).where(eq(film.film_id, input.film_id)).limit(1),
        db.select({ id: store.store_id }).from(store).where(eq(store.store_id, input.store_id)).limit(1)
    ]);

    if (!filmRow[0]) return 'film-not-found';
    if (!storeRow[0]) return 'store-not-found';

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
        const [storeRow, [open]] = await Promise.all([
            tx.select({ id: store.store_id }).from(store).where(eq(store.store_id, storeId)).limit(1),
            tx.select({ value: count() })
                .from(rental)
                .where(and(eq(rental.inventory_id, id), isNull(rental.return_date)))
        ]);

        if (!storeRow[0]) return 'store-not-found';
        if (open.value > 0) return 'rented';

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



export async function getStockSummary() {
    return await db
        .select({
            film_id: inventory.film_id,
            store_id: inventory.store_id,
            title: film.title,
            copies: count(inventory.inventory_id),
            rented: count(rental.rental_id),
            available: sql<number>`CAST(COUNT(${inventory.inventory_id}) - COUNT(${rental.rental_id}) AS INT)`
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
        .groupBy(inventory.film_id, inventory.store_id,film.title)
        .orderBy(film.title);
}