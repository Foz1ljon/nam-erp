const MAX_BYTES = 8 * 1024 * 1024 // ~4 minutes of 16 kHz mono WAV
const ALLOWED = /^audio\/(wav|x-wav|webm|ogg|mpeg|mp3|mp4|aac|flac)/

/** Voice question → text. Body: multipart/form-data with an `audio` file. */
export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ai.use')
  const form = await readMultipartFormData(event)
  const file = form?.find((f) => f.name === 'audio')
  if (!file?.data?.length) throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Audio yuborilmadi' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: 'Audio juda uzun (4 daqiqagacha)' })
  const mime = (file.type || 'audio/wav').split(';')[0]!.toLowerCase()
  if (!ALLOWED.test(mime)) throw createError({ statusCode: 415, statusMessage: 'Unsupported Media Type', message: `Audio formati qo'llab-quvvatlanmaydi: ${mime}` })
  try {
    return ok({ text: await transcribeAudio(file.data, mime === 'audio/x-wav' ? 'audio/wav' : mime) })
  } catch (error) {
    conflict(errorText(error))
  }
})
