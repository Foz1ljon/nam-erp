export default defineEventHandler(async (event) => {
  await requireAuth(event, 'channels.use', 'users.manage')
  return ok({ publicBaseUrl: await publicBaseUrl() })
})
