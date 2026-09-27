import { LOC } from '../../../shared/utils/constants'

const SYSTEM_CODES = new Set<string>(Object.values(LOC))

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'catalog.manage')
  const id = paramId(event)
  const body = await parseBody(event, locationSchema)
  const current = await LocationModel.findById(id).lean()
  if (!current) notFound()
  if (SYSTEM_CODES.has(current.code) && (body.code !== current.code || !body.active)) {
    conflict("Tizim joyining kodini o'zgartirib yoki o'chirib bo'lmaydi")
  }
  if (await LocationModel.exists({ code: body.code, _id: { $ne: id } })) conflict('Bu kod band')
  return ok(await LocationModel.findByIdAndUpdate(id, body, { returnDocument: 'after' }).lean())
})
