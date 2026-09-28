/** Closes the introduction for the current session (it opens again on the next sign-in). */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)
  await UserModel.updateOne({ _id: me.oid, onboardedAt: null }, { onboardedAt: new Date() })
  const { user } = await getUserSession(event)
  if (user) await setUserSession(event, { user: { ...user, onboarded: true } })
  return ok(null)
})
