import { Types } from 'mongoose'
import { roundQty } from '../../../shared/utils/format'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'adjustments.manage')
  const body = await parseBody(event, adjustmentSchema)
  const location = new Types.ObjectId(body.location)

  const stocks = await StockModel.find({ location, item: { $in: body.lines.map((l) => l.item) } }).lean()
  const current = new Map(stocks.map((s) => [String(s.item), s.qty]))
  const lines = body.lines.map((l) => ({ ...l, expectedQty: roundQty(current.get(l.item) ?? 0) }))

  const number = await nextNumber('INV')
  const doc = await AdjustmentModel.create({ number, location, user: me.oid, note: body.note, lines })
  await applyMoves(
    lines.map((l) => ({ item: l.item, location, qty: roundQty(l.actualQty - l.expectedQty) })),
    { docType: 'adjustment', docId: doc._id as Types.ObjectId, docNumber: number, user: me.oid, note: body.note },
  )
  setResponseStatus(event, 201)
  return ok({ _id: doc._id, number })
})
