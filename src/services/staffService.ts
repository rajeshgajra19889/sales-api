import { and, asc, count, desc, eq, ilike, max, ne, or, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { address, payment, rental, staff, store } from '../db/schema.js';
import { PgColumn } from 'drizzle-orm/pg-core';
import { hashPassword } from '../auth/password.js';
import { createStaffValidation, updateStaffValidation, type StaffInput, type StaffUpdateInput } from '../validations/staff.schema.js';

export type StaffSort = 'staff_id' | 'first_name' | 'last_name' | 'email';

export interface StaffQuery {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: StaffSort;
    sortOrder?: 'asc' | 'desc';
}

const SORTABLE: Record<StaffSort, PgColumn> = {
    staff_id: staff.staff_id,
    first_name: staff.first_name,
    last_name: staff.last_name,
    email: staff.email
};
export async function listStaff(q: StaffQuery) {
    const page = Math.max(q.page, 1);
    const pageSize = Math.min(Math.max(q.pageSize, 1), 100);
    const like = `%${(q.search ?? '').trim().toLowerCase()}%`;
    const where = q.search?.trim()
        ? or(
            ilike(staff.first_name, like),
            ilike(staff.last_name, like),
            ilike(staff.email, like)
        )
        : undefined;
    const order = q.sortOrder === 'desc'
        ? desc(SORTABLE[q.sortBy ?? 'staff_id'])
        : asc(SORTABLE[q.sortBy ?? 'staff_id']);

    const [rows, [{ value: total }]] = await Promise.all([
        db.select({
            staff_id: staff.staff_id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email,
            address: address.address,
            username:staff.username
        })
            .from(staff)
            .innerJoin(address, eq(staff.address_id, address.address_id))
            .innerJoin(store, eq(staff.store_id, store.store_id))
            .where(where)
            .orderBy(order)
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ value: count() })
            .from(staff)
            .innerJoin(address, eq(staff.address_id, address.address_id))
            .innerJoin(store, eq(store.store_id, staff.store_id))
            .where(where)
    ]);
    return { items: rows, total, page, pageSize };
}

export async function staffExists(staffId: number) {
    const rows = await db.select({ staff_id: staff.staff_id })
        .from(staff)
        .where(eq(staff.staff_id, staffId))
        .limit(1);
    return rows.length > 0;
}

export async function getStaffById(id: number) {
    const row = await db.query.staff.findFirst({
        where: eq(staff.staff_id, id),
        with: {
            address: {
                with: {
                    city: {
                        with: {
                            country: true
                        }
                    }
                }
            }
        }
    });
    if (!row) return undefined;
    return {
        staff_id: row.staff_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        store_id: row.store_id,
        active: row.active,
        username: row.username,
        address_id: row.address_id,
        address: row.address ? {
            address_id: row.address.address_id,
            address: row.address.address,
            district: row.address.district,
            city_name: row.address.city?.city ?? '',
            country_name: row.address.city?.country?.country ?? ''
        } : null
    };
}

async function nextStaffId(): Promise<number> {
    const [row] = await db.select({ value: max(staff.staff_id) }).from(staff);
    return (row?.value ?? 0) + 1;
}

export type CreateStaffResult =
    | { ok: true; data: { staff_id: number; first_name: string; last_name: string; email: string | null; username: string } }
    | { ok: false; reason: 'username-taken' | 'store-not-found' | 'address-not-found' };

export async function createStaff(rawInput: StaffInput): Promise<CreateStaffResult> {
    const input = createStaffValidation.parse(rawInput);

    const existing = await db
        .select({ username: staff.username })
        .from(staff)
        .where(eq(staff.username, input.username))
        .limit(1);
    if (existing.length > 0) return { ok: false, reason: 'username-taken' };

    const storeRow = await db.select({ store_id: store.store_id }).from(store).where(eq(store.store_id, input.store_id)).limit(1);
    if (storeRow.length === 0) return { ok: false, reason: 'store-not-found' };

    const addrRow = await db.select({ address_id: address.address_id }).from(address).where(eq(address.address_id, input.address_id)).limit(1);
    if (addrRow.length === 0) return { ok: false, reason: 'address-not-found' };

    const staffId = await nextStaffId();
    const hashed = await hashPassword(input.password);

    const [created] = await db.insert(staff).values({
        staff_id: staffId,
        first_name: input.first_name,
        last_name: input.last_name,
        address_id: input.address_id,
        email: input.email ?? null,
        store_id: input.store_id,
        active: input.active,
        username: input.username,
        password: hashed,
        last_update: new Date()
    }).returning({
        staff_id: staff.staff_id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        username: staff.username
    });

    return { ok: true, data: created };
}

export type UpdateStaffResult =
    | { ok: true; data: { staff_id: number; first_name: string; last_name: string; email: string | null; username: string; active: boolean } }
    | { ok: false; reason: 'not-found' | 'username-taken' | 'store-not-found' | 'address-not-found' };

export async function updateStaff(id: number, rawInput: StaffUpdateInput): Promise<UpdateStaffResult> {
    const input = updateStaffValidation.parse(rawInput);

    const existing = await db.select({ staff_id: staff.staff_id }).from(staff).where(eq(staff.staff_id, id)).limit(1);
    if (existing.length === 0) return { ok: false, reason: 'not-found' };

    if (input.username !== undefined) {
        const owner = await db.select({ staff_id: staff.staff_id }).from(staff)
            .where(and(eq(staff.username, input.username), ne(staff.staff_id, id))).limit(1);
        if (owner.length > 0) return { ok: false, reason: 'username-taken' };
    }
    if (input.store_id !== undefined) {
        const s = await db.select({ store_id: store.store_id }).from(store).where(eq(store.store_id, input.store_id)).limit(1);
        if (s.length === 0) return { ok: false, reason: 'store-not-found' };
    }
    if (input.address_id !== undefined) {
        const a = await db.select({ address_id: address.address_id }).from(address).where(eq(address.address_id, input.address_id)).limit(1);
        if (a.length === 0) return { ok: false, reason: 'address-not-found' };
    }

    const set: Record<string, unknown> = { last_update: new Date() };
    if (input.first_name !== undefined) set.first_name = input.first_name;
    if (input.last_name !== undefined) set.last_name = input.last_name;
    if (input.email !== undefined) set.email = input.email ?? null;
    if (input.store_id !== undefined) set.store_id = input.store_id;
    if (input.address_id !== undefined) set.address_id = input.address_id;
    if (input.active !== undefined) set.active = input.active;
    if (input.username !== undefined) set.username = input.username;
    if (input.password !== undefined) set.password = await hashPassword(input.password);

    const [updated] = await db.update(staff).set(set).where(eq(staff.staff_id, id)).returning({
        staff_id: staff.staff_id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        username: staff.username,
        active: staff.active
    });

    return { ok: true, data: updated };
}

export type DeleteStaffResult =
    | { ok: true; deleted: boolean }
    | { ok: false; reason: 'not-found' };

export async function deleteStaff(id: number): Promise<DeleteStaffResult> {
    const existing = await db.select({ staff_id: staff.staff_id }).from(staff)
        .where(eq(staff.staff_id, id)).limit(1);
    if (existing.length === 0) return { ok: false, reason: 'not-found' };

    const [deleted] = await db.delete(staff)
        .where(eq(staff.staff_id, id))
        .returning({ staff_id: staff.staff_id });
    return { ok: true, deleted: deleted !== undefined };
}

export interface StaffPerformanceRow {
    staff_id: number;
    name: string;
    email: string | null;
    store_id: number;
    payments: number;
    revenue: number;
    rentals: number;
}

export async function getStaffPerformance(): Promise<StaffPerformanceRow[]> {
    const [staffRows, rentalRows] = await Promise.all([
        db.select({
            staff_id: staff.staff_id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email,
            store_id: staff.store_id,
            payments: count(payment.payment_id),
            revenue: sql<string>`coalesce(sum(${payment.amount}), 0)`
        }).from(staff)
            .leftJoin(payment, eq(payment.staff_id, staff.staff_id))
            .groupBy(staff.staff_id),
        db.select({ staff_id: payment.staff_id, value: count() }).from(rental)
            .innerJoin(payment, eq(payment.rental_id, rental.rental_id))
            .groupBy(payment.staff_id)
    ]);

    const rentalMap = new Map(rentalRows.map(r => [r.staff_id, r.value]));

    return staffRows
        .map(r => ({
            staff_id: r.staff_id,
            name: `${r.first_name} ${r.last_name}`,
            email: r.email,
            store_id: r.store_id,
            payments: r.payments,
            revenue: Number(r.revenue),
            rentals: rentalMap.get(r.staff_id) ?? 0
        }))
        .sort((a, b) => b.revenue - a.revenue);
}