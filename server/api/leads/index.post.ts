export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use')
  const body = await parseBody(event, leadSchema)
  const doc = await LeadModel.create({ ...body, manager: body.manager ?? me.oid })
  setResponseStatus(event, 201)
  return ok({ _id: doc._id })
})
