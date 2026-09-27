
export default defineEventHandler(async (event) => {
  await requireAuth(event, 'catalog.manage')
  const body = await parseBody(event, locationSchema)
  if (await LocationModel.exists({ code: body.code })) conflict('Bu kod band')
  const loc = await LocationModel.create(body)
  setResponseStatus(event, 201)
  return ok(loc.toObject())
})
