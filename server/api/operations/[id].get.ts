export default defineEventHandler(async (event) => {
  await requireAuth(event, 'production.view', 'qc.manage')
  const doc = await OperationModel.findById(paramId(event)).populate(OPERATION_POPULATE).lean()
  if (!doc) notFound('Operatsiya topilmadi')
  return ok(doc)
})
