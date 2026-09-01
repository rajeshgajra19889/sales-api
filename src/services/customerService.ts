import { asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { address, store, customer, rental } from '../db/schema.js';
import { createCustomerValidation, updateCustomerValidation } from '../validations/customer.schema.js';

export type CustomerSort = 'customer_id' | 'first_name' | 'last_name' | 'email';



export interface CustomerQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: CustomerSort;
    sortOrder?: 'asc' | 'desc';
}

export interface CustomerInput {
    title: string;
    release_year?: number | null;
    rental_rate?: string | number | null;
    store_id: number;
    first_name: string; last_name: string;
    email: string;
    address_id: number;
    activebool: boolean;

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
            activebool: customer.activebool,
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
            activebool: true,
            store_id: true,
            address_id: true
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

export async function createCustomer(rawInput: CustomerInput) {
    // 1. VALIDATION: Parse and validate. 
    // If rawInput is missing fields or has wrong types, this THROWS a ZodError.
    // If valid, `input` is now strictly typed and sanitized.
    const input = createCustomerValidation.parse(rawInput);

    // 2. BUSINESS LOGIC: (Optional) Check if email already exists
    if (input.email) {
        const existingCustomer = await db
            .select({ customer_id: customer.customer_id })
            .from(customer)
            .where(eq(customer.email, input.email)) // check email
            .limit(1);

        if (existingCustomer.length > 0) {
            throw new Error("A customer with this email already exists.");
        }

        // 3. Build the insert object
        const insertData: any = {
            first_name: input.first_name,
            last_name: input.last_name,
            address_id: input.address_id,
            store_id: input.store_id,
            activebool: input.activebool,
        };
        if (input.email) {
            insertData.email = input.email;
        }

        // 3. DATABASE INSERTION
        const [newCustomer] = await db.insert(customer)
            .values(insertData)
            .returning({
                customer_id: customer.customer_id,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
            });


        return newCustomer;
    }
}

export type UpdateCustomerResult =
    | { ok: true; data: { customer_id: number; first_name: string; last_name: string; email: string | null; activebool: boolean } }
    | { ok: false; reason: 'not-found' | 'email-taken' | 'store-not-found' | 'address-not-found' };

export async function updateCustomer(id: number, rawInput: Partial<CustomerInput>): Promise<UpdateCustomerResult> {
    // 1. VALIDATION
    const input = updateCustomerValidation.parse(rawInput);

    // 2. Make sure the customer exists
    const existing = await db
        .select({ customer_id: customer.customer_id, email: customer.email })
        .from(customer)
        .where(eq(customer.customer_id, id))
        .limit(1);
    if (existing.length === 0) return { ok: false, reason: 'not-found' };

    // 3. If email is changing, ensure it's not already used by ANOTHER customer
    let newEmail: string | null | undefined;
    if (input.email !== undefined && input.email.trim().toLowerCase() !== (existing[0].email ?? '').toLowerCase()) {
        const clash = await db
            .select({ customer_id: customer.customer_id })
            .from(customer)
            .where(eq(customer.email, input.email.trim()))
            .limit(1);
        if (clash.length > 0) return { ok: false, reason: 'email-taken' };
        newEmail = input.email.trim();
    }

    // 4. Validate store / address references when provided
    if (input.store_id !== undefined) {
        const s = await db.select({ store_id: store.store_id }).from(store).where(eq(store.store_id, input.store_id)).limit(1);
        if (s.length === 0) return { ok: false, reason: 'store-not-found' };
    }
    if (input.address_id !== undefined) {
        const a = await db.select({ address_id: address.address_id }).from(address).where(eq(address.address_id, input.address_id)).limit(1);
        if (a.length === 0) return { ok: false, reason: 'address-not-found' };
    }

    // 5. Build the update set (only include provided fields)
    const set: Partial<Record<string, unknown>> = { last_update: new Date() };
    if (input.first_name !== undefined) set.first_name = input.first_name;
    if (input.last_name !== undefined) set.last_name = input.last_name;
    if (newEmail !== undefined) set.email = newEmail;
    if (input.store_id !== undefined) set.store_id = input.store_id;
    if (input.address_id !== undefined) set.address_id = input.address_id;
    if (input.activebool !== undefined) set.activebool = input.activebool;

    const [updated] = await db.update(customer)
        .set(set)
        .where(eq(customer.customer_id, id))
        .returning({
            customer_id: customer.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            activebool: customer.activebool
        });

    if (!updated) return { ok: false, reason: 'not-found' };
    return { ok: true, data: updated };
}