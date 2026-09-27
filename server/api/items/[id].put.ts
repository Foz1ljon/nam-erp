export default defineEventHandler(async (event) => {
  await requireAuth(event, 'catalog.manage')
  const id = paramId(event)
  const body = await parseBody(event, itemSchema)
  if (await ItemModel.exists({ code: body.code, _id: { $ne: id } })) conflict('Bu kod band')
  const item = await ItemModel.findByIdAndUpdate(id, body, { returnDocument: 'after' }).lean()
  if (!item) notFound('Mahsulot topilmadi')
  return ok(item)
})
