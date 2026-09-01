import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool();
(async () => {
    const { rows } = await pool.query(
        `SELECT column_name, is_nullable, data_type
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        ['payment']
    );
    for (const r of rows) {
        console.log(`${r.column_name.padEnd(18)} ${r.is_nullable === 'YES' ? 'NULLABLE      ' : 'NOT NULL      '} ${r.data_type}`);
    }
    await pool.end();
})();
