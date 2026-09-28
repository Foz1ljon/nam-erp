import type { H3Event } from 'h3'
import { Types } from 'mongoose'
import { z } from 'zod'
import type { Permission } from '../../shared/utils/permissions'
import { can } from '../../shared/utils/permissions'


export function ok<T>(data: T) {
  return { success: true as const, data }
}

function validationError(error: z.ZodError): never {
  const first = error.issues[0]
  throw createError({
    statusCode: 400,
    statusMessage: 'Validation Failed',
    message: first ? `${first.path.join('.') || 'body'}: ${first.message}` : "Ma'lumotlar noto'g'ri",
    data: z.flattenError(error),
  })
}

export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) validationError(result.error)
  return result.data
}

export function parseQuery<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) validationError(result.error)
  return result.data
}

export function paramId(event: H3Event, name = 'id'): Types.ObjectId {
  const raw = getRouterParam(event, name)
  if (!raw || !Types.ObjectId.isValid(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: "Noto'g'ri identifikator" })
  }
  return new Types.ObjectId(raw)
}

export function notFound(message = 'Topilmadi'): never {
  throw createError({ statusCode: 404, statusMessage: 'Not Found', message })
}

export function conflict(message: string): never {
  throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message })
}

/** Ensures the request has an active session and (optionally) one of the given permissions. */
export async function requireAuth(event: H3Event, ...permissions: Permission[]) {
  const { user } = await requireUserSession(event)
  if (permissions.length && !permissions.some((p) => can(user.role, p))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: "Bu amal uchun ruxsatingiz yo'q" })
  }
  return { ...user, oid: new Types.ObjectId(user.id) }
}

export async function nextNumber(prefix: string): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', lean: true },
  )
  return `${prefix}-${String(counter!.seq).padStart(6, '0')}`
}

export function errorText(error: unknown): string {
  // $fetch errors carry the remote body in `data` (Meta Graph API: { error: { message } }).
  const e = error as { message?: string; statusCode?: number; data?: { message?: string; error?: { message?: string } | string } }
  const remote = typeof e?.data?.error === 'string' ? e.data.error : e?.data?.error?.message
  if (remote) return e.statusCode ? `${remote} (${e.statusCode})` : remote
  return e?.data?.message || e?.message || 'Xatolik'
}

/** MongoDB unique-index violation (E11000). */
export function isDuplicateKey(error: unknown) {
  return (error as { code?: number })?.code === 11000
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
