/**
 * Turns a lead into a customer (counterparty) so a sales order can be created for it.
 * An existing client with the same name or phone is reused instead of creating a duplicate card.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const lead = await LeadModel.findById(paramId(event))
  if (!lead) notFound('Lid topilmadi')
  if (!lead.customer) {
    const name = (lead.company || lead.contactName).trim()
    const digits = (lead.phone ?? '').replace(/\D/g, '').slice(-9)
    const phonePattern = digits.length === 9 ? new RegExp(digits.split('').join('\\D*') + '$') : null
    const existing = await CounterpartyModel.findOne({
      type: { $in: ['customer', 'both'] },
      $or: [
        { name: new RegExp(`^${escapeRegex(name)}$`, 'i') },
        { legalName: new RegExp(escapeRegex(name), 'i') },
        ...(phonePattern ? [{ phone: phonePattern }] : []),
      ],
    }).lean()
    const customer =
      existing ??
      (await CounterpartyModel.create({
        name,
        type: 'customer',
        kind: lead.company ? 'b2b' : 'b2c',
        phone: lead.phone,
        contactPerson: lead.contactName,
        manager: lead.manager,
        note: `Lid: ${lead.title}`,
      }))
    lead.customer = customer._id
    if (['new', 'contacted'].includes(lead.status)) lead.status = 'qualified'
    await lead.save()
  }
  return ok({ customer: lead.customer, lead: lead._id })
})
