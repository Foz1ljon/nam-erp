export default defineEventHandler(async (event) => {
  await requireAuth(event, 'transfers.use')
  const doc = await TransferModel.findById(paramId(event)).populate(TRANSFER_POPULATE).lean()
  if (!doc) notFound('Topshirish hujjati topilmadi')
  return ok(doc)
})
