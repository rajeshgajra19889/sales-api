import { relations } from 'drizzle-orm';
import { pgTable, serial, varchar, smallint, numeric,integer, timestamp, text } from 'drizzle-orm/pg-core';

export const film = pgTable('film', {
    film_id: serial('film_id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    release_year: smallint('release_year'),
    language_id: smallint('language_id').notNull().references(()=>language.language_id),
    rental_rate: numeric('rental_rate', { precision: 4, scale: 2 }).notNull().default('4.99'),
    last_update: timestamp('last_update', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const inventory = pgTable('inventory', {
    inventory_id: serial('inventory_id').primaryKey(),
    film_id: integer('film_id').notNull()
});

export const rental = pgTable('rental', {
    rental_id: serial('rental_id').primaryKey(),
    inventory_id: integer('inventory_id').notNull()
});

export const customer = pgTable('customer', {
    customer_id: serial('customer_id').primaryKey(),
    first_name: varchar('first_name', { length: 45 }).notNull(),
    last_name: varchar('last_name', { length: 45 }).notNull()
});

export const language = pgTable('language', {
    language_id: smallint('language_id').primaryKey(),
    name: varchar('name', { length: 20 }).notNull()
});

export const filmRelations = relations(film, ({ one }) => ({
    language: one(language, {
        fields: [film.language_id],
        references: [language.language_id]
    })
}));

export const languageRelations = relations(language, ({ many }) => ({
    films: many(film)
}));