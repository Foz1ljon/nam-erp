export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'counterparties.manage')
  const body = await parseBody(event, counterpartySchema)
  // A client created by a sales manager is theirs unless another manager was chosen.
  const manager = body.manager ?? (me.role === 'sales' && body.type !== 'supplier' ? me.oid : null)
  const doc = await CounterpartyModel.create({ ...body, manager })
  setResponseStatus(event, 201)
  return ok(doc.toObject())
})
