import pool from '../db.js';

export async function listCustomers() {
    const result = await pool.query(
        'SELECT customer_id, first_name, last_name FROM customer ORDER BY customer_id LIMIT 20'
    );
    return result.rows;
}