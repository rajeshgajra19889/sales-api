import { asc } from 'drizzle-orm';
import { db } from '../db.js';
import { customer } from '../db/schema.js';

export async function listCustomers() {
    const rows = await db
        .select({
            customer_id: customer.customer_id,
            first_name: customer.first_name,
            last_name: customer.last_name
        })
        .from(customer)
        .orderBy(asc(customer.customer_id))
        .limit(20);

    return rows;
}