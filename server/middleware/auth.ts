// Webhooks authenticate with their own secrets (Telegram secret token, Meta signature).
const PUBLIC_API = ['/api/auth/login', '/api/auth/demo-accounts', '/api/_auth/session', '/api/webhooks/']

/** Every API route requires an authenticated session unless explicitly public. */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || PUBLIC_API.some((p) => path.startsWith(p))) return
  await requireUserSession(event)
})
