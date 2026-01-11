import { z } from 'zod';

export const ProductSchema = z.object({
  sku: z.string().min(1),
  vendorSku: z.string().optional(),
  upc: z.string().min(1),
  brand: z.string().min(1),
  name: z.string().min(1),
  productType: z.string().optional(),
  productFamily: z.string().optional(),
  productLine: z.string().optional(),
  unitCost: z.number().optional(),
  unitPrice: z.number().optional(),
  caseSize: z.number().optional(),
  layerSize: z.number().optional(),
  palletSize: z.number().optional(),
  weight: z.number().optional(),
});
