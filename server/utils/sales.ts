export const SALES_POPULATE = [
  { path: 'customer', select: 'name type phone address inn contactPerson' },
  { path: 'lead', select: 'title' },
  { path: 'manager', select: USER_REF },
  { path: 'lines.item', select: ITEM_REF },
  { path: 'lines.location', select: LOCATION_REF },
  { path: 'payments.user', select: USER_REF },
]

export const LEAD_POPULATE = [
  { path: 'manager', select: USER_REF },
  { path: 'customer', select: 'name type phone' },
  { path: 'activities.user', select: USER_REF },
]

export function orderTotal(lines: { qty: number; price: number }[], discount: number) {
  return Math.max(0, Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) - discount))
}
