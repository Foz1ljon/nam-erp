export default defineEventHandler(async (event) => {
  await requireAuth(event, 'reports.view', 'sales.view')
  const range = parseQuery(event, dateRangeQuery)
  const created = dateFilter(range)
  const match = { status: { $in: ['confirmed', 'shipped', 'completed'] }, ...(created ? { createdAt: created } : {}) }

  const [byDay, byItem, byManager, totals] = await Promise.all([
    SalesOrderModel.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } }, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', total: 1, paid: 1, count: 1 } },
    ]),
    SalesOrderModel.aggregate([
      { $match: match },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.item', qty: { $sum: '$lines.qty' }, amount: { $sum: { $multiply: ['$lines.qty', '$lines.price'] } } } },
      { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
      { $unwind: '$item' },
      { $sort: { amount: -1 } },
      { $project: { _id: 0, qty: 1, amount: 1, item: { _id: '$item._id', code: '$item.code', name: '$item.name', unit: '$item.unit', type: '$item.type' } } },
    ]),
    SalesOrderModel.aggregate([
      { $match: match },
      { $group: { _id: '$manager', total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'manager' } },
      { $unwind: '$manager' },
      { $project: { _id: 0, total: 1, paid: 1, count: 1, manager: { _id: '$manager._id', fullName: '$manager.fullName' } } },
    ]),
    SalesOrderModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      { $project: { _id: 0 } },
    ]),
  ])
  return ok({ byDay, byItem, byManager, totals: totals[0] ?? { total: 0, paid: 0, count: 0 } })
})
