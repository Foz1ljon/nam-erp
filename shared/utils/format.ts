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

export function fmtDate(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function fmtDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Call length as "m:ss". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
