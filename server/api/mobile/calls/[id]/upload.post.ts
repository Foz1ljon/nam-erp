/**
 * Step 1 of a direct upload: signed Cloudinary form fields for this call's recording.
 * `alreadyUploaded` tells the app to skip the upload (e.g. a retry after the server already stored it).
 */
export default defineEventHandler(async (event) => {
  const { device } = await requireDevice(event)
  const call = await PhoneCallModel.findOne({ _id: paramId(event), device: device._id }).select('recording recordingDeletedAt').lean()
  if (!call) notFound("Qo'ng'iroq topilmadi")
  // Already stored, or deleted in the CRM on purpose: either way the phone must not send it (again).
  if (call.recording || call.recordingDeletedAt) return ok({ alreadyUploaded: true as const, url: null, fields: null })
  return ok({ alreadyUploaded: false as const, ...signedAudioUpload(String(call._id)) })
})
