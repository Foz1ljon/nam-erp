export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'ai.use')
  const file = await GeneratedFileModel.findById(paramId(event)).select('+data').lean()
  if (!file || (!file.user.equals(me.oid) && me.role !== 'admin')) notFound('Fayl topilmadi')
  // lean() returns BSON Binary for Buffer fields; unwrap it to a Node Buffer.
  const raw = file.data as unknown
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from((raw as { buffer: Uint8Array }).buffer)
  setHeader(event, 'Content-Type', file.mime)
  setHeader(event, 'Content-Disposition', `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(file.name)}`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return data
})
