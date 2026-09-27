export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ai.use', 'ai.settings')
  return ok(await getAiSettingsPublic())
})
