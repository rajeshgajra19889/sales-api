import { and, asc, count, desc, eq, gte, ilike, lte, max, or, sql } from 'drizzle-orm';
import { type SQL } from 'drizzle-orm';
import { db } from '../db.js';
import { customer, film, inventory, payment, rental, staff } from '../db/schema.js';
import { PgColumn } from 'drizzle-orm/pg-core';
import { createPaymentValidation, updatePaymentValidation, type PaymentInput, type PaymentUpdateInput } from '../validations/payment.schema.js';

export type PaymentSort = 'payment_id' | 'amount' | 'payment_date' | 'customer_id';

export interface PaymentQuery {
    page: number;
    pageSize: number;
    search?: string;
    customerId?: number;
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: PaymentSort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<PaymentSort, PgColumn> = {
    payment_id: payment.payment_id,
    amount: payment.amount,
    payment_date: payment.payment_date,
    customer_id: payment.customer_id
};

export async function listPayments(q: PaymentQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const like = `%${(q.search ?? '').trim().toLowerCase()}%`;

    const conds: SQL[] = [];
    if (q.search?.trim()) {
        conds.push(or(
            ilike(customer.first_name, like),
            ilike(customer.last_name, like),
            ilike(film.title, like)
        )!);
    }
    if (q.customerId !== undefined) conds.push(eq(payment.customer_id, q.customerId));
    if (q.storeId !== undefined) {
        conds.push(or(eq(staff.store_id, q.storeId), eq(inventory.store_id, q.storeId))!);
    }
    if (q.dateFrom) conds.push(gte(payment.payment_date, new Date(`${q.dateFrom}T00:00:00`)));
    if (q.dateTo) conds.push(lte(payment.payment_date, new Date(`${q.dateTo}T23:59:59.999`)));
    const where = conds.length ? and(...conds) : undefined;

    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'payment_id'])
        : asc(SORTABLE[q.sortBy ?? 'payment_id']);

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            payment_id: payment.payment_id,
            customer_id: payment.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            staff_name: sql<string>`${staff.first_name} || ' ' || ${staff.last_name}`,
            store_id: sql<number>`COALESCE(${staff.store_id}, ${inventory.store_id})`,
            title: film.title,
            amount: payment.amount,
            payment_date: payment.payment_date
        })
            .from(payment)
            .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
            .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
            .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
            .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
            .leftJoin(film, eq(inventory.film_id, film.film_id))
            .where(where)
            .orderBy(order)
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ value: count() })
            .from(payment)
            .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
            .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
            .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
            .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
            .leftJoin(film, eq(inventory.film_id, film.film_id))
            .where(where)
    ]);
    return { items: rows, total, page, pageSize };
}

export async function exportPayments(q: Omit<PaymentQuery, 'page' | 'pageSize'>) {
    const like = `%${(q.search ?? '').trim().toLowerCase()}%`;
    const conds: SQL[] = [];
    if (q.search?.trim()) {
        conds.push(or(
            ilike(customer.first_name, like),
            ilike(customer.last_name, like),
            ilike(film.title, like)
        )!);
    }
    if (q.customerId !== undefined) conds.push(eq(payment.customer_id, q.customerId));
    if (q.storeId !== undefined) {
        conds.push(or(eq(staff.store_id, q.storeId), eq(inventory.store_id, q.storeId))!);
    }
    if (q.dateFrom) conds.push(gte(payment.payment_date, new Date(`${q.dateFrom}T00:00:00`)));
    if (q.dateTo) conds.push(lte(payment.payment_date, new Date(`${q.dateTo}T23:59:59.999`)));
    const where = conds.length ? and(...conds) : undefined;

    return db.select({
        payment_id: payment.payment_id,
        customer_id: payment.customer_id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        staff_name: sql<string>`${staff.first_name} || ' ' || ${staff.last_name}`,
        store_id: sql<number>`COALESCE(${staff.store_id}, ${inventory.store_id})`,
        title: film.title,
        amount: payment.amount,
        payment_date: payment.payment_date
    })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
        .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
        .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .leftJoin(film, eq(inventory.film_id, film.film_id))
        .where(where)
        .orderBy(payment.payment_id);
}

export async function getPaymentById(id: number) {
    const row = await db.query.payment.findFirst({
        where: eq(payment.payment_id, id),
        with: {
            customer: true,
            staff: true,
            rental: {
                with: {
                    inventory: {
                        with: {
                            film: true
                        }
                    }
                }
            }
        }
    });
    if (!row) return undefined;
    return {
        payment_id: row.payment_id,
        customer_id: row.customer_id,
        customer_name: `${row.customer?.first_name ?? ''} ${row.customer?.last_name ?? ''}`.trim(),
        staff_id: row.staff_id,
        staff_name: row.staff ? `${row.staff.first_name} ${row.staff.last_name}`.trim() : null,
        rental_id: row.rental_id,
        film: row.rental?.inventory?.film?.title ?? null,
        amount: row.amount,
        payment_date: row.payment_date
    };
}

async function nextPaymentId(): Promise<number> {
    const [row] = await db.select({ value: max(payment.payment_id) }).from(payment);
    return (row?.value ?? 0) + 1;
}

export type CreatePaymentResult =
    | { ok: true; data: { payment_id: number; customer_id: number; amount: string; payment_date: Date } }
    | { ok: false; reason: 'customer-not-found' | 'staff-not-found' | 'rental-not-found' };

export async function createPayment(rawInput: PaymentInput): Promise<CreatePaymentResult> {
    const input = createPaymentValidation.parse(rawInput);

    const customerRow = await db.select({ customer_id: customer.customer_id }).from(customer)
        .where(eq(customer.customer_id, input.customer_id)).limit(1);
    if (customerRow.length === 0) return { ok: false, reason: 'customer-not-found' };

    if (input.staff_id !== undefined && input.staff_id !== null) {
        const s = await db.select({ staff_id: staff.staff_id }).from(staff)
            .where(eq(staff.staff_id, input.staff_id)).limit(1);
        if (s.length === 0) return { ok: false, reason: 'staff-not-found' };
    }
    if (input.rental_id !== undefined && input.rental_id !== null) {
        const r = await db.select({ rental_id: rental.rental_id }).from(rental)
            .where(eq(rental.rental_id, input.rental_id)).limit(1);
        if (r.length === 0) return { ok: false, reason: 'rental-not-found' };
    }

    const paymentId = await nextPaymentId();
    const [created] = await db.insert(payment).values({
        payment_id: paymentId,
        customer_id: input.customer_id,
        staff_id: input.staff_id ?? null,
        rental_id: input.rental_id ?? null,
        amount: input.amount.toString(),
        payment_date: input.payment_date
    }).returning({
        payment_id: payment.payment_id,
        customer_id: payment.customer_id,
        amount: payment.amount,
        payment_date: payment.payment_date
    });

    return { ok: true, data: created };
}

export type UpdatePaymentResult =
    | { ok: true; data: { payment_id: number; customer_id: number; amount: string; payment_date: Date } }
    | { ok: false; reason: 'not-found' | 'customer-not-found' | 'staff-not-found' | 'rental-not-found' };

export async function updatePayment(id: number, rawInput: PaymentUpdateInput): Promise<UpdatePaymentResult> {
    const input = updatePaymentValidation.parse(rawInput);

    const existing = await db.select({ payment_id: payment.payment_id }).from(payment)
        .where(eq(payment.payment_id, id)).limit(1);
    if (existing.length === 0) return { ok: false, reason: 'not-found' };

    if (input.customer_id !== undefined) {
        const c = await db.select({ customer_id: customer.customer_id }).from(customer)
            .where(eq(customer.customer_id, input.customer_id)).limit(1);
        if (c.length === 0) return { ok: false, reason: 'customer-not-found' };
    }
    if (input.staff_id !== undefined && input.staff_id !== null) {
        const s = await db.select({ staff_id: staff.staff_id }).from(staff)
            .where(eq(staff.staff_id, input.staff_id)).limit(1);
        if (s.length === 0) return { ok: false, reason: 'staff-not-found' };
    }
    if (input.rental_id !== undefined && input.rental_id !== null) {
        const r = await db.select({ rental_id: rental.rental_id }).from(rental)
            .where(eq(rental.rental_id, input.rental_id)).limit(1);
        if (r.length === 0) return { ok: false, reason: 'rental-not-found' };
    }

    const set: Record<string, unknown> = {};
    if (input.customer_id !== undefined) set.customer_id = input.customer_id;
    if (input.staff_id !== undefined) set.staff_id = input.staff_id ?? null;
    if (input.rental_id !== undefined) set.rental_id = input.rental_id ?? null;
    if (input.amount !== undefined) set.amount = input.amount.toString();
    if (input.payment_date !== undefined) set.payment_date = input.payment_date;

    const [updated] = await db.update(payment).set(set).where(eq(payment.payment_id, id)).returning({
        payment_id: payment.payment_id,
        customer_id: payment.customer_id,
        amount: payment.amount,
        payment_date: payment.payment_date
    });

    return { ok: true, data: updated };
}

export type DeletePaymentResult =
    | { ok: true; deleted: boolean }
    | { ok: false; reason: 'not-found' };

export async function deletePayment(id: number): Promise<DeletePaymentResult> {
    const existing = await db.select({ payment_id: payment.payment_id }).from(payment)
        .where(eq(payment.payment_id, id)).limit(1);
    if (existing.length === 0) return { ok: false, reason: 'not-found' };

    const [deleted] = await db.delete(payment)
        .where(eq(payment.payment_id, id))
        .returning({ payment_id: payment.payment_id });
    return { ok: true, deleted: deleted !== undefined };
}

export async function getPaymentHistory(id: number) {
    const rows = await db
        .select({
            payment_id: payment.payment_id,
            title: film.title,
            first_name: customer.first_name,
            last_name: customer.last_name,
            amount: payment.amount,
            payment_date: payment.payment_date
        })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .innerJoin(rental, eq(payment.rental_id, rental.rental_id))
        .innerJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .innerJoin(film, eq(inventory.film_id, film.film_id))
        .where(eq(payment.customer_id, id))
        .orderBy(desc(payment.payment_date));
    return rows;
}