import { Types } from 'mongoose'
import type { DocType } from '../../shared/utils/constants'
import { fmtQty, roundQty } from '../../shared/utils/format'

type Id = Types.ObjectId | string

export interface MoveInput {
  item: Id
  location: Id
  /** Signed quantity: negative consumes stock, positive adds stock. */
  qty: number
}

export interface MoveMeta {
  docType: DocType
  docId: Types.ObjectId
  docNumber: string
  user: Types.ObjectId
  note?: string
}

const toId = (v: Id) => (typeof v === 'string' ? new Types.ObjectId(v) : v)
const EPSILON = 1e-6

/** Merge moves on the same item/location so availability is checked on the net amount. */
function consolidate(moves: MoveInput[]) {
  const map = new Map<string, { item: Types.ObjectId; location: Types.ObjectId; qty: number }>()
  for (const m of moves) {
    const key = `${m.item}:${m.location}`
    const existing = map.get(key)
    if (existing) existing.qty = roundQty(existing.qty + m.qty)
    else map.set(key, { item: toId(m.item), location: toId(m.location), qty: roundQty(m.qty) })
  }
  return [...map.values()].filter((m) => Math.abs(m.qty) > EPSILON)
}

async function describeShortage(item: Types.ObjectId, location: Types.ObjectId, required: number) {
  const [it, loc, stock] = await Promise.all([
    ItemModel.findById(item, 'name unit').lean(),
    LocationModel.findById(location, 'name').lean(),
    StockModel.findOne({ item, location }, 'qty').lean(),
  ])
  return `"${it?.name ?? item}" yetarli emas (${loc?.name ?? location}): mavjud ${fmtQty(stock?.qty ?? 0, it?.unit)}, kerak ${fmtQty(required, it?.unit)}`
}

/**
 * Applies stock moves atomically per line. Decrements are guarded by a `qty >= n` filter so
 * stock never goes negative; if any line fails, already applied decrements are compensated.
 * Works on a standalone MongoDB (no multi-document transactions required).
 */
export async function applyMoves(moves: MoveInput[], meta: MoveMeta): Promise<void> {
  const lines = consolidate(moves)
  const decrements = lines.filter((m) => m.qty < 0)
  const increments = lines.filter((m) => m.qty > 0)
  const applied: typeof decrements = []

  for (const m of decrements) {
    const need = -m.qty
    const res = await StockModel.updateOne(
      { item: m.item, location: m.location, qty: { $gte: need - EPSILON } },
      { $inc: { qty: m.qty } },
    )
    if (res.modifiedCount !== 1) {
      await Promise.all(
        applied.map((a) => StockModel.updateOne({ item: a.item, location: a.location }, { $inc: { qty: -a.qty } })),
      )
      conflict(await describeShortage(m.item, m.location, need))
    }
    applied.push(m)
  }

  await Promise.all(
    increments.map((m) =>
      StockModel.updateOne({ item: m.item, location: m.location }, { $inc: { qty: m.qty } }, { upsert: true }),
    ),
  )

  await StockMoveModel.insertMany(
    lines.map((m) => ({
      item: m.item,
      location: m.location,
      qty: m.qty,
      docType: meta.docType,
      docId: meta.docId,
      docNumber: meta.docNumber,
      user: meta.user,
      note: meta.note,
    })),
  )
}

/** Pre-flight availability check (gives a friendly error before any document is written). */
export async function assertAvailable(moves: MoveInput[]): Promise<void> {
  for (const m of consolidate(moves).filter((l) => l.qty < 0)) {
    const stock = await StockModel.findOne({ item: m.item, location: m.location }, 'qty').lean()
    if ((stock?.qty ?? 0) + EPSILON < -m.qty) conflict(await describeShortage(m.item, m.location, -m.qty))
  }
}

export async function getLocationByCode(code: string) {
  const loc = await LocationModel.findOne({ code }).lean()
  if (!loc) throw createError({ statusCode: 500, statusMessage: 'Server Error', message: `Joy topilmadi: ${code}` })
  return loc
}
