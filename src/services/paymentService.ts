import { desc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { customer, film, inventory, payment, rental } from '../db/schema.js';


export async function getPaymentHistory(id:number) {
    const rows = await db
        .select({
            payment_id: payment.payment_id,
            title: film.title,
            first_name:customer.first_name,
            last_name:customer.last_name,
            amount:payment.amount,
            payment_date: payment.payment_date
        })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .innerJoin(rental, eq(payment.rental_id, rental.rental_id))
        .innerJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .innerJoin(film, eq(inventory.film_id, film.film_id))
        .where(eq(payment.customer_id,id))
        .orderBy(desc(payment.payment_date));
    return rows;
}