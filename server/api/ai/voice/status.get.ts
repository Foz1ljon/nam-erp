export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ai.use')
  return ok(await voiceBackend())
})
