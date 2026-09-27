import type { TourKey } from '~/utils/tours'
import { TOURS } from '~/utils/tours'

const SEEN_PREFIX = 'nm-tour-seen:'

function isVisible(el: Element | null): el is HTMLElement {
  return !!el && (el as HTMLElement).getClientRects().length > 0
}

export function useTour() {
  const { user } = useUserSession()

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
    const { driver } = await import('driver.js')

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
      onDestroyed: () => markSeen(key),
    })
    tour.drive()
  }

  /** Runs the tour automatically the first time this user opens the page. */
  function autoStart(key: TourKey, delay = 700) {
    if (!import.meta.client || wasSeen(key)) return
    setTimeout(() => {
      if (!wasSeen(key)) start(key)
    }, delay)
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
