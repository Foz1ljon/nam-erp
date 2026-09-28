export default defineEventHandler(async (event) => {
  const { user } = await requireDevice(event)
  return ok({ id: String(user._id), fullName: user.fullName, username: user.username, role: user.role })
})
