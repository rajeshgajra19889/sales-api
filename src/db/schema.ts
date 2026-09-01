import { relations } from 'drizzle-orm';
import { pgTable, serial, varchar, smallint, numeric, integer, timestamp, text, boolean, date, primaryKey } from 'drizzle-orm/pg-core';

export const film = pgTable('film', {
    film_id: serial('film_id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    release_year: smallint('release_year'),
    language_id: smallint('language_id').notNull().references(() => language.language_id),
    rental_duration: smallint('rental_duration').notNull().default(3),
    rental_rate: numeric('rental_rate', { precision: 4, scale: 2 }).notNull().default('4.99'),
    length: smallint('length'),
    replacement_cost: numeric('replacement_cost', { precision: 5, scale: 2 }).notNull().default('19.99'),
    rating: varchar('rating', { length: 10 }).notNull().default('G'),
    special_features: text('special_features').array(),
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
    activebool: boolean('activebool').notNull().default(true),
    active: integer('active'),
    create_date: date('create_date'),
    last_update: timestamp('last_update', { withTimezone: false, mode: 'date' }),
    store_id: smallint('store_id').notNull(),
    address_id: integer('address_id').notNull()
});

export const payment = pgTable('payment', {
    payment_id: integer('payment_id').primaryKey(),
    customer_id: integer('customer_id').notNull(),
    staff_id: integer('staff_id'),
    rental_id: integer('rental_id'),
    amount: numeric('amount').notNull(),
    payment_date: timestamp('payment_date', { mode: 'date' }).notNull()
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
    address_id: smallint('address_id').notNull(),
    email: varchar('email', { length: 50 }),
    store_id: smallint('store_id').notNull(),
    active: boolean('active').notNull().default(true),
    username: varchar('username', { length: 16 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    last_update: timestamp('last_update', { mode: 'date' }).notNull()
});

export const country = pgTable('country', {
    country_id: integer('country_id').primaryKey(),
    country: varchar('country', { length: 50 }).notNull(),
    last_update: timestamp('last_update', { mode: 'date' }).notNull()
});

export const city = pgTable('city', {
    city_id: integer('city_id').primaryKey(),
    city: varchar('city', { length: 50 }).notNull(),
    country_id: integer('country_id').notNull().references(() => country.country_id),
    last_update: timestamp('last_update', { mode: 'date' }).notNull()
});

export const address = pgTable('address', {
    address_id: integer('address_id').primaryKey(),
    address: varchar('address', { length: 50 }).notNull(),
    address2: varchar('address2', { length: 50 }),
    district: varchar('district', { length: 20 }).notNull(),
    city_id: integer('city_id').notNull().references(() => city.city_id),
    postal_code: varchar('postal_code', { length: 10 }),
    phone: varchar('phone', { length: 20 }).notNull(),
    last_update: timestamp('last_update', { mode: 'date' }).notNull()
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

export const store = pgTable('store', {
    store_id: smallint('store_id').primaryKey(),
    manager_staff_id: integer('manager_staff_id').notNull().references(() => staff.staff_id),
    address_id: integer('address_id').notNull().references(() => address.address_id),
    active: boolean('active').notNull().default(true),
    last_update: timestamp('last_update', { mode: 'date' }).notNull()
})

export const holds = pgTable('holds', {
    hold_id: serial('hold_id').primaryKey(),
    inventory_id: integer('inventory_id').notNull().references(() => inventory.inventory_id, { onDelete: 'cascade' }),
    customer_id: integer('customer_id').notNull().references(() => customer.customer_id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const waitlist = pgTable('waitlist', {
    waitlist_id: serial('waitlist_id').primaryKey(),
    film_id: integer('film_id').notNull().references(() => film.film_id, { onDelete: 'cascade' }),
    customer_id: integer('customer_id').notNull().references(() => customer.customer_id, { onDelete: 'cascade' }),
    store_id: smallint('store_id'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const filmRelations = relations(film, ({ one, many }) => ({
    language: one(language, {
        fields: [film.language_id],
        references: [language.language_id]
    }),
    waitlist: many(waitlist)
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

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
    film: one(film, { fields: [inventory.film_id], references: [film.film_id] }),
    rentals: many(rental),
    holds: many(holds)
}));

export const rentalRelations = relations(rental, ({ one, many }) => ({
    inventory: one(inventory, { fields: [rental.inventory_id], references: [inventory.inventory_id] }),
    customer: one(customer, { fields: [rental.customer_id], references: [customer.customer_id] }),
    payments: many(payment)
}));

export const customerRelations = relations(customer, ({ many, one }) => ({
    rentals: many(rental),
    holds: many(holds),
    waitlist: many(waitlist),
    payments: many(payment),
    store: one(store, { fields: [customer.store_id], references: [store.store_id] })
}));

export const holdsRelations = relations(holds, ({ one }) => ({
    inventory: one(inventory, { fields: [holds.inventory_id], references: [inventory.inventory_id] }),
    customer: one(customer, { fields: [holds.customer_id], references: [customer.customer_id] })
}));

export const waitlistRelations = relations(waitlist, ({ one }) => ({
    film: one(film, { fields: [waitlist.film_id], references: [film.film_id] }),
    customer: one(customer, { fields: [waitlist.customer_id], references: [customer.customer_id] })
}));

export const actorRelations = relations(actor, ({ many }) => ({
    films: many(filmActor)
}));

export const filmActorRelations = relations(filmActor, ({ one }) => ({
    actor: one(actor, { fields: [filmActor.actor_id], references: [actor.actor_id] }),
    film: one(film, { fields: [filmActor.film_id], references: [film.film_id] })
}));

export const storeRelations = relations(store, ({ one, many }) => ({
    manager: one(staff, { fields: [store.manager_staff_id], references: [staff.staff_id] }),
    staff: many(staff),
    address: one(address, { fields: [store.address_id], references: [address.address_id] })
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
    store: one(store, { fields: [staff.store_id], references: [store.store_id] }),
    address: one(address, { fields: [staff.address_id], references: [address.address_id] }),
    payments: many(payment)
}));

export const countryRelations = relations(country, ({ many }) => ({
    cities: many(city)
}));

export const cityRelations = relations(city, ({ one, many }) => ({
    country: one(country, { fields: [city.country_id], references: [country.country_id] }),
    addresses: many(address)
}));

export const addressRelations = relations(address, ({ one, many }) => ({
    city: one(city, { fields: [address.city_id], references: [city.city_id] }),
    stores: many(store)
}));

export const paymentRelations = relations(payment, ({ one }) => ({
    customer: one(customer, { fields: [payment.customer_id], references: [customer.customer_id] }),
    staff: one(staff, { fields: [payment.staff_id], references: [staff.staff_id] }),
    rental: one(rental, { fields: [payment.rental_id], references: [rental.rental_id] })
}));

