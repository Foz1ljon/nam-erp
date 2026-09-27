/** Meta webhook verification handshake (app-level: one URL for all connected Instagram profiles). */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { instagramVerifyToken } = await getIntegrations()
  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === instagramVerifyToken) {
    return String(query['hub.challenge'] ?? '')
  }
  throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
})
