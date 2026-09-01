import { sql } from 'drizzle-orm';
import { db } from '../db.js';

await db.execute(sql`
    CREATE TABLE IF NOT EXISTS holds (
        hold_id serial PRIMARY KEY,
        inventory_id integer NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
        customer_id integer NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
    )
`);

await db.execute(sql`
    CREATE TABLE IF NOT EXISTS waitlist (
        waitlist_id serial PRIMARY KEY,
        film_id integer NOT NULL REFERENCES film(film_id) ON DELETE CASCADE,
        customer_id integer NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        store_id smallint,
        created_at timestamptz NOT NULL DEFAULT now()
    )
`);

await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_holds_copy
        ON holds (inventory_id)
`);

console.log('Reservation tables ready: holds, waitlist (unique active-copy index via transaction purge).');
await db.$client.end();