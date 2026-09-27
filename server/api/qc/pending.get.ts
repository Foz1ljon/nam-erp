export default defineEventHandler(async (event) => {
  await requireAuth(event, 'qc.manage', 'production.view')
  const rows = await OperationModel.find({ qcStatus: 'pending' }).sort({ createdAt: 1 }).populate(OPERATION_POPULATE).lean()
  return ok(rows)
})
