export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const item = await ItemModel.findById(paramId(event)).populate('bom.component', ITEM_REF).lean()
  if (!item) notFound('Mahsulot topilmadi')
  return ok(item)
})
