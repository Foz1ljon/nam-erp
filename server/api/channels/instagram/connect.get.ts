/** Starts "Instagram Login": sends the manager to Instagram to approve access to their profile. */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  try {
    return sendRedirect(event, await instagramAuthorizeUrl(me.oid))
  } catch (error) {
    return sendRedirect(event, `/crm/channels?ig=error&msg=${encodeURIComponent(errorText(error))}`)
  }
})
