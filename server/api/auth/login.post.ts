import { z } from 'zod'

const schema = z.object({
  username: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { username, password } = await parseBody(event, schema)
  const user = await UserModel.findOne({ username, active: true }).select('+passwordHash').lean()

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: "Login yoki parol noto'g'ri" })
  }

  await setUserSession(event, {
    user: {
      id: String(user._id),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      locationId: user.location ? String(user.location) : null,
      // The introduction opens after every sign-in; /api/auth/onboarded closes it for this session.
      onboarded: false,
    },
    loggedInAt: Date.now(),
  })
  return ok({ id: String(user._id) })
})
