import { z } from 'zod'

const schema = userBase.extend({ password: z.string().min(6, "Parol kamida 6 belgi") })

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'users.manage')
  const { password, ...body } = await parseBody(event, schema)
  if (await UserModel.exists({ username: body.username })) conflict('Bu login band')
  const user = await UserModel.create({ ...body, passwordHash: await hashPassword(password) })
  setResponseStatus(event, 201)
  return ok({ _id: user._id })
})
