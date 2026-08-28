import pool from '../db.js';

export async function listTopRented() {
    const result = await pool.query(
        `SELECT f.title, COUNT(r.rental_id) AS times_rented
           FROM rental r
           JOIN inventory i ON r.inventory_id = i.inventory_id
           JOIN film f ON i.film_id = f.film_id
          GROUP BY f.title
          ORDER BY times_rented DESC
          LIMIT 10`
    );

    return result.rows;
}