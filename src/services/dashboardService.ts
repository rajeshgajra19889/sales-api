import { count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { category, customer, film, filmCategory, inventory, rental } from '../db/schema.js';

export async function getStats() {
    const [films, customers, rentals, stock] = await Promise.all([
        db.select({ value: count() }).from(film),
        db.select({ value: count() }).from(customer),
        db.select({ value: count() }).from(rental),
        db.select({ value: count() }).from(inventory)
    ]);
    return {
        films: films[0].value,
        customers: customers[0].value,
        rentals: rentals[0].value,
        inventory: stock[0].value
    };
}

export async function getRentalsPerMonth() {
    const rows = await db.execute(sql`
        WITH latest AS (SELECT max(rental_date) AS d FROM rental)
        SELECT to_char(rental_date, 'YYYY-MM') AS month,
               count(*) AS rental_count
        FROM rental, latest
        WHERE rental_date >= date_trunc('month', latest.d - interval '11 months')
        GROUP BY to_char(rental_date, 'YYYY-MM')
        ORDER BY month ASC
    `);
    return rows.rows.map(r => ({ month: r.month, count: Number(r.rental_count) }));
}

export async function getTopCategories(limit = 5) {
    const rows = await db
        .select({ name: category.name, count: count() })
        .from(filmCategory)
        .innerJoin(category, eq(filmCategory.category_id, category.category_id))
        .groupBy(category.name)
        .orderBy(desc(count()))
        .limit(limit);
    return rows.map(r => ({ name: r.name, count: r.count }));
}

export async function getRecentRentals(limit = 8) {
    const rows = await db.query.rental.findMany({
        orderBy: (r, { desc }) => [desc(r.rental_date)],
        limit,
        with: {
            customer: { columns: { first_name: true, last_name: true } },
            inventory: {
                columns: { inventory_id: true },
                with: { film: { columns: { title: true } } }
            }
        }
    });
    return rows.map(r => ({
        rental_id: r.rental_id,
        rental_date: r.rental_date,
        customer: r.customer ? `${r.customer.first_name} ${r.customer.last_name}` : null,
        film: r.inventory?.film?.title ?? null
    }));
}