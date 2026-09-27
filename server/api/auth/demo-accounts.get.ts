// Public list of demo accounts for the login page. Only accounts that still use their default
// demo password are listed, so an account disappears as soon as its password is changed.

interface DemoAccount {
  username: string
  fullName: string
  role: string
  password: string
}

let cache: { at: number; data: DemoAccount[] } | null = null
const TTL_MS = 60_000

export default defineEventHandler(async () => {
  if (!useRuntimeConfig().demoLogins) return ok([])
  if (cache && Date.now() - cache.at < TTL_MS) return ok(cache.data)

  const adminPassword = process.env.NUXT_ADMIN_PASSWORD || 'admin123'
  const candidates = [{ username: 'admin', password: adminPassword }, ...DEMO_USERS.map((u) => ({ username: u.username, password: DEMO_PASSWORD }))]
  const users = await UserModel.find({ username: { $in: candidates.map((c) => c.username) }, active: true }).select('+passwordHash').lean()

  const data: DemoAccount[] = []
  for (const c of candidates) {
    const user = users.find((u) => u.username === c.username)
    if (user && (await verifyPassword(user.passwordHash, c.password))) {
      data.push({ username: user.username, fullName: user.fullName, role: user.role, password: c.password })
    }
  }
  cache = { at: Date.now(), data }
  return ok(data)
})
