export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const id = paramId(event)
  const [lead, orders, calls] = await Promise.all([
    LeadModel.findById(id).populate(LEAD_POPULATE).lean(),
    SalesOrderModel.find({ lead: id }).sort({ createdAt: -1 }).select('number status total paidAmount createdAt').lean(),
    PhoneCallModel.find({ lead: id })
      .sort({ startedAt: -1 })
      .select('phone contactName direction startedAt duration user recording.format recording.bytes recording.duration')
      .populate({ path: 'user', select: USER_REF })
      .lean(),
  ])
  if (!lead) notFound('Lid topilmadi')
  return ok({ ...lead, orders, calls })
})
