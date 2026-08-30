import { relations } from 'drizzle-orm';
import { pgTable, serial, varchar, smallint, numeric, integer, timestamp, text, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const film = pgTable('film', {
    film_id: serial('film_id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    release_year: smallint('release_year'),
    language_id: smallint('language_id').notNull().references(() => language.language_id),
    rental_rate: numeric('rental_rate', { precision: 4, scale: 2 }).notNull().default('4.99'),
    last_update: timestamp('last_update', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const inventory = pgTable('inventory', {
    inventory_id: serial('inventory_id').primaryKey(),
    film_id: integer('film_id').notNull(),
    store_id: smallint('store_id').notNull()
});

export const rental = pgTable('rental', {
    rental_id: serial('rental_id').primaryKey(),
    rental_date: timestamp('rental_date', { withTimezone: true, mode: 'date' }).notNull(),
    inventory_id: integer('inventory_id').notNull(),
    customer_id: integer('customer_id').notNull(),
    return_date: timestamp('return_date', { withTimezone: true, mode: 'date' })
});

export const customer = pgTable('customer', {
    customer_id: serial('customer_id').primaryKey(),
    first_name: varchar('first_name', { length: 45 }).notNull(),
    last_name: varchar('last_name', { length: 45 }).notNull(),
    email: varchar('email', { length: 50 }).notNull(),
    active: boolean('active').notNull().default(true),
    store_id: smallint('store_id').notNull()
});

export const language = pgTable('language', {
    language_id: smallint('language_id').primaryKey(),
    name: varchar('name', { length: 20 }).notNull()
});

export const category = pgTable('category', {
    category_id: serial('category_id').primaryKey(),
    name: varchar('name', { length: 25 }).notNull()
});

export const filmCategory = pgTable('film_category', {
    film_id: integer('film_id').notNull().references(() => film.film_id),
    category_id: integer('category_id').notNull().references(() => category.category_id)
}, (t) => [primaryKey({ columns: [t.film_id, t.category_id] })]);

export const staff = pgTable('staff', {
    staff_id: smallint('staff_id').primaryKey(),
    first_name: varchar('first_name', { length: 45 }).notNull(),
    last_name: varchar('last_name', { length: 45 }).notNull(),
    email: varchar('email', { length: 50 }),
    store_id: smallint('store_id').notNull(),
    active: boolean('active').notNull().default(true),
    username: varchar('username', { length: 16 }).notNull(),
    password: varchar('password', { length: 255 }).notNull()
});

export const actor = pgTable('actor', {
    actor_id: serial('actor_id').primaryKey(),
    first_name: varchar('first_name', { length: 45 }).notNull(),
    last_name: varchar('last_name', { length: 45 }).notNull()
});

export const filmActor = pgTable('film_actor', {
    actor_id: integer('actor_id').notNull().references(() => actor.actor_id),
    film_id: integer('film_id').notNull().references(() => film.film_id)
}, (t) => [primaryKey({ columns: [t.actor_id, t.film_id] })]);

export const filmRelations = relations(film, ({ one }) => ({
    language: one(language, {
        fields: [film.language_id],
        references: [language.language_id]
    })
}));

export const languageRelations = relations(language, ({ many }) => ({
    films: many(film)
}));


export const categoryRelations = relations(category, ({ many }) => ({
    films: many(filmCategory)
}));

export const filmCategoryRelations = relations(filmCategory, ({ one }) => ({
    film: one(film, { fields: [filmCategory.film_id], references: [film.film_id] }),
    category: one(category, { fields: [filmCategory.category_id], references: [category.category_id] })
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
    film: one(film, { fields: [inventory.film_id], references: [film.film_id] })
}));

export const rentalRelations = relations(rental, ({ one }) => ({
    inventory: one(inventory, { fields: [rental.inventory_id], references: [inventory.inventory_id] }),
    customer: one(customer, { fields: [rental.customer_id], references: [customer.customer_id] })
}));

export const customerRelations = relations(customer, ({ many }) => ({
    rentals: many(rental)
}));

export const actorRelations = relations(actor, ({ many }) => ({
    films: many(filmActor)
}));

export const filmActorRelations = relations(filmActor, ({ one }) => ({
    actor: one(actor, { fields: [filmActor.actor_id], references: [actor.actor_id] }),
    film: one(film, { fields: [filmActor.film_id], references: [film.film_id] })
}));