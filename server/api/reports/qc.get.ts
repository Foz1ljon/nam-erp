export default defineEventHandler(async (event) => {
  await requireAuth(event, 'reports.view', 'qc.manage')
  const range = parseQuery(event, dateRangeQuery)
  const created = dateFilter(range)
  const match = created ? { createdAt: created } : {}

  const [byStage, reasons] = await Promise.all([
    QcInspectionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$stage', 'manual'] },
          checked: { $sum: '$checkedQty' },
          passed: { $sum: '$passedQty' },
          rejected: { $sum: '$rejectedQty' },
          scrapKg: { $sum: '$scrapQty' },
          inspections: { $sum: 1 },
        },
      },
      { $project: { _id: 0, stage: '$_id', checked: 1, passed: 1, rejected: 1, scrapKg: 1, inspections: 1 } },
    ]),
    QcInspectionModel.aggregate([
      { $match: { ...match, rejectedQty: { $gt: 0 }, defectReason: { $nin: [null, ''] } } },
      { $group: { _id: { $toLower: '$defectReason' }, qty: { $sum: '$rejectedQty' }, count: { $sum: 1 } } },
      { $sort: { qty: -1 } },
      { $limit: 15 },
      { $project: { _id: 0, reason: '$_id', qty: 1, count: 1 } },
    ]),
  ])
  return ok({ byStage, reasons })
})
