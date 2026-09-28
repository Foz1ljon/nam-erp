export const OPERATION_POPULATE = [
  { path: 'sourceLocation', select: LOCATION_REF },
  { path: 'targetLocation', select: LOCATION_REF },
  { path: 'afterQcLocation', select: LOCATION_REF },
  { path: 'worker', select: USER_REF },
  { path: 'createdBy', select: USER_REF },
  { path: 'inputs.item', select: ITEM_REF },
  { path: 'outputs.item', select: ITEM_REF },
  { path: 'wastes.item', select: ITEM_REF },
  { path: 'handoverTransfer', select: 'number status to', populate: { path: 'to', select: LOCATION_REF } },
]

export const QC_POPULATE = [
  { path: 'operation', select: 'number stage' },
  { path: 'item', select: ITEM_REF },
  { path: 'scrapItem', select: ITEM_REF },
  { path: 'passedLocation', select: LOCATION_REF },
  { path: 'inspector', select: USER_REF },
]

/** Serial numbers for labels: NM-YYMM-000001 (sequence is global so serials never repeat). */
export async function generateSerials(count: number): Promise<string[]> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: 'SERIAL' },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: 'after', lean: true },
  )
  // Year and month of the Tashkent calendar (the server may run in UTC).
  const now = new Date(Date.now() + TASHKENT_OFFSET_MS)
  const prefix = `NM-${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const first = counter!.seq - count + 1
  return Array.from({ length: count }, (_, i) => `${prefix}-${String(first + i).padStart(6, '0')}`)
}
