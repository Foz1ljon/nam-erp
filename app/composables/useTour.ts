import type { Driver } from 'driver.js'
import type { TourKey } from '~/utils/tours'
import { TOURS } from '~/utils/tours'

const SEEN_PREFIX = 'nm-tour-seen:'

/** Only one tour may be on screen; a second "Yordam" click or a page change replaces/closes it. */
let active: Driver | null = null

function isVisible(el: Element | null): el is HTMLElement {
  return !!el && (el as HTMLElement).getClientRects().length > 0
}

export function stopTour() {
  const tour = active
  active = null
  tour?.destroy()
}

export function useTour() {
  const { user } = useUserSession()
  // The router's current route, not the page's own: during a page transition the leaving page keeps
  // its old route, and its delayed auto-start must not open a tour over the next page.
  const current = useRouter().currentRoute

  function seenKey(key: TourKey) {
    return `${SEEN_PREFIX}${user.value?.id ?? 'anon'}:${key}`
  }

  function markSeen(key: TourKey) {
    try {
      localStorage.setItem(seenKey(key), '1')
    } catch {
      // storage unavailable (private mode) — the tour simply shows again next time
    }
  }

  function wasSeen(key: TourKey): boolean {
    try {
      return localStorage.getItem(seenKey(key)) === '1'
    } catch {
      return true
    }
  }

  async function start(key: TourKey) {
    if (!import.meta.client) return
    const path = current.value.path
    const { driver } = await import('driver.js')
    // The user may have left the page while driver.js was loading.
    if (current.value.path !== path) return
    stopTour()

    // Skip steps whose target is hidden: buttons without permission, empty lists, mobile layout.
    const steps = TOURS[key].flatMap((step) => {
      if (!step.el) return [{ popover: { title: step.title, description: step.text } }]
      const element = document.querySelector(`[data-tour="${step.el}"]`)
      return isVisible(element) ? [{ element, popover: { title: step.title, description: step.text } }] : []
    })
    if (!steps.length) return

    const tour = driver({
      steps,
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'nm-tour',
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Keyingi →',
      prevBtnText: '← Oldingi',
      doneBtnText: 'Tushunarli',
      onDestroyed: () => {
        markSeen(key)
        if (active === tour) active = null
      },
    })
    active = tour
    tour.drive()
  }

  /**
   * Runs the tour automatically the first time this user opens the page — after the app is hydrated
   * (the refresh loader is gone) and the page has settled.
   */
  function autoStart(key: TourKey, delay = 600) {
    if (!import.meta.client || wasSeen(key)) return
    const path = current.value.path
    const run = () =>
      setTimeout(() => {
        if (current.value.path === path && !wasSeen(key) && !active) start(key)
      }, delay)
    // First load: wait until hydration is done (the refresh loader is gone). In-app navigation: start on
    // a fixed delay — onNuxtReady waits for browser idle time, which made tours pop up seconds late,
    // over whatever the user was already doing.
    if (useNuxtApp().isHydrating) onNuxtReady(run)
    else run()
  }

  function resetAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(SEEN_PREFIX))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }

  return { start, autoStart, resetAll }
}
