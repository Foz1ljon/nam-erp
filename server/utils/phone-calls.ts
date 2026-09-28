import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Types } from 'mongoose'
import type { CallDirection } from '../../shared/utils/constants'
import { CALL_DIRECTION_LABELS } from '../../shared/utils/constants'
import { fmtDuration } from '../../shared/utils/format'
import { can } from '../../shared/utils/permissions'

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Registers a phone for the user and returns its bearer token (shown once, only the hash is stored). */
export async function createDeviceToken(user: Types.ObjectId, name: string | undefined) {
  const token = randomBytes(32).toString('base64url')
  const device = await MobileDeviceModel.create({ user, name, tokenHash: hashDeviceToken(token), lastSeenAt: new Date() })
  return { token, device }
}

/** Authenticates the Android app by its bearer token; the user must still be active and allowed to use CRM. */
export async function requireDevice(event: H3Event) {
  const token = getRequestHeader(event, 'authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  const device = token ? await MobileDeviceModel.findOne({ tokenHash: hashDeviceToken(token), active: true }).lean() : null
  const user = device ? await UserModel.findOne({ _id: device.user, active: true }).select('fullName username role').lean() : null
  if (!device || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Qurilma avtorizatsiyadan chiqarilgan. Qayta kiring.' })
  }
  if (!can(user.role, 'crm.use')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: "CRM uchun ruxsatingiz yo'q" })
  }
  await MobileDeviceModel.updateOne({ _id: device._id }, { lastSeenAt: new Date() })
  return { device, user }
}

/** Last 9 digits identify an Uzbek number regardless of "+998", spaces or dashes. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9)
}

/** Matches the number inside free-form lead phones ("+998 90 123-45-67"). */
function phoneRegex(key: string): RegExp {
  return new RegExp(`${key.split('').join('\\D*')}\\D*$`)
}

export interface IncomingCall {
  deviceCallId: string
  phone: string
  contactName?: string
  inContacts: boolean
  direction: CallDirection
  startedAt: Date
  duration: number
  /** "new_contacts": numbers saved in the phone book stay private unless they already are a lead. */
  capture: 'new_contacts' | 'all'
}

type Device = { _id: Types.ObjectId; user: Types.ObjectId }

/**
 * Attaches a call to the caller's open lead. An incoming or missed call from an unknown number opens a
 * new lead for the phone's owner. Returns null when the call is private (not related to sales).
 */
export async function recordPhoneCall(device: Device, call: IncomingCall) {
  const existing = await PhoneCallModel.findOne({ device: device._id, deviceCallId: call.deviceCallId }).lean()
  if (existing) return existing

  const key = phoneKey(call.phone)
  if (key.length < 7) return null

  const leads = await LeadModel.find({ phone: phoneRegex(key) }).sort({ updatedAt: -1 }).select('status customer').lean()
  let lead: { _id: Types.ObjectId; status: string } | undefined = leads.find((l) => l.status !== 'won' && l.status !== 'lost')

  if (!lead) {
    const inbound = call.direction !== 'out'
    const privateContact = call.inContacts && call.capture === 'new_contacts' && !leads.length
    if (!inbound || privateContact) return null
    const name = call.contactName?.trim() || call.phone
    lead = await LeadModel.create({
      title: `Qo'ng'iroq: ${name}`,
      contactName: name,
      phone: call.phone,
      source: 'phone',
      status: 'new',
      manager: device.user,
      // A returning client (their earlier lead is closed) keeps the same client card.
      customer: leads.find((l) => l.customer)?.customer ?? null,
    })
  }

  let doc
  try {
    doc = await PhoneCallModel.create({ ...call, device: device._id, user: device.user, lead: lead._id })
  } catch (error) {
    // The same call was sent twice at once: the other request already stored it.
    if (!isDuplicateKey(error)) throw error
    return PhoneCallModel.findOne({ device: device._id, deviceCallId: call.deviceCallId }).lean()
  }

  const talked = call.duration > 0 && (call.direction === 'in' || call.direction === 'out')
  const text = talked ? `${CALL_DIRECTION_LABELS[call.direction]} · ${fmtDuration(call.duration)}` : CALL_DIRECTION_LABELS[call.direction]
  await LeadModel.updateOne(
    { _id: lead._id },
    {
      $push: { activities: { $each: [{ type: 'call', text, user: device.user, done: true, createdAt: call.startedAt }], $position: 0 } },
      ...(lead.status === 'new' && call.direction === 'out' && talked ? { $set: { status: 'contacted' } } : {}),
    },
  )
  return doc.toObject()
}
