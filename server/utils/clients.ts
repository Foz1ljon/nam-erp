import type { Types } from 'mongoose'

export const ACTIVE_SALE_STATUSES = ['confirmed', 'shipped', 'completed']

/** Sales totals and open-lead counts per client, keyed by client id. */
export async function clientStats(ids: Types.ObjectId[]) {
  const [sales, leads] = await Promise.all([
    SalesOrderModel.aggregate<{ _id: Types.ObjectId; orders: number; total: number; paid: number; lastOrderAt: Date }>([
      { $match: { customer: { $in: ids }, status: { $in: ACTIVE_SALE_STATUSES } } },
      { $group: { _id: '$customer', orders: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, lastOrderAt: { $max: '$createdAt' } } },
    ]),
    LeadModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { customer: { $in: ids }, status: { $nin: ['won', 'lost'] } } },
      { $group: { _id: '$customer', count: { $sum: 1 } } },
    ]),
  ])
  const salesMap = new Map(sales.map((s) => [String(s._id), s]))
  const leadMap = new Map(leads.map((l) => [String(l._id), l.count]))
  return (id: Types.ObjectId) => {
    const s = salesMap.get(String(id))
    return {
      orders: s?.orders ?? 0,
      total: s?.total ?? 0,
      paid: s?.paid ?? 0,
      debt: (s?.total ?? 0) - (s?.paid ?? 0),
      lastOrderAt: s?.lastOrderAt ?? null,
      openLeads: leadMap.get(String(id)) ?? 0,
    }
  }
}
