// Webhooks authenticate with their own secrets (Telegram secret token, Meta signature).
const PUBLIC_API = ['/api/auth/login', '/api/auth/demo-accounts', '/api/_auth/session', '/api/webhooks/']

// The Android app sends a bearer device token (checked by requireDevice), not the session cookie.
const MOBILE_API = '/api/mobile/'

/** Every API route requires an authenticated session unless explicitly public. */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith(MOBILE_API)) {
    // Token auth carries no cookies, so any origin (the app's WebView) may call it.
    handleCors(event, { origin: '*', methods: '*', allowHeaders: '*' })
    return
  }
  if (!path.startsWith('/api/') || PUBLIC_API.some((p) => path.startsWith(p))) return
  await requireUserSession(event)
})
