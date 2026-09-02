import { and, asc, count, desc, eq, gte, lte, or, sql, sum, avg } from 'drizzle-orm';
import { type SQL } from 'drizzle-orm';
import { db } from '../db.js';
import { customer, inventory, payment, rental, staff } from '../db/schema.js';

export interface RevenueQuery {
    storeId?: number;
    customerId?: number;
    dateFrom?: string;
    dateTo?: string;
}

export interface RevenueReport {
    summary: {
        totalAmount: number;
        totalPayments: number;
        avgAmount: number;
    };
    byStore: {
        store_id: number;
        store_name: string;
        totalAmount: number;
        totalPayments: number;
    }[];
    monthly: {
        month: string;
        totalAmount: number;
        totalPayments: number;
    }[];
    topCustomers: {
        customer_id: number;
        name: string;
        totalAmount: number;
        totalPayments: number;
    }[];
}

function buildWhere(q: RevenueQuery): SQL | undefined {
    const conds: SQL[] = [];
    if (q.customerId !== undefined) conds.push(eq(payment.customer_id, q.customerId));
    if (q.storeId !== undefined) {
        conds.push(or(eq(staff.store_id, q.storeId), eq(inventory.store_id, q.storeId))!);
    }
    if (q.dateFrom) conds.push(gte(payment.payment_date, new Date(`${q.dateFrom}T00:00:00`)));
    if (q.dateTo) conds.push(lte(payment.payment_date, new Date(`${q.dateTo}T23:59:59.999`)));
    return conds.length ? and(...conds) : undefined;
}

export async function getRevenueReport(q: RevenueQuery): Promise<RevenueReport> {
    const where = buildWhere(q);

    const [summaryRow] = await db.select({
        totalAmount: sum(payment.amount).mapWith(Number),
        totalPayments: count(),
        avgAmount: avg(payment.amount).mapWith(Number)
    })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
        .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
        .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .where(where);

    const storeExpr = sql<number>`COALESCE(${staff.store_id}, ${inventory.store_id})`;
    const byStore = await db.select({
        store_id: storeExpr,
        store_name: sql<string>`'Store ' || ${storeExpr}`,
        totalAmount: sum(payment.amount).mapWith(Number),
        totalPayments: count()
    })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
        .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
        .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .where(where)
        .groupBy(storeExpr)
        .orderBy(desc(sum(payment.amount)));

    const monthExpr = sql<string>`to_char(${payment.payment_date}, 'YYYY-MM')`;
    const monthly = await db.select({
        month: monthExpr,
        totalAmount: sum(payment.amount).mapWith(Number),
        totalPayments: count()
    })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
        .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
        .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .where(where)
        .groupBy(monthExpr)
        .orderBy(asc(monthExpr));

    const topCustomers = await db.select({
        customer_id: payment.customer_id,
        name: sql<string>`${customer.first_name} || ' ' || ${customer.last_name}`,
        totalAmount: sum(payment.amount).mapWith(Number),
        totalPayments: count()
    })
        .from(payment)
        .innerJoin(customer, eq(payment.customer_id, customer.customer_id))
        .leftJoin(staff, eq(payment.staff_id, staff.staff_id))
        .leftJoin(rental, eq(payment.rental_id, rental.rental_id))
        .leftJoin(inventory, eq(rental.inventory_id, inventory.inventory_id))
        .where(where)
        .groupBy(payment.customer_id, customer.first_name, customer.last_name)
        .orderBy(desc(sum(payment.amount)))
        .limit(10);

    return {
        summary: {
            totalAmount: summaryRow?.totalAmount ?? 0,
            totalPayments: summaryRow?.totalPayments ?? 0,
            avgAmount: summaryRow?.avgAmount ?? 0
        },
        byStore,
        monthly,
        topCustomers
    };
}