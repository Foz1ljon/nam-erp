export default defineEventHandler(async (event) => {
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  const { instagramAppSecret } = await getIntegrations()
  if (!instagramAppSecret || !verifyInstagramSignature(raw, getHeader(event, 'x-hub-signature-256'), instagramAppSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }
  try {
    await handleInstagramWebhook(JSON.parse(raw) as IgWebhookBody)
  } catch (error) {
    console.error('[instagram] webhook failed', error)
  }
  return 'EVENT_RECEIVED'
})
