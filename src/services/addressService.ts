import { asc, desc, eq, ilike, max, or } from 'drizzle-orm';
import { db } from '../db.js';
import { address, city, country } from '../db/schema.js';

const addressColumns = {
    address_id: address.address_id,
    address: address.address,
    address2: address.address2,
    district: address.district,
    postal_code: address.postal_code,
    phone: address.phone,
    city_id: address.city_id,
    city_name: city.city,
    country_name: country.country
};

async function nextAddressId() {
    const rows = await db.select({ m: max(address.address_id) }).from(address);
    return (rows[0]?.m ?? 0) + 1;
}

export async function listAddresses(search?: string) {
    const cond = search
        ? or(
            ilike(address.address, `%${search}%`),
            ilike(address.district, `%${search}%`),
            ilike(city.city, `%${search}%`)
        )
        : undefined;
    return db.select(addressColumns)
        .from(address)
        .innerJoin(city, eq(address.city_id, city.city_id))
        .innerJoin(country, eq(city.country_id, country.country_id))
        .where(cond)
        .orderBy(desc(address.address_id))
        .limit(10);
}

export async function getAddress(addressId: number) {
    const rows = await db.select(addressColumns)
        .from(address)
        .innerJoin(city, eq(address.city_id, city.city_id))
        .innerJoin(country, eq(city.country_id, country.country_id))
        .where(eq(address.address_id, addressId))
        .limit(1);
    return rows[0];
}

export interface AddressInput {
    address: string;
    address2?: string | null;
    district: string;
    city_id: number;
    postal_code?: string | null;
    phone: string;
}

export async function createAddress(input: AddressInput) {
    const cityRow = await db.select({ city_id: city.city_id })
        .from(city)
        .where(eq(city.city_id, input.city_id))
        .limit(1);
    if (cityRow.length === 0) return 'city-not-found';

    const inserted = await db.insert(address).values({
        address_id: await nextAddressId(),
        address: input.address,
        address2: input.address2 ?? null,
        district: input.district,
        city_id: input.city_id,
        postal_code: input.postal_code ?? null,
        phone: input.phone,
        last_update: new Date()
    }).returning({ address_id: address.address_id });

    const id = inserted[0]?.address_id;
    return id ? getAddress(id) : undefined;
}

export async function listCities(search?: string) {
    const cond = search
        ? or(
            ilike(city.city, `%${search}%`),
            ilike(country.country, `%${search}%`)
        )
        : undefined;
    return db.select({
        city_id: city.city_id,
        name: city.city,
        country_name: country.country
    }).from(city)
        .innerJoin(country, eq(city.country_id, country.country_id))
        .where(cond)
        .orderBy(asc(city.city))
        .limit(6);
}