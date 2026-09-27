export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const doc = await LeadModel.findByIdAndUpdate(paramId(event), await parseBody(event, leadSchema), { returnDocument: 'after' }).lean()
  if (!doc) notFound('Lid topilmadi')
  return ok({ _id: doc._id })
})
