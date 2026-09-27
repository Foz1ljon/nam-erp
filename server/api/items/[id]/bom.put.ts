export default defineEventHandler(async (event) => {
  await requireAuth(event, 'catalog.manage')
  const id = paramId(event)
  const { lines } = await parseBody(event, bomSchema)
  const ids = [...new Set(lines.map((l) => l.component))]
  if ((await ItemModel.countDocuments({ _id: { $in: ids } })) !== ids.length) conflict('Komponent topilmadi')
  const item = await ItemModel.findByIdAndUpdate(id, { bom: lines }, { returnDocument: 'after' }).populate('bom.component', ITEM_REF).lean()
  if (!item) notFound('Mahsulot topilmadi')
  return ok(item)
})
