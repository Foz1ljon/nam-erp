import type { Permission } from '#shared/utils/permissions'

export function useAuth() {
  const { user, loggedIn, clear } = useUserSession()

  function hasPermission(permission: Permission): boolean {
    return can(user.value?.role, permission)
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    useRefsStore().$reset()
    useIntroDismissed().value = false
    await navigateTo('/login')
  }

  return { user, loggedIn, can: hasPermission, logout }
}
