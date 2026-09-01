# Sakila Sales API

![Node.js](https://img.shields.io/badge/Node.js%2024-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express%205-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=jsonwebtokens)
![CI](https://github.com/rajeshgajra19889/sales-api/actions/workflows/ci.yml/badge.svg)

A strict-TypeScript REST API over the PostgreSQL **Sakila** database — built as a teaching project, structured like production: layered routes → controllers → services, typed end to end with **Drizzle ORM**.

## 🚀 Live demo

- **API (deployed):** <https://sales-api-rnz1.onrender.com/> — hosted on Render, backed by PostgreSQL on Neon
- **Frontend (deployed):** <https://sakila-angular.onrender.com/> — the Angular UI consuming this API
- **Demo login:** `Mike` / `Admin@123`

> Every route except `POST /auth/login` requires a JWT. Get one by logging in, then send it as `Authorization: Bearer <token>`.

## Stack

- **Node.js** v24 — runtime
- **Express 5** — HTTP framework
- **TypeScript** (strict mode, `NodeNext` module resolution)
- **Drizzle ORM** — typed query builder (every query is a builder, zero raw SQL at runtime)
- **PostgreSQL** — database (Sakila schema)
- **tsx** — watch-mode TypeScript dev runner
- **Deployed:** Render (free web service) + Neon (managed Postgres), private env vars only — no secrets in the repo

## Features

| Module | Endpoints | Notes |
|---|---|---|
| **Auth** | `/auth/login`, `/auth/me` | JWT issue + verify; scrypt password hashing |
| **Films** | `/films` CRUD, `/top-rented` | pagination, ILIKE search, sort, full CRUD |
| **Customers** | `/customers`, `/customers/:id`, `/payments/:id` | paginated list + payment history |
| **Actors** | `/actors` CRUD | pagination, search, sort |
| **Staff** | `/staff` CRUD | username checks, hashed passwords, store/address joins |
| **Rentals** | `/rentals`, `/rentals/:id` | join-backed list + detail (film, customer) |
| **Inventory** | `/inventory`, `/inventory/summary`, `/move`, `/renters` | stock control, move copies, list who rents what |
| **Stores** | `/stores` CRUD, `/stores/:id/stats` | plus address/city/staff lookups |
| **Reservations** | `/holds`, `/waitlist`, `/waitlist/promote` | hold + waitlist with promote flow |
| **Lookups** | `/addresses`, `/cities`, `/languages` | search-as-you-type for forms |
| **Dashboard** | `/dashboard/stats`, `/rentals-per-month`, `/top-categories`, `/recent-rentals` | aggregate queries |

### API envelope

Every list endpoint returns the same contract the frontend consumes:

```json
{ "items": [], "total": 1002, "page": 1, "pageSize": 10 }
```

## Getting started

**Prerequisites:** [PostgreSQL](https://www.postgresql.org/) with the [Sakila](https://dev.mysql.com/doc/sakila/en/) sample database imported.

```sh
npm install
cp .env.example .env   # then fill in PGUSER / PGPASSWORD / PGDATABASE / PGHOST / PGPORT
npm run dev            # tsx watch — hot reload
```

Build + run in production mode:

```sh
npm run build && npm start
```

## Project structure

```
src/
├── server.ts           # boot (listen)
├── app.ts              # Express switchboard: middleware + router mounts
├── db.ts               # pg pool + Drizzle client
├── db/schema.ts        # Drizzle table definitions + relations
├── middleware/auth.ts  # JWT guard
├── routes/             # URL → controller wiring
├── controllers/        # HTTP layer — parsing, status codes
├── services/           # data layer — Drizzle queries
├── validations/        # Zod input schemas
└── scripts/            # one-off maintenance (e.g. seeding)
```

## Why it's built this way

- **Part of a full-stack pair** — consumed by [Sakila Angular](https://github.com/rajeshgajra19889/sakila-angular). Both repos share one typed data contract (`{ items, total, page, pageSize }`), so a contract change surfaces as a compile error, never a runtime surprise.
- **Strict TypeScript end to end** — controllers, services, and ORM types agree at compile time.
- **Layered, not lumped** — routes know URLs, controllers know HTTP, services know SQL.
- **Deployed, not just committed** — CI (GitHub Actions) and a live Render + Neon deployment are the proof it runs outside a laptop.