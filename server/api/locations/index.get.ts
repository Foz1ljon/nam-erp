export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return ok(await LocationModel.find().sort({ order: 1 }).lean())
})
