import { pgTable, serial, varchar, smallint, numeric, timestamp, text } from 'drizzle-orm/pg-core';

export const film = pgTable('film', {
    film_id: serial('film_id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    release_year: smallint('release_year'),
    language_id: smallint('language_id').notNull(),
    rental_rate: numeric('rental_rate', { precision: 4, scale: 2 }).notNull().default('4.99'),
    last_update: timestamp('last_update', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});