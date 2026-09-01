import { and, count, countDistinct, desc, eq, isNull, max, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { address, city, country, film, inventory, payment, rental, staff, store, waitlist } from '../db/schema.js';
import { staffExists } from './staffService.js';
import { getAddress } from './addressService.js';

export interface NewManagerStaff {
    first_name: string;
    last_name: string;
    email?: string | null;
}

export interface CreateStoreInput {
    manager_staff_id?: number;
    new_manager_staff?: NewManagerStaff;
    address_id: number;
}

function storeBase() {
    return db.select({
        store_id: store.store_id,
        active: store.active,
        manager: {
            staff_id: staff.staff_id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email
        },
        address: {
            address_id: address.address_id,
            address: address.address,
            address2: address.address2,
            district: address.district,
            postal_code: address.postal_code,
            phone: address.phone,
            city_id: address.city_id,
            city_name: city.city,
            country_name: country.country
        }
    })
        .from(store)
        .innerJoin(staff, eq(staff.staff_id, store.manager_staff_id))
        .innerJoin(address, eq(address.address_id, store.address_id))
        .innerJoin(city, eq(city.city_id, address.city_id))
        .innerJoin(country, eq(country.country_id, city.country_id));
}

async function countsByStore() {
    const [staffRows, inventoryRows] = await Promise.all([
        db.select({ store_id: staff.store_id, value: count() }).from(staff).groupBy(staff.store_id),
        db.select({ store_id: inventory.store_id, value: count() }).from(inventory).groupBy(inventory.store_id)
    ]);
    return {
        staffCount: new Map(staffRows.map(r => [r.store_id, r.value])),
        inventoryCount: new Map(inventoryRows.map(r => [r.store_id, r.value]))
    };
}

export async function listStores() {
    const [stores, counts] = await Promise.all([storeBase(), countsByStore()]);
    return stores.map(s => ({
        store_id: s.store_id,
        active: s.active,
        manager: s.manager,
        staffCount: counts.staffCount.get(s.store_id) ?? 0,
        inventoryCount: counts.inventoryCount.get(s.store_id) ?? 0,
        address: s.address
    }));
}

export async function getStore(id: number) {
    const rows = await storeBase().where(eq(store.store_id, id));
    if (rows.length === 0) return undefined;
    const s = rows[0];
    const counts = await countsByStore();
    return {
        ...s,
        staffCount: counts.staffCount.get(s.store_id) ?? 0,
        inventoryCount: counts.inventoryCount.get(s.store_id) ?? 0
    };
}

export async function nextStoreId() {
    const rows = await db.select({ m: max(store.store_id) }).from(store);
    return (rows[0]?.m ?? 0) + 1;
}

export async function storeIsActive(id: number) {
    const rows = await db.select({ active: store.active }).from(store).where(eq(store.store_id, id)).limit(1);
    return rows[0] === undefined ? undefined : rows[0].active;
}

async function managedStore(staffId: number) {
    const rows = await db.select({ store_id: store.store_id })
        .from(store)
        .where(eq(store.manager_staff_id, staffId))
        .limit(1);
    return rows[0]?.store_id;
}

async function nextStaffId() {
    const rows = await db.select({ m: max(staff.staff_id) }).from(staff);
    return (rows[0]?.m ?? 0) + 1;
}

function generateUsername(first: string, last: string): string {
    const base = `${first}.${last}`.toLowerCase().replace(/[^a-z0-9._]/g, '');
    const suffix = String(Date.now() % 10000);
    return `${base}${suffix}`.slice(0, 16);
}

async function hireStaff(input: NewManagerStaff, anchorStoreId: number): Promise<number> {
    const staffId = await nextStaffId();
    await db.insert(staff).values({
        staff_id: staffId,
        first_name: input.first_name,
        last_name: input.last_name,
        address_id: 1,
        email: input.email ?? null,
        store_id: anchorStoreId,
        active: true,
        username: generateUsername(input.first_name, input.last_name),
        password: 'x8',
        last_update: new Date()
    });
    return staffId;
}

async function syncManagerStore(staffId: number, storeId: number) {
    await db.update(staff).set({ store_id: storeId })
        .where(eq(staff.staff_id, staffId));
}

export async function createStore(input: CreateStoreInput) {
    if ((await getAddress(input.address_id)) === undefined) return 'address-not-found';

    const id = await nextStoreId();

    let managerStaffId: number;
    if (input.new_manager_staff !== undefined) {
        // staff.store_id has an FK to store, and the new store doesn't exist yet,
        // so the hired manager starts anchored to store 1 and is moved after insert.
        managerStaffId = await hireStaff(input.new_manager_staff, 1);
    } else if (input.manager_staff_id !== undefined) {
        if (!(await staffExists(input.manager_staff_id))) return 'staff-not-found';
        if ((await managedStore(input.manager_staff_id)) !== undefined) return 'manager-assigned';
        managerStaffId = input.manager_staff_id;
    } else {
        return 'manager-missing';
    }

    await db.insert(store).values({
        store_id: id,
        manager_staff_id: managerStaffId,
        address_id: input.address_id,
        last_update: new Date()
    });

    await syncManagerStore(managerStaffId, id);

    return getStore(id);
}

export interface UpdateStoreInput {
    manager_staff_id?: number;
    address_id?: number;
    active?: boolean;
}

export async function updateStore(id: number, patch: UpdateStoreInput) {
    const existing = await storeBase().where(eq(store.store_id, id));
    if (existing.length === 0) return undefined;

    if (patch.address_id !== undefined && !(await getAddress(patch.address_id))) return 'address-not-found';

    if (patch.manager_staff_id !== undefined) {
        if (!(await staffExists(patch.manager_staff_id))) return 'staff-not-found';
        if (patch.manager_staff_id !== existing[0].manager.staff_id) {
            const other = await managedStore(patch.manager_staff_id);
            if (other !== undefined && other !== id) return 'manager-assigned';
        }
    }

    await db.update(store).set({
        ...(patch.manager_staff_id !== undefined ? { manager_staff_id: patch.manager_staff_id } : {}),
        ...(patch.address_id !== undefined ? { address_id: patch.address_id } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
        last_update: new Date()
    }).where(eq(store.store_id, id));

    if (patch.manager_staff_id !== undefined && patch.manager_staff_id !== existing[0].manager.staff_id) {
        await syncManagerStore(patch.manager_staff_id, id);
    } else if (patch.active === undefined) {
        await syncManagerStore(existing[0].manager.staff_id, id);
    }

    return getStore(id);
}

export async function deleteStore(id: number) {
    const rows = await db.select({ store_id: store.store_id }).from(store).where(eq(store.store_id, id));
    if (rows.length === 0) return undefined;

    const [inventoryCount, staffCount, waitlistCount] = await Promise.all([
        db.select({ value: count() }).from(inventory).where(eq(inventory.store_id, id)),
        db.select({ value: count() }).from(staff).where(eq(staff.store_id, id)),
        db.select({ value: count() }).from(waitlist).where(eq(waitlist.store_id, id))
    ]);
    if (inventoryCount[0].value > 0 || staffCount[0].value > 0 || waitlistCount[0].value > 0) {
        return 'in-use';
    }

    await db.delete(store).where(eq(store.store_id, id));
    return 'deleted';
}

export async function getStoreStats(id: number) {
    const [staffCount, inventoryCount, totalRentals, activeRentals, revenueRows, distinctFilms, topFilms] = await Promise.all([
        db.select({ value: count() }).from(staff).where(eq(staff.store_id, id)),
        db.select({ value: count() }).from(inventory).where(eq(inventory.store_id, id)),
        db.select({ value: count() }).from(rental)
            .innerJoin(inventory, eq(inventory.inventory_id, rental.inventory_id))
            .where(eq(inventory.store_id, id)),
        db.select({ value: count() }).from(rental)
            .innerJoin(inventory, eq(inventory.inventory_id, rental.inventory_id))
            .where(and(eq(inventory.store_id, id), isNull(rental.return_date))),
        db.select({ value: sql<string>`coalesce(sum(${payment.amount}), 0)` }).from(payment)
            .innerJoin(rental, eq(payment.rental_id, rental.rental_id))
            .innerJoin(inventory, eq(inventory.inventory_id, rental.inventory_id))
            .where(eq(inventory.store_id, id)),
        db.select({ value: countDistinct(inventory.film_id) }).from(inventory).where(eq(inventory.store_id, id)),
        db.select({ title: film.title, rentals: count() }).from(rental)
            .innerJoin(inventory, eq(inventory.inventory_id, rental.inventory_id))
            .innerJoin(film, eq(film.film_id, inventory.film_id))
            .where(eq(inventory.store_id, id))
            .groupBy(film.film_id, film.title)
            .orderBy(desc(count()))
            .limit(5)
    ]);

    return {
        store_id: id,
        staffCount: staffCount[0].value,
        inventoryCount: inventoryCount[0].value,
        totalRentals: totalRentals[0].value,
        activeRentals: activeRentals[0].value,
        revenue: Number(revenueRows[0].value),
        distinctFilms: distinctFilms[0].value,
        topFilms
    };
}