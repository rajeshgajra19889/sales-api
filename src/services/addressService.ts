import { and, asc, count, desc, eq, ilike, max, or } from 'drizzle-orm';
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

async function nextCityId() {
    const rows = await db.select({ m: max(city.city_id) }).from(city);
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

export async function pagedAddresses(search: string | undefined, page: number, pageSize: number) {
    const cond = search
        ? or(
            ilike(address.address, `%${search}%`),
            ilike(address.district, `%${search}%`),
            ilike(city.city, `%${search}%`)
        )
        : undefined;
    const offset = (page - 1) * pageSize;
    const [items, [{ value: total }]] = await Promise.all([
        db.select(addressColumns)
            .from(address)
            .innerJoin(city, eq(address.city_id, city.city_id))
            .innerJoin(country, eq(city.country_id, country.country_id))
            .where(cond)
            .orderBy(desc(address.address_id))
            .limit(pageSize)
            .offset(offset),
        db.select({ value: count() })
            .from(address)
            .innerJoin(city, eq(address.city_id, city.city_id))
            .innerJoin(country, eq(city.country_id, country.country_id))
            .where(cond)
    ]);
    return { items, total };
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

export async function updateAddress(addressId: number, input: AddressInput) {
    const existing = await db.select({ address_id: address.address_id }).from(address)
        .where(eq(address.address_id, addressId)).limit(1);
    if (existing.length === 0) return 'address-not-found';

    const cityRow = await db.select({ city_id: city.city_id })
        .from(city)
        .where(eq(city.city_id, input.city_id))
        .limit(1);
    if (cityRow.length === 0) return 'city-not-found';

    await db.update(address).set({
        address: input.address,
        address2: input.address2 ?? null,
        district: input.district,
        city_id: input.city_id,
        postal_code: input.postal_code ?? null,
        phone: input.phone,
        last_update: new Date()
    }).where(eq(address.address_id, addressId));

    return getAddress(addressId);
}

export async function deleteAddress(addressId: number) {
    const existing = await db.select({ address_id: address.address_id }).from(address)
        .where(eq(address.address_id, addressId)).limit(1);
    if (existing.length === 0) return false;
    await db.delete(address).where(eq(address.address_id, addressId));
    return true;
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
        country_name: country.country,
        country_id: city.country_id
    }).from(city)
        .innerJoin(country, eq(city.country_id, country.country_id))
        .where(cond)
        .orderBy(asc(city.city))
        .limit(6);
}

export async function pagedCities(search: string | undefined, page: number, pageSize: number) {
    const cond = search
        ? or(
            ilike(city.city, `%${search}%`),
            ilike(country.country, `%${search}%`)
        )
        : undefined;
    const offset = (page - 1) * pageSize;
    const [items, [{ value: total }]] = await Promise.all([
        db.select({
            city_id: city.city_id,
            name: city.city,
            country_name: country.country,
            country_id: city.country_id
        }).from(city)
            .innerJoin(country, eq(city.country_id, country.country_id))
            .where(cond)
            .orderBy(asc(city.city))
            .limit(pageSize)
            .offset(offset),
        db.select({ value: count() })
            .from(city)
            .innerJoin(country, eq(city.country_id, country.country_id))
            .where(cond)
    ]);
    return { items, total };
}

export interface CityInput {
    name: string;
    country_id: number;
}

export async function getCity(cityId: number) {
    const rows = await db.select({
        city_id: city.city_id,
        name: city.city,
        country_id: city.country_id,
        country_name: country.country
    }).from(city)
        .innerJoin(country, eq(city.country_id, country.country_id))
        .where(eq(city.city_id, cityId))
        .limit(1);
    return rows[0] ?? undefined;
}

export async function createCity(input: CityInput) {
    const countryRow = await db.select({ country_id: country.country_id })
        .from(country)
        .where(eq(country.country_id, input.country_id))
        .limit(1);
    if (countryRow.length === 0) return 'country-not-found';

    const inserted = await db.insert(city).values({
        city_id: await nextCityId(),
        city: input.name,
        country_id: input.country_id,
        last_update: new Date()
    }).returning({ city_id: city.city_id });

    const id = inserted[0]?.city_id;
    return id ? getCity(id) : undefined;
}

export async function updateCity(cityId: number, input: CityInput) {
    const existing = await db.select({ city_id: city.city_id }).from(city)
        .where(eq(city.city_id, cityId)).limit(1);
    if (existing.length === 0) return 'city-not-found';

    const countryRow = await db.select({ country_id: country.country_id })
        .from(country)
        .where(eq(country.country_id, input.country_id))
        .limit(1);
    if (countryRow.length === 0) return 'country-not-found';

    await db.update(city).set({
        city: input.name,
        country_id: input.country_id,
        last_update: new Date()
    }).where(eq(city.city_id, cityId));

    return getCity(cityId);
}

export async function deleteCity(cityId: number) {
    const existing = await db.select({ city_id: city.city_id }).from(city)
        .where(eq(city.city_id, cityId)).limit(1);
    if (existing.length === 0) return false;
    await db.delete(city).where(eq(city.city_id, cityId));
    return true;
}

export async function listCountries() {
    const rows = await db.select().from(country).orderBy(asc(country.country));
    return rows.map(r => ({ country_id: r.country_id, name: r.country.trim() }));
}