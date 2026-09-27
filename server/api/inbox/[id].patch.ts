import { z } from 'zod'

const schema = z.object({ customer: optionalObjectId.optional(), manager: optionalObjectId.optional() })

/** Link a conversation to a client card (and its lead), or hand it over to another manager. */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use', 'channels.use')
  const conversation = await ConversationModel.findById(paramId(event))
  if (!conversation) notFound('Suhbat topilmadi')
  if (!canAccessConversation(me, conversation)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const body = await parseBody(event, schema)
  if (body.customer !== undefined) {
    conversation.customer = body.customer ? (await CounterpartyModel.findById(body.customer).lean())?._id ?? null : null
    if (conversation.lead && conversation.customer) await LeadModel.updateOne({ _id: conversation.lead, customer: null }, { customer: conversation.customer })
  }
  if (body.manager) {
    const manager = await UserModel.findOne({ _id: body.manager, active: true }).lean()
    if (!manager) conflict('Menejer topilmadi')
    conversation.manager = manager._id
    if (conversation.lead) await LeadModel.updateOne({ _id: conversation.lead }, { manager: manager._id })
  }
  await conversation.save()
  return ok({ _id: conversation._id })
})
