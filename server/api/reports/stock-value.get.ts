export default defineEventHandler(async (event) => {
  await requireAuth(event, 'reports.view')
  const rows = await StockModel.aggregate([
    { $match: { qty: { $gt: 0 } } },
    { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'item' } },
    { $unwind: '$item' },
    {
      $group: {
        _id: { location: '$location', type: '$item.type' },
        costValue: { $sum: { $multiply: ['$qty', '$item.cost'] } },
        saleValue: { $sum: { $multiply: ['$qty', '$item.price'] } },
        positions: { $sum: 1 },
      },
    },
    { $lookup: { from: 'locations', localField: '_id.location', foreignField: '_id', as: 'location' } },
    { $unwind: '$location' },
    { $sort: { 'location.order': 1 } },
    { $project: { _id: 0, type: '$_id.type', costValue: 1, saleValue: 1, positions: 1, location: { _id: 1, code: 1, name: 1 } } },
  ])
  return ok(rows)
})
