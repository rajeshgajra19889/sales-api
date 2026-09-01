import { z } from 'zod';

export const createPaymentValidation = z.object({
    customer_id: z.number().int().positive('Customer is required'),
    staff_id: z.number().int().positive().nullable().optional(),
    rental_id: z.number().int().positive().nullable().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    payment_date: z.coerce.date('Payment date is required')
});

export const updatePaymentValidation = createPaymentValidation.partial();

export type PaymentInput = z.infer<typeof createPaymentValidation>;
export type PaymentUpdateInput = z.infer<typeof updatePaymentValidation>;