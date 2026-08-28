import { count, desc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { film, inventory, rental } from '../db/schema.js';

export async function listTopRented() {
    const rows = await db
        .select({
            title: film.title,
            times_rented: count(rental.rental_id)
        })
        .from(rental)
        .innerJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .innerJoin(film, eq(inventory.film_id, film.film_id))
        .groupBy(film.title)
        .orderBy(desc(count(rental.rental_id)))
        .limit(10);

    return rows;
}