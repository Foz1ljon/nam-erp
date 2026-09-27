/** Marks the first-run introduction as seen (stored on the user, so it never shows again on any device). */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)
  await UserModel.updateOne({ _id: me.oid, onboardedAt: null }, { onboardedAt: new Date() })
  const { user } = await getUserSession(event)
  if (user) await setUserSession(event, { user: { ...user, onboarded: true } })
  return ok(null)
})
