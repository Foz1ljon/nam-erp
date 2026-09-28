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
  const route = useRoute()

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
    const path = route.path
    const { driver } = await import('driver.js')
    // The user may have left the page while driver.js was loading.
    if (route.path !== path) return
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
    const path = route.path
    onNuxtReady(() => {
      setTimeout(() => {
        if (route.path === path && !wasSeen(key) && !active) start(key)
      }, delay)
    })
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
