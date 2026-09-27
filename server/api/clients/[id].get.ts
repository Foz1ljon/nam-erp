export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use', 'sales.view')
  const id = paramId(event)
  const client = await CounterpartyModel.findById(id).populate('manager', USER_REF).lean()
  if (!client) notFound('Mijoz topilmadi')

  const [stats, orders, leads, conversations, topItems] = await Promise.all([
    clientStats([id]).then((fn) => fn(id)),
    SalesOrderModel.find({ customer: id }).sort({ createdAt: -1 }).limit(300)
      .select('number status total paidAmount createdAt shippedAt payments')
      .populate('payments.user', USER_REF)
      .lean(),
    LeadModel.find({ customer: id }).sort({ createdAt: -1 }).select('title status estimatedAmount createdAt').lean(),
    ConversationModel.find({ customer: id }).sort({ lastMessageAt: -1 }).select('channelType contactName lastMessageAt lastMessageText').lean(),
    SalesOrderModel.aggregate([
      { $match: { customer: id, status: { $in: ACTIVE_SALE_STATUSES } } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.item', qty: { $sum: '$lines.qty' }, amount: { $sum: { $multiply: ['$lines.qty', '$lines.price'] } } } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
      { $unwind: '$item' },
      { $project: { _id: 0, qty: 1, amount: 1, item: { _id: '$item._id', code: '$item.code', name: '$item.name', unit: '$item.unit', type: '$item.type' } } },
    ]),
  ])

  const payments = orders
    .flatMap((o) => o.payments.map((p) => ({ ...p, orderNumber: o.number, orderId: o._id })))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))

  return ok({
    client: { ...client, kind: client.kind ?? 'b2b' },
    stats,
    orders: orders.map(({ payments: _p, ...o }) => o),
    payments,
    leads,
    conversations,
    topItems,
  })
})
