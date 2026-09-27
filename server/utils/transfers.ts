import type { Types } from 'mongoose'
import type { Role } from '../../shared/utils/constants'

export const SUPERVISOR_ROLES: Role[] = ['admin', 'director', 'warehouse']

export const TRANSFER_POPULATE = [
  { path: 'from', select: LOCATION_REF },
  { path: 'to', select: LOCATION_REF },
  { path: 'sender', select: USER_REF },
  { path: 'receiver', select: USER_REF },
  { path: 'acceptedBy', select: USER_REF },
  { path: 'lines.item', select: ITEM_REF },
]

interface Actor {
  oid: Types.ObjectId
  role: Role
  locationId: string | null
}

/** The receiver named on the transfer, anyone attached to the target location, or a supervisor. */
export function canReceive(me: Actor, transfer: { to: Types.ObjectId; receiver?: Types.ObjectId | null }) {
  if (SUPERVISOR_ROLES.includes(me.role)) return true
  if (transfer.receiver) return transfer.receiver.equals(me.oid)
  return me.locationId === String(transfer.to)
}

interface NewTransfer {
  from: Types.ObjectId | string
  to: Types.ObjectId | string
  receiver?: Types.ObjectId | string | null
  note?: string
  lines: { item: Types.ObjectId | string; qty: number }[]
  sender: Types.ObjectId
}

/**
 * Creates a pending handover. Goods leave the sender immediately and stay "in transit"
 * until the receiving department accepts (or rejects) them.
 */
export async function createTransfer(input: NewTransfer) {
  if (String(input.from) === String(input.to)) conflict("Jo'natuvchi va qabul qiluvchi joy bir xil bo'lmasligi kerak")
  const locations = await LocationModel.countDocuments({ _id: { $in: [input.from, input.to] }, active: true })
  if (locations !== 2) conflict('Joy topilmadi')
  if (input.receiver && !(await UserModel.exists({ _id: input.receiver, active: true }))) conflict('Qabul qiluvchi topilmadi')

  const moves = input.lines.map((l) => ({ item: l.item, location: input.from, qty: -l.qty }))
  await assertAvailable(moves)
  const number = await nextNumber('TP')
  const doc = await TransferModel.create({
    from: input.from,
    to: input.to,
    receiver: input.receiver ?? null,
    note: input.note,
    lines: input.lines,
    number,
    sender: input.sender,
    status: 'pending',
  })
  try {
    await applyMoves(moves, { docType: 'transfer', docId: doc._id as Types.ObjectId, docNumber: number, user: input.sender, note: "Jo'natildi" })
  } catch (error) {
    await TransferModel.deleteOne({ _id: doc._id })
    throw error
  }
  return { _id: doc._id as Types.ObjectId, number }
}
