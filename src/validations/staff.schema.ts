import { z } from 'zod';

export const createStaffValidation = z.object({
    first_name: z.string().trim().min(1, 'First name is required').max(45),
    last_name: z.string().trim().min(1, 'Last name is required').max(45),
    email: z.string().email('Invalid email format').max(50).nullable().optional(),
    store_id: z.number().int().positive('Store is required'),
    address_id: z.number().int().positive('Address is required'),
    username: z.string().trim().min(1, 'Username is required').max(16),
    password: z.string().min(1, 'Password is required').max(255),
    active: z.boolean().default(true)
});

export const updateStaffValidation = createStaffValidation.partial();

export type StaffInput = z.infer<typeof createStaffValidation>;
export type StaffUpdateInput = z.infer<typeof updateStaffValidation>;
