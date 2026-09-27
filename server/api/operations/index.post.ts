import { Types } from 'mongoose'
import { ITEM_TYPE_LABELS, LOC } from '../../../shared/utils/constants'
import { STAGE_CONFIG } from '../../../shared/utils/stages'

export default defineEventHandler(async (event) => {
  const body = await parseBody(event, operationSchema)
  const me = await requireAuth(event, `stage.${body.stage}`)
  const config = STAGE_CONFIG[body.stage]

  // ---- validate items against stage rules
  const lineItems = [...body.inputs, ...body.outputs, ...body.wastes].map((l) => l.item)
  const items = new Map(
    (await ItemModel.find({ _id: { $in: lineItems } }).lean()).map((i) => [String(i._id), i]),
  )
  const check = (lines: { item: string; qty: number }[], allowed: readonly string[], label: string) => {
    for (const l of lines) {
      const item = items.get(l.item)
      if (!item || !item.active) conflict(`${label}: mahsulot topilmadi`)
      if (!allowed.includes(item.type)) {
        conflict(`${label}: "${item.name}" (${ITEM_TYPE_LABELS[item.type]}) bu bosqichga mos emas`)
      }
      if (item.unit === 'dona' && !Number.isInteger(l.qty)) conflict(`"${item.name}" miqdori butun son bo'lishi kerak`)
    }
  }
  check(body.inputs, config.inputTypes, 'Sarf')
  check(body.outputs, config.outputTypes, 'Natija')
  if (body.wastes.length && !config.wasteAllowed) conflict("Bu bosqichda qirindi qaytarilmaydi")
  check(body.wastes, ['scrap'], 'Qirindi')

  // ---- resolve locations
  const [source, target, qcLoc, foundry] = await Promise.all([
    LocationModel.findOne({ _id: body.sourceLocation, active: true }).lean(),
    LocationModel.findOne({ _id: body.targetLocation, active: true }).lean(),
    getLocationByCode(LOC.QC),
    getLocationByCode(LOC.FOUNDRY),
  ])
  if (!source || !target) conflict('Joy topilmadi')
  if (body.handoverTo && body.qcRequired) conflict("Sifat nazoratidan so'ng mahsulotni nazoratchi o'zi keyingi bo'limga o'tkazadi")
  const outputLocation = body.qcRequired ? qcLoc._id : target._id

  let worker = me.oid
  if (body.worker && body.worker !== me.id) {
    const w = await UserModel.findOne({ _id: body.worker, active: true }).lean()
    if (!w) conflict('Ishchi topilmadi')
    worker = w._id
  }

  const moves = [
    ...body.inputs.map((l) => ({ item: l.item, location: source._id, qty: -l.qty })),
    ...body.outputs.map((l) => ({ item: l.item, location: outputLocation, qty: l.qty })),
    ...body.wastes.map((l) => ({ item: l.item, location: foundry._id, qty: l.qty })),
  ]
  await assertAvailable(moves)

  // ---- serial numbers (labels) for serial-tracked finished goods
  const serialLines = config.serials ? body.outputs.filter((l) => items.get(l.item)?.serialTracked) : []
  const serialCount = serialLines.reduce((s, l) => s + l.qty, 0)
  const serials = serialCount ? await generateSerials(serialCount) : []

  const number = await nextNumber('IO')
  const doc = await OperationModel.create({
    number,
    stage: body.stage,
    sourceLocation: source._id,
    targetLocation: outputLocation,
    afterQcLocation: body.qcRequired ? (body.afterQcLocation ?? target._id) : null,
    worker,
    createdBy: me.oid,
    qcRequired: body.qcRequired,
    qcStatus: body.qcRequired ? 'pending' : 'none',
    inputs: body.inputs,
    outputs: body.outputs.map((l) => ({ ...l, inspectedQty: 0 })),
    wastes: body.wastes,
    serials,
    note: body.note,
  })

  try {
    await applyMoves(moves, {
      docType: 'operation',
      docId: doc._id as Types.ObjectId,
      docNumber: number,
      user: me.oid,
      note: config.label,
    })
  } catch (error) {
    await OperationModel.deleteOne({ _id: doc._id })
    throw error
  }

  if (serials.length) {
    let cursor = 0
    const units = serialLines.flatMap((l) =>
      Array.from({ length: l.qty }, () => ({ serial: serials[cursor++], item: l.item, operation: doc._id })),
    )
    await ProductUnitModel.insertMany(units)
  }

  // "Made it → handed it over" in one step: the next department still has to accept.
  let handover: { _id: Types.ObjectId; number: string } | null = null
  if (body.handoverTo) {
    try {
      handover = await createTransfer({
        from: outputLocation,
        to: body.handoverTo,
        receiver: body.handoverReceiver,
        note: `${config.department}: ${config.label} (${number})`,
        lines: body.outputs,
        sender: worker,
      })
      await OperationModel.updateOne({ _id: doc._id }, { handoverTransfer: handover._id })
    } catch (error) {
      // The operation itself is valid; report the handover problem without rolling it back.
      setResponseStatus(event, 201)
      return ok({ _id: doc._id, number, serials, handover: null, handoverError: errorText(error) })
    }
  }

  setResponseStatus(event, 201)
  return ok({ _id: doc._id, number, serials, handover, handoverError: null })
})
