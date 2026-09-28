import { z } from 'zod'
import { can } from '../../../shared/utils/permissions'

const schema = z.object({
  username: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
  deviceName: z.string().trim().max(120).optional(),
})

/** Signs the Android call-sync app in and issues a device token (no cookies inside the app). */
export default defineEventHandler(async (event) => {
  const { username, password, deviceName } = await parseBody(event, schema)
  const user = await UserModel.findOne({ username, active: true }).select('+passwordHash').lean()

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: "Login yoki parol noto'g'ri" })
  }
  if (!can(user.role, 'crm.use')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: "CRM uchun ruxsatingiz yo'q" })
  }

  const { token } = await createDeviceToken(user._id, deviceName)
  return ok({ token, user: { id: String(user._id), fullName: user.fullName, username: user.username, role: user.role } })
})
