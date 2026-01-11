import { z } from 'zod';

export const SupplierAddressSchema = z.object({
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  billingAddress: SupplierAddressSchema.optional(),
});
