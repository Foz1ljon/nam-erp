export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'sales.manage')
  const body = await parseBody(event, salesOrderSchema)
  if (!(await CounterpartyModel.exists({ _id: body.customer }))) conflict('Mijoz topilmadi')
  const number = await nextNumber('SO')
  const doc = await SalesOrderModel.create({
    ...body,
    number,
    manager: me.oid,
    status: 'draft',
    total: orderTotal(body.lines, body.discount),
  })
  if (body.lead) await LeadModel.updateOne({ _id: body.lead, status: { $in: ['new', 'contacted', 'qualified'] } }, { status: 'proposal' })
  setResponseStatus(event, 201)
  return ok({ _id: doc._id, number })
})
