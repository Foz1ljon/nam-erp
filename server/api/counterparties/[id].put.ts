export default defineEventHandler(async (event) => {
  await requireAuth(event, 'counterparties.manage')
  const doc = await CounterpartyModel.findByIdAndUpdate(paramId(event), await parseBody(event, counterpartySchema), { returnDocument: 'after' }).lean()
  if (!doc) notFound('Kontragent topilmadi')
  return ok(doc)
})
