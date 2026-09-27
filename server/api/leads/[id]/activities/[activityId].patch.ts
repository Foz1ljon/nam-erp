import { z } from 'zod'

const schema = z.object({ done: z.boolean() })

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const { done } = await parseBody(event, schema)
  const res = await LeadModel.updateOne(
    { _id: paramId(event), 'activities._id': paramId(event, 'activityId') },
    { $set: { 'activities.$.done': done } },
  )
  if (!res.matchedCount) notFound('Vazifa topilmadi')
  return ok(null)
})
