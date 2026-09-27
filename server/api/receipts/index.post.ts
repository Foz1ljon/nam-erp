import { Types } from 'mongoose'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'receipts.manage')
  const body = await parseBody(event, receiptSchema)
  const location = await LocationModel.findById(body.location).lean()
  if (!location?.active) conflict('Ombor topilmadi')

  const number = await nextNumber('KR')
  const total = Math.round(body.lines.reduce((s, l) => s + l.qty * l.price, 0))
  const doc = await ReceiptModel.create({ ...body, number, total, user: me.oid })

  await applyMoves(
    body.lines.map((l) => ({ item: l.item, location: body.location, qty: l.qty })),
    { docType: 'receipt', docId: doc._id as Types.ObjectId, docNumber: number, user: me.oid, note: body.note },
  )
  // Keep the latest purchase price as item cost.
  await Promise.all(
    body.lines.filter((l) => l.price > 0).map((l) => ItemModel.updateOne({ _id: l.item }, { cost: l.price })),
  )
  setResponseStatus(event, 201)
  return ok({ _id: doc._id, number })
})
