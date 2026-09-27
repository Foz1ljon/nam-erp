export default defineEventHandler(async (event) => {
  await requireAuth(event, 'sales.manage')
  const body = await parseBody(event, salesOrderSchema)
  const doc = await SalesOrderModel.findOneAndUpdate(
    { _id: paramId(event), status: 'draft' },
    { ...body, total: orderTotal(body.lines, body.discount) },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict("Faqat qoralama holatidagi buyurtmani tahrirlash mumkin")
  return ok({ _id: doc._id })
})
