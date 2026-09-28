import { z } from 'zod'

// Cloudinary's upload response, forwarded by the app as-is.
const schema = z.object({
  public_id: z.string().min(1),
  version: z.union([z.number(), z.string()]),
  signature: z.string().min(1),
  format: z.string().min(1),
  bytes: z.number().int().min(0),
  duration: z.number().min(0).optional(),
})

/** Step 2 of a direct upload: checks Cloudinary's signature and attaches the recording to the call. */
export default defineEventHandler(async (event) => {
  const { device } = await requireDevice(event)
  const body = await parseBody(event, schema)
  const call = await PhoneCallModel.findOne({ _id: paramId(event), device: device._id })
  if (!call) notFound("Qo'ng'iroq topilmadi")
  if (body.public_id !== recordingPublicId(String(call._id))) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Yozuv boshqa qo\'ng\'iroqqa tegishli' })
  }
  const recording = verifiedUpload(body)
  if (call.recordingDeletedAt) {
    // Deleted in the CRM while this upload was in flight: remove the fresh copy too.
    await deleteAudio(recording.publicId)
    return ok({ callId: String(call._id) })
  }
  call.recording = recording
  await call.save()
  return ok({ callId: String(call._id) })
})
