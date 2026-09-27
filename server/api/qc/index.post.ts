import { Types } from 'mongoose'
import { LOC } from '../../../shared/utils/constants'
import { roundQty } from '../../../shared/utils/format'
import type { MoveInput } from '../../utils/stock'
import type { Stage } from '../../../shared/utils/stages'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'qc.manage')
  const body = await parseBody(event, qcSchema)
  const checkedQty = roundQty(body.passedQty + body.rejectedQty)

  const [qcLoc, foundry, defect, item, passedLocation] = await Promise.all([
    getLocationByCode(LOC.QC),
    getLocationByCode(LOC.FOUNDRY),
    getLocationByCode(LOC.DEFECT),
    ItemModel.findById(body.item).lean(),
    LocationModel.findOne({ _id: body.passedLocation, active: true }).lean(),
  ])
  if (!item) conflict('Mahsulot topilmadi')
  if (!passedLocation) conflict('Yaroqli mahsulot joyi topilmadi')
  if (item.unit === 'dona' && (!Number.isInteger(body.passedQty) || !Number.isInteger(body.rejectedQty))) {
    conflict("Miqdor butun son bo'lishi kerak")
  }

  // ---- reserve the inspected quantity on the operation (optimistic concurrency)
  let operation: { _id: Types.ObjectId; stage: Stage; complete: boolean } | null = null
  if (body.operation) {
    const op = await OperationModel.findById(body.operation).lean()
    if (!op || op.qcStatus !== 'pending') conflict('Operatsiya tekshiruvda emas')
    const line = op.outputs.find((o) => o.item.equals(item._id))
    if (!line) conflict('Bu mahsulot operatsiya natijasida yo\'q')
    const remaining = roundQty(line.qty - line.inspectedQty)
    if (checkedQty > remaining + 1e-6) conflict(`Tekshirilmagan qoldiq: ${remaining}`)

    const updated = await OperationModel.findOneAndUpdate(
      { _id: op._id, qcStatus: 'pending', outputs: { $elemMatch: { item: item._id, inspectedQty: line.inspectedQty } } },
      { $inc: { 'outputs.$.inspectedQty': checkedQty } },
      { returnDocument: 'after' },
    ).lean()
    if (!updated) conflict("Operatsiya boshqa foydalanuvchi tomonidan o'zgartirildi, qayta urinib ko'ring")
    operation = {
      _id: updated._id,
      stage: updated.stage,
      complete: updated.outputs.every((o) => o.inspectedQty + 1e-6 >= o.qty),
    }
  }

  const scrapQty = body.rejectAction === 'scrap' && body.rejectedQty > 0
    ? roundQty(body.scrapQty || (item.unit === 'kg' ? body.rejectedQty : body.rejectedQty * (item.unitWeightKg ?? 0)))
    : 0
  const moves: MoveInput[] = [{ item: item._id, location: qcLoc._id, qty: -checkedQty }]
  if (body.passedQty > 0) moves.push({ item: item._id, location: passedLocation._id, qty: body.passedQty })
  if (body.rejectedQty > 0 && body.rejectAction === 'rework') moves.push({ item: item._id, location: defect._id, qty: body.rejectedQty })
  if (scrapQty > 0 && body.scrapItem) moves.push({ item: body.scrapItem, location: foundry._id, qty: scrapQty })

  const number = await nextNumber('SN')
  const doc = await QcInspectionModel.create({
    ...body,
    number,
    stage: operation?.stage ?? null,
    checkedQty,
    scrapQty,
    scrapItem: body.rejectAction === 'scrap' ? body.scrapItem : null,
    inspector: me.oid,
  })

  try {
    await applyMoves(moves, { docType: 'qc', docId: doc._id as Types.ObjectId, docNumber: number, user: me.oid, note: body.defectReason })
  } catch (error) {
    await QcInspectionModel.deleteOne({ _id: doc._id })
    if (operation) {
      await OperationModel.updateOne(
        { _id: operation._id, 'outputs.item': item._id },
        { $inc: { 'outputs.$.inspectedQty': -checkedQty }, qcStatus: 'pending' },
      )
    }
    throw error
  }

  if (operation?.complete) {
    await OperationModel.updateOne({ _id: operation._id }, { qcStatus: 'done' })
  }

  // Rejected serial-tracked units: drop surplus serials so labels match stock.
  if (operation && body.rejectedQty > 0 && item.serialTracked && body.rejectAction === 'scrap') {
    const units = await ProductUnitModel.find({ operation: operation._id, item: item._id, status: 'in_stock' })
      .sort({ serial: -1 })
      .limit(body.rejectedQty)
      .select('_id')
      .lean()
    await ProductUnitModel.deleteMany({ _id: { $in: units.map((u) => u._id) } })
  }

  setResponseStatus(event, 201)
  return ok({ _id: doc._id, number })
})
