export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const id = paramId(event)
  const [lead, orders] = await Promise.all([
    LeadModel.findById(id).populate(LEAD_POPULATE).lean(),
    SalesOrderModel.find({ lead: id }).sort({ createdAt: -1 }).select('number status total paidAmount createdAt').lean(),
  ])
  if (!lead) notFound('Lid topilmadi')
  return ok({ ...lead, orders })
})
