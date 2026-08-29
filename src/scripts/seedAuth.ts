import pool from '../db.js';
import { hashPassword } from '../auth/password.js';

const USERNAME = 'Mike';
const PASSWORD = 'Admin@123';

const hash = await hashPassword(PASSWORD);
const result = await pool.query(
    `UPDATE staff SET password = $1 WHERE username = $2`,
    [hash, USERNAME]
);
console.log(`Seeded ${result.rowCount} staff row(s) for '${USERNAME}' with a scrypt hash.`);
await pool.end();