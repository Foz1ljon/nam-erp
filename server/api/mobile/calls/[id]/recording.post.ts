const MAX_BYTES = 50 * 1024 * 1024
const AUDIO_EXT = /\.(m4a|mp3|amr|3gp|3gpp|aac|ogg|opus|wav|awb|mp4)$/i

/** Receives the call recording (multipart field "file") and stores it in Cloudinary. */
export default defineEventHandler(async (event) => {
  const { device } = await requireDevice(event)
  const call = await PhoneCallModel.findOne({ _id: paramId(event), device: device._id })
  if (!call) notFound("Qo'ng'iroq topilmadi")
  if (call.recording) return ok({ callId: String(call._id) })

  const file = (await readMultipartFormData(event))?.find((p) => p.name === 'file' && p.filename)
  if (!file?.filename || !file.data.length) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Audio fayl yuborilmadi' })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: 'Audio fayl 50 MB dan katta' })
  }
  if (!file.type?.startsWith('audio/') && !AUDIO_EXT.test(file.filename)) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported Media Type', message: 'Faqat audio fayl qabul qilinadi' })
  }

  call.recording = await uploadAudio({ data: file.data, filename: file.filename, type: file.type }, String(call._id))
  await call.save()
  setResponseStatus(event, 201)
  return ok({ callId: String(call._id) })
})
