const qtyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 })
const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export function fmtQty(value: number | null | undefined, unit?: string): string {
  const n = qtyFormatter.format(value ?? 0)
  return unit ? `${n} ${unit}` : n
}

export function fmtMoney(value: number | null | undefined): string {
  return `${moneyFormatter.format(value ?? 0)} so'm`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * The factory works in Tashkent time (UTC+5, no daylight saving). Dates are shown and days are cut in
 * that zone whatever the machine's zone is, so the server (UTC on Vercel) and the browser agree.
 */
export const TASHKENT_OFFSET_MS = 5 * 3600_000
const DAY_MS = 24 * 3600_000

/** A Date whose UTC fields read as Tashkent wall-clock time. */
function wall(value: string | number | Date): Date {
  return new Date(new Date(value).getTime() + TASHKENT_OFFSET_MS)
}

/** Midnight in Tashkent of the day containing `value`. */
export function startOfDay(value: string | number | Date = new Date()): Date {
  const t = new Date(value).getTime() + TASHKENT_OFFSET_MS
  return new Date(t - (((t % DAY_MS) + DAY_MS) % DAY_MS) - TASHKENT_OFFSET_MS)
}

/** Last millisecond (23:59:59.999) of that Tashkent day. */
export function endOfDay(value: string | number | Date = new Date()): Date {
  return new Date(startOfDay(value).getTime() + DAY_MS - 1)
}

/** First moment of the Tashkent calendar month containing `value`. */
export function startOfMonth(value: string | number | Date = new Date()): Date {
  const w = wall(value)
  return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) - TASHKENT_OFFSET_MS)
}

export function fmtDate(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const d = wall(value)
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
}

export function fmtDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const d = wall(value)
  return `${fmtDate(value)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Call length as "m:ss". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
