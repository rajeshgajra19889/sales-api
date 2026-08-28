import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema.js';

const pool = new pg.Pool();
export const db = drizzle(pool, { schema });
export default pool;