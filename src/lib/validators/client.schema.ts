import { z } from "zod";

export const AddressSchema = z.object({
    addressLine: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().optional(),
    zipCode: z.string().min(3)
  });
  
  export const ClientSchema = z.object({
    clientNumber: z.string().min(2, "Client number is Required"),
    clientName: z.string().min(2, "Client name is Required"),
    isChain: z.boolean().optional(),
    chain: z.string().optional(),
    contactName: z.string().optional(),
    phoneNumber: z.string().optional(),
    billingAddress: AddressSchema.optional(),
    paymentTerm: z.string().optional(),
    creditLimit: z.number().optional(),
    visitingDays: z.string().optional(),
  });