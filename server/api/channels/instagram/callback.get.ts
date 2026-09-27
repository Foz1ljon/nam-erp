import { z } from 'zod'

const query = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  const q = parseQuery(event, query)
  const fail = (msg: string) => sendRedirect(event, `/crm/channels?ig=error&msg=${encodeURIComponent(msg)}`)
  if (q.error || !q.code || !q.state) return fail(q.error_description || 'Instagram ruxsat bermadi')
  try {
    const channel = await completeInstagramLogin(me.oid, q.code, q.state)
    return sendRedirect(event, `/crm/channels?ig=ok&name=${encodeURIComponent(channel?.name ?? '')}`)
  } catch (error) {
    return fail(errorText(error))
  }
})
