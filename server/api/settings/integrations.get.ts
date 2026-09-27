export default defineEventHandler(async (event) => {
  await requireAuth(event, 'users.manage')
  const i = await getIntegrations()
  const base = await publicBaseUrl()
  return ok({
    telegramApiId: i.telegramApiId,
    telegramApiHash: maskSecret(i.telegramApiHash),
    instagramAppId: i.instagramAppId,
    instagramAppSecret: maskSecret(i.instagramAppSecret),
    instagramVerifyToken: i.instagramVerifyToken,
    instagramWebhookUrl: base ? `${base}/api/webhooks/instagram` : null,
    instagramRedirectUri: base ? `${base}/api/channels/instagram/callback` : null,
  })
})
