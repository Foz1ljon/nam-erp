import { Types } from 'mongoose'
import { LOC } from '../../shared/utils/constants'
import { can } from '../../shared/utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)
  // Day and month in Tashkent time (the server itself runs in UTC on Vercel).
  const today = startOfDay()
  const monthStart = startOfMonth()
  const myLocation = me.locationId ? new Types.ObjectId(me.locationId) : null
  const supervisor = SUPERVISOR_ROLES.includes(me.role)

  const finishedLoc = await LocationModel.findOne({ code: LOC.FINISHED }, '_id').lean()

  const [todayProduction, pendingQc, myPendingTransfers, pendingTransfers, lowStock, finishedStock, salesMonth, leadsByStatus, locationTotals, recentOperations] =
    await Promise.all([
      OperationModel.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $project: { stage: 1, qty: { $sum: '$outputs.qty' } } },
        { $group: { _id: '$stage', qty: { $sum: '$qty' }, operations: { $sum: 1 } } },
        { $project: { _id: 0, stage: '$_id', qty: 1, operations: 1 } },
      ]),
      OperationModel.countDocuments({ qcStatus: 'pending' }),
      TransferModel.countDocuments({
        status: 'pending',
        ...(supervisor ? {} : { $or: [{ receiver: me.oid }, ...(myLocation ? [{ to: myLocation, receiver: null }] : [])] }),
      }),
      TransferModel.countDocuments({ status: 'pending' }),
      StockModel.aggregate([
        { $group: { _id: '$item', qty: { $sum: '$qty' } } },
        { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
        { $unwind: '$item' },
        { $match: { 'item.minStock': { $gt: 0 }, 'item.active': true, $expr: { $lt: ['$qty', '$item.minStock'] } } },
        { $project: { _id: 0, qty: 1, minStock: '$item.minStock', item: { _id: 1, code: 1, name: 1, unit: 1, type: 1 } } },
        { $sort: { 'item.code': 1 } },
        { $limit: 20 },
      ]),
      finishedLoc
        ? StockModel.find({ location: finishedLoc._id, qty: { $gt: 0 } }).populate('item', ITEM_REF).lean()
        : [],
      SalesOrderModel.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: { $in: ['confirmed', 'shipped', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]),
      // Lead figures are CRM data: only sales managers and admins receive them.
      !can(me.role, 'crm.use') ? [] : LeadModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$estimatedAmount' } } },
        { $project: { _id: 0, status: '$_id', count: 1, amount: 1 } },
      ]),
      StockModel.aggregate([
        { $match: { qty: { $gt: 0 } } },
        { $lookup: { from: 'items', localField: 'item', foreignField: '_id', as: 'item' } },
        { $unwind: '$item' },
        {
          $group: {
            _id: '$location',
            qtyKg: { $sum: { $cond: [{ $eq: ['$item.unit', 'kg'] }, '$qty', 0] } },
            qtyPcs: { $sum: { $cond: [{ $eq: ['$item.unit', 'dona'] }, '$qty', 0] } },
            items: { $sum: 1 },
          },
        },
        { $lookup: { from: 'locations', localField: '_id', foreignField: '_id', as: 'location' } },
        { $unwind: '$location' },
        { $sort: { 'location.order': 1 } },
        { $project: { _id: 0, qtyKg: 1, qtyPcs: 1, items: 1, location: { _id: 1, code: 1, name: 1, type: 1, order: 1 } } },
      ]),
      OperationModel.find().sort({ createdAt: -1 }).limit(8).populate(OPERATION_POPULATE).lean(),
    ])

  return ok({
    todayProduction,
    pendingQc,
    myPendingTransfers,
    pendingTransfers,
    lowStock,
    finishedStock: finishedStock.map((s) => ({ item: s.item, qty: s.qty })),
    salesMonth: salesMonth[0] ?? { total: 0, paid: 0, count: 0 },
    leadsByStatus,
    locationTotals,
    recentOperations,
  })
})
