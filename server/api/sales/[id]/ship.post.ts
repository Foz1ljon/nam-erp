import type { Types } from 'mongoose'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'sales.manage')
  const id = paramId(event)
  const current = await SalesOrderModel.findById(id).lean()
  if (!current) notFound('Buyurtma topilmadi')
  if (current.status !== 'confirmed') conflict("Faqat tasdiqlangan buyurtma jo'natiladi")

  const moves = current.lines.map((l) => ({ item: l.item, location: l.location, qty: -l.qty }))
  await assertAvailable(moves)

  const doc = await SalesOrderModel.findOneAndUpdate(
    { _id: id, status: 'confirmed' },
    { status: 'shipped', shippedAt: new Date() },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict('Buyurtma holati o\'zgargan')

  try {
    await applyMoves(moves, { docType: 'sale', docId: doc._id as Types.ObjectId, docNumber: doc.number, user: me.oid, note: 'Sotuv' })
  } catch (error) {
    await SalesOrderModel.updateOne({ _id: id }, { status: 'confirmed', shippedAt: null })
    throw error
  }

  // Assign serial numbers FIFO to shipped serial-tracked products.
  const serialItems = await ItemModel.find({ _id: { $in: doc.lines.map((l) => l.item) }, serialTracked: true }).distinct('_id')
  for (const itemId of serialItems) {
    const qty = doc.lines.filter((l) => l.item.equals(itemId)).reduce((s, l) => s + l.qty, 0)
    const units = await ProductUnitModel.find({ item: itemId, status: 'in_stock' }).sort({ serial: 1 }).limit(qty).select('_id').lean()
    await ProductUnitModel.updateMany(
      { _id: { $in: units.map((u) => u._id) } },
      { status: 'sold', salesOrder: doc._id, soldAt: new Date() },
    )
  }

  if (doc.lead) await LeadModel.updateOne({ _id: doc.lead }, { status: 'won' })
  return ok({ _id: doc._id })
})
