export default defineEventHandler(async (event) => {
  await requireAuth(event, 'reports.view', 'production.view')
  const range = parseQuery(event, dateRangeQuery)
  const created = dateFilter(range)
  const match = created ? { createdAt: created } : {}

  const [outputs, wastes] = await Promise.all([
    OperationModel.aggregate([
      { $match: match },
      { $unwind: '$outputs' },
      {
        $group: {
          _id: { stage: '$stage', worker: '$worker', item: '$outputs.item' },
          qty: { $sum: '$outputs.qty' },
          operations: { $sum: 1 },
        },
      },
      { $lookup: { from: 'users', localField: '_id.worker', foreignField: '_id', as: 'worker' } },
      { $lookup: { from: 'items', localField: '_id.item', foreignField: '_id', as: 'item' } },
      { $unwind: '$worker' },
      { $unwind: '$item' },
      {
        $project: {
          _id: 0,
          stage: '$_id.stage',
          qty: 1,
          operations: 1,
          weightKg: { $multiply: ['$qty', { $ifNull: ['$item.unitWeightKg', 0] }] },
          worker: { _id: '$worker._id', fullName: '$worker.fullName', role: '$worker.role' },
          item: { _id: '$item._id', code: '$item.code', name: '$item.name', unit: '$item.unit' },
        },
      },
      { $sort: { stage: 1, 'worker.fullName': 1 } },
    ]),
    OperationModel.aggregate([
      { $match: match },
      { $unwind: '$wastes' },
      { $group: { _id: '$stage', qty: { $sum: '$wastes.qty' } } },
      { $project: { _id: 0, stage: '$_id', qty: 1 } },
    ]),
  ])
  return ok({ outputs, wastes })
})
