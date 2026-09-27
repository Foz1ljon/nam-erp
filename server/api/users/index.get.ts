export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const users = await UserModel.find().sort({ active: -1, fullName: 1 }).populate('location', LOCATION_REF).lean()
  return ok(users)
})
