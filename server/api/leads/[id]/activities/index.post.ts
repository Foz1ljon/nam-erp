export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use')
  const body = await parseBody(event, activitySchema)
  const doc = await LeadModel.findByIdAndUpdate(
    paramId(event),
    { $push: { activities: { $each: [{ ...body, user: me.oid, done: body.type !== 'task' }], $position: 0 } } },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) notFound('Lid topilmadi')
  if (doc.status === 'new' && body.type !== 'note') await LeadModel.updateOne({ _id: doc._id }, { status: 'contacted' })
  setResponseStatus(event, 201)
  return ok({ _id: doc._id })
})
