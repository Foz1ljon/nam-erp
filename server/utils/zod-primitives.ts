import { z } from 'zod'

// Leaf module (depends only on zod) so schema modules can use these at load time regardless of import order.
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Noto'g'ri identifikator")
export const optionalObjectId = objectId.nullish().transform((v) => v ?? null)
export const positiveQty = z.number().positive("Miqdor 0 dan katta bo'lishi kerak")
