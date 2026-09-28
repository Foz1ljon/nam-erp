const CAN_DELETE_ANY: string[] = ['admin', 'director']

/**
 * Deletes a call recording for good (Cloudinary and the CRM). Allowed to the manager who made the call,
 * directors and admins. The call itself stays in the lead's history.
 */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use')
  const call = await PhoneCallModel.findById(paramId(event))
  if (!call?.recording) notFound('Yozuv topilmadi')
  if (!call.user.equals(me.oid) && !CAN_DELETE_ANY.includes(me.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: "Faqat qo'ng'iroq qilgan menejer yoki rahbariyat o'chira oladi" })
  }

  await deleteAudio(call.recording.publicId)
  call.recording = null
  call.recordingDeletedAt = new Date()
  await call.save()
  return ok(null)
})
