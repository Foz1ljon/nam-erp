export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'sales.manage')
  const id = paramId(event)
  const body = await parseBody(event, paymentSchema)
  const order = await SalesOrderModel.findById(id).lean()
  if (!order) notFound('Buyurtma topilmadi')
  if (order.status === 'cancelled' || order.status === 'draft') conflict("Bu holatda to'lov qabul qilinmaydi")
  const remaining = order.total - order.paidAmount
  if (body.amount > remaining) conflict(`Qoldiq qarz: ${remaining} so'm`)

  const doc = await SalesOrderModel.findOneAndUpdate(
    { _id: id, paidAmount: order.paidAmount },
    { $push: { payments: { ...body, user: me.oid, date: new Date() } }, $inc: { paidAmount: body.amount } },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict("Buyurtma o'zgargan, qayta urinib ko'ring")
  return ok({ _id: doc._id, paidAmount: doc.paidAmount })
})
