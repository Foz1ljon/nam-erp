export default defineEventHandler(async (event) => {
  await requireAuth(event, 'sales.view')
  const doc = await SalesOrderModel.findById(paramId(event)).populate(SALES_POPULATE).lean()
  if (!doc) notFound('Buyurtma topilmadi')
  return ok(doc)
})
