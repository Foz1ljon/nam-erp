import { z } from 'zod'
import {
  ACTIVITY_TYPES,
  CLIENT_KINDS,
  CLIENT_SEGMENTS,
  COUNTERPARTY_TYPES,
  ITEM_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LOCATION_TYPES,
  PAYMENT_METHODS,
  PRODUCT_KINDS,
  REJECT_ACTIONS,
  ROLES,
  UNITS,
} from '../../shared/utils/constants'
import { STAGES } from '../../shared/utils/stages'

const optionalText = z.string().trim().max(2000).optional()

export const userBase = z.object({
  fullName: z.string().trim().min(2),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, 'Login: 3-32 ta lotin harf, raqam, . _ -'),
  role: z.enum(ROLES),
  location: optionalObjectId,
  phone: z.string().trim().optional(),
  active: z.boolean().default(true),
})

export const locationSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/, 'Kod: 2-20 ta lotin harf/raqam'),
  name: z.string().trim().min(2),
  type: z.enum(LOCATION_TYPES),
  active: z.boolean().default(true),
  order: z.number().int().default(100),
})

export const itemSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40),
  name: z.string().trim().min(2),
  type: z.enum(ITEM_TYPES),
  unit: z.enum(UNITS),
  productKind: z.enum(PRODUCT_KINDS).nullish().transform((v) => v ?? null),
  unitWeightKg: z.number().min(0).nullish().transform((v) => v ?? null),
  price: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  serialTracked: z.boolean().default(false),
  description: optionalText,
  active: z.boolean().default(true),
})

export const bomSchema = z.object({
  lines: z.array(z.object({ component: objectId, qty: positiveQty, stage: z.enum(STAGES) })).max(200),
})

const optionalString = z.string().trim().max(300).optional()

export const counterpartySchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(COUNTERPARTY_TYPES),
  kind: z.enum(CLIENT_KINDS).default('b2b'),
  segment: z.enum(CLIENT_SEGMENTS).nullish().transform((v) => v ?? null),
  manager: optionalObjectId,
  inn: z.string().trim().regex(/^(\d{9}|\d{14})?$/, "STIR 9 xonali (yoki JShShIR 14 xonali) bo'lishi kerak").optional(),
  legalName: optionalString,
  director: optionalString,
  bankName: optionalString,
  bankAccount: z.string().trim().regex(/^(\d{20})?$/, "Hisob raqami 20 xonali bo'lishi kerak").optional(),
  mfo: z.string().trim().regex(/^(\d{5})?$/, "MFO 5 xonali bo'lishi kerak").optional(),
  oked: optionalString,
  vatCode: optionalString,
  phone: optionalString,
  email: z.string().trim().email("Email noto'g'ri").optional().or(z.literal('')),
  website: optionalString,
  telegram: optionalString,
  instagram: optionalString,
  region: optionalString,
  address: optionalString,
  contactPerson: optionalString,
  contractNumber: optionalString,
  contractDate: z.coerce.date().nullish().transform((v) => v ?? null),
  paymentTermsDays: z.number().int().min(0).max(365).default(0),
  creditLimit: z.number().min(0).default(0),
  note: optionalText,
})

const qtyLine = z.object({ item: objectId, qty: positiveQty })
const pricedLine = qtyLine.extend({ price: z.number().min(0).default(0) })

export const receiptSchema = z.object({
  supplier: optionalObjectId,
  location: objectId,
  note: optionalText,
  lines: z.array(pricedLine).min(1, "Kamida bitta qator kiriting"),
})

export const transferSchema = z.object({
  from: objectId,
  to: objectId,
  receiver: optionalObjectId,
  note: optionalText,
  lines: z.array(qtyLine).min(1, "Kamida bitta qator kiriting"),
})

export const adjustmentSchema = z.object({
  location: objectId,
  note: optionalText,
  lines: z.array(z.object({ item: objectId, actualQty: z.number().min(0) })).min(1),
})

export const operationSchema = z.object({
  stage: z.enum(STAGES),
  sourceLocation: objectId,
  targetLocation: objectId,
  worker: optionalObjectId,
  qcRequired: z.boolean().default(false),
  afterQcLocation: optionalObjectId,
  note: optionalText,
  inputs: z.array(qtyLine).default([]),
  outputs: z.array(qtyLine).min(1, 'Kamida bitta natija (mahsulot) kiriting'),
  wastes: z.array(qtyLine).default([]),
  /** Hand the finished work straight to the next department (not used when QC is required). */
  handoverTo: optionalObjectId,
  handoverReceiver: optionalObjectId,
})

export const qcSchema = z
  .object({
    operation: optionalObjectId,
    item: objectId,
    passedQty: z.number().min(0),
    rejectedQty: z.number().min(0),
    rejectAction: z.enum(REJECT_ACTIONS).nullish().transform((v) => v ?? null),
    scrapItem: optionalObjectId,
    scrapQty: z.number().min(0).default(0),
    defectReason: optionalText,
    passedLocation: objectId,
    note: optionalText,
  })
  .refine((v) => v.passedQty + v.rejectedQty > 0, { message: "Tekshirilgan miqdor 0 bo'lmasligi kerak", path: ['passedQty'] })
  .refine((v) => v.rejectedQty === 0 || v.rejectAction, { message: 'Brak uchun harakatni tanlang', path: ['rejectAction'] })
  .refine((v) => v.rejectAction !== 'scrap' || v.rejectedQty === 0 || v.scrapItem, {
    message: 'Qirindi turini tanlang',
    path: ['scrapItem'],
  })

export const salesOrderSchema = z.object({
  customer: objectId,
  lead: optionalObjectId,
  discount: z.number().min(0).default(0),
  note: optionalText,
  lines: z.array(pricedLine.extend({ location: objectId })).min(1, "Kamida bitta qator kiriting"),
})

export const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  note: optionalText,
})

export const leadSchema = z.object({
  title: z.string().trim().min(2),
  contactName: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  source: z.enum(LEAD_SOURCES).default('other'),
  status: z.enum(LEAD_STATUSES).default('new'),
  manager: optionalObjectId,
  estimatedAmount: z.number().min(0).default(0),
  productInterest: z.string().trim().optional(),
  note: optionalText,
  lostReason: z.string().trim().optional(),
})

export const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  text: z.string().trim().min(1),
  dueAt: z.coerce.date().nullish().transform((v) => v ?? null),
})

export const dateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export function dateFilter(range: { from?: Date; to?: Date }) {
  if (!range.from && !range.to) return undefined
  const filter: { $gte?: Date; $lte?: Date } = {}
  if (range.from) filter.$gte = range.from
  if (range.to) {
    const end = new Date(range.to)
    end.setHours(23, 59, 59, 999)
    filter.$lte = end
  }
  return filter
}
