import type { CallDirection } from '../plugins/call-sync'

export const DIRECTION_LABELS: Record<CallDirection, string> = {
  in: 'Kiruvchi',
  out: 'Chiquvchi',
  missed: "O'tkazib yuborilgan",
  rejected: 'Rad etilgan',
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function fmtDateTime(ms: number | undefined): string {
  if (!ms) return '—'
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms)
}

/** "erp.example.uz" → "https://erp.example.uz" (no trailing slash). */
export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
