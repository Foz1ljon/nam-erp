export interface EditableLine {
  key: number
  item: string | null
  qty: number | null
  price?: number | null
  location: string | null
}

let seq = 0
export function newLine(partial: Partial<EditableLine> = {}): EditableLine {
  return { key: ++seq, item: null, qty: null, price: undefined, location: null, ...partial }
}

/** Drops incomplete rows and maps to API payload lines. */
export function toQtyLines(lines: EditableLine[]) {
  return lines.filter((l) => l.item && (l.qty ?? 0) > 0).map((l) => ({ item: l.item!, qty: l.qty! }))
}

export function toPricedLines(lines: EditableLine[]) {
  return lines.filter((l) => l.item && (l.qty ?? 0) > 0).map((l) => ({ item: l.item!, qty: l.qty!, price: l.price ?? 0 }))
}
