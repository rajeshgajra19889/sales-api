import { z } from 'zod';

// Define the validation rules
export const createCustomerValidation = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format").optional(),
  address_id: z.number().int().positive("Address ID must be a positive number"),
  store_id: z.number().int().positive("Store ID must be a positive number"),
  activebool: z.boolean().default(true),
  // Let the database handle create_date and last_update via DEFAULT, 
  // but allow them to be passed if needed.
  create_date: z.coerce.date().optional(),
  last_update: z.coerce.date().optional(),
});

// Partial schema for UPDATE operations: every field is optional,
// but any that ARE present must still match the same rules as create.
export const updateCustomerValidation = z.object({
  first_name: z.string().min(1, "First name is required").optional(),
  last_name: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  address_id: z.number().int().positive("Address ID must be a positive number").optional(),
  store_id: z.number().int().positive("Store ID must be a positive number").optional(),
  activebool: z.boolean().optional(),
});

// Automatically generate the TypeScript type from the schema!
// No need to manually write `export interface CustomerInput`
export type CustomerInput = z.infer<typeof createCustomerValidation>;
export type CustomerUpdateInput = z.infer<typeof updateCustomerValidation>;