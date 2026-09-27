import type { Permission } from '#shared/utils/permissions'

declare module '#app' {
  interface PageMeta {
    permission?: Permission | Permission[]
    public?: boolean
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user, fetch } = useUserSession()
  if (!loggedIn.value) await fetch()

  if (to.meta.public) {
    if (loggedIn.value && to.path === '/login') return navigateTo('/')
    return
  }
  if (!loggedIn.value) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })

  // First visit: show the introduction before anything else (printing labels is exempt).
  if (user.value?.onboarded === false && to.path !== '/welcome' && !to.path.startsWith('/print')) {
    return navigateTo('/welcome')
  }

  const required = to.meta.permission
  if (required) {
    const list = Array.isArray(required) ? required : [required]
    if (!list.some((p) => can(user.value?.role, p))) {
      throw createError({ statusCode: 403, statusMessage: "Bu sahifaga ruxsatingiz yo'q", fatal: true })
    }
  }
})
