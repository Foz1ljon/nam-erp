export default defineEventHandler(async (event) => {
  await requireAuth(event, 'catalog.manage')
  const body = await parseBody(event, itemSchema)
  if (await ItemModel.exists({ code: body.code })) conflict('Bu kod band')
  const item = await ItemModel.create(body)
  setResponseStatus(event, 201)
  return ok(item.toObject())
})
