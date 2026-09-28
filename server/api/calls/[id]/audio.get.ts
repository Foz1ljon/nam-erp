/** Redirects the CRM audio player to a short-lived signed link of a private call recording. */
export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const call = await PhoneCallModel.findById(paramId(event)).select('recording').lean()
  if (!call?.recording) notFound('Yozuv topilmadi')
  return sendRedirect(event, audioDownloadUrl(call.recording), 302)
})
