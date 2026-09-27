import { Types } from 'mongoose'
import {
  DOC_TYPE_LABELS,
  ITEM_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  QC_STATUS_LABELS,
  ROLE_LABELS,
  SALES_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
  type DocType,
  type ItemType,
  type LeadStatus,
  type Role,
  type SalesStatus,
  type TransferStatus,
} from '../../shared/utils/constants'
import { roundQty } from '../../shared/utils/format'
import { STAGE_CONFIG, STAGES, type Stage } from '../../shared/utils/stages'

// Read-only tools the AI assistant can call. Every tool returns plain JSON sized for a model context.
// The only tool that writes anything is create_excel, and it only creates a downloadable file.

export interface ToolContext {
  user: Types.ObjectId
  chat: Types.ObjectId | null
  files: { id: string; name: string; url: string }[]
}

type Args = Record<string, unknown>

export interface AiTool {
  name: string
  description: string
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  run: (args: Args, ctx: ToolContext) => Promise<unknown>
}

// ---------------------------------------------------------------- argument helpers

const TZ = '+05:00' // Asia/Tashkent
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown, def: number, max: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : def
}
const rx = (v: string) => new RegExp(escapeRegex(v), 'i')
const day = (d: Date) => new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 10)
const dt = (d: Date | string | null | undefined) => (d ? new Date(new Date(d).getTime() + 5 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') : null)

/** Models sometimes send words instead of dates; map the common ones to YYYY-MM-DD (Tashkent). */
function normalizeDay(value: string | undefined): string | undefined {
  if (!value) return undefined
  const v = value.toLowerCase()
  const today = day(new Date())
  if (['bugun', 'today', 'сегодня'].includes(v)) return today
  if (['kecha', 'yesterday', 'вчера'].includes(v)) return day(new Date(Date.now() - 86_400_000))
  return value
}

/** Date range from "YYYY-MM-DD" strings (Tashkent time). Defaults to the last `defaultDays` days. */
function range(args: Args, defaultDays = 30) {
  const from = normalizeDay(str(args.from))
  const to = normalizeDay(str(args.to)) ?? (from && str(args.from) !== from ? from : undefined)
  const end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999${TZ}`) : new Date()
  const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00${TZ}`) : new Date(end.getTime() - defaultDays * 86_400_000)
  return { $gte: start, $lte: end, label: `${day(start)} — ${day(end)}` }
}
const period = (r: ReturnType<typeof range>) => ({ $gte: r.$gte, $lte: r.$lte })

async function findEmployees(query: string | undefined) {
  if (!query) return []
  const r = rx(query.replace(/^@/, ''))
  return UserModel.find({ $or: [{ fullName: r }, { username: r }] }).populate('location', 'name').limit(10).lean()
}

async function resolveEmployee(query: string | undefined) {
  const found = await findEmployees(query)
  if (found.length === 1) return { user: found[0]! }
  if (!found.length) return { error: `"${query}" nomli hodim topilmadi. list_employees bilan ro'yxatni ko'ring.` }
  return { error: `Bir nechta hodim topildi, aniqlashtiring: ${found.map((u) => `${u.fullName} (@${u.username})`).join(', ')}` }
}

async function findItems(query: string | undefined) {
  if (!query) return null
  const items = await ItemModel.find({ $or: [{ name: rx(query) }, { code: rx(query) }] }).select('_id').limit(50).lean()
  return items.map((i) => i._id)
}

async function findLocation(query: string | undefined) {
  if (!query) return null
  return LocationModel.findOne({ $or: [{ name: rx(query) }, { code: rx(query) }] }).lean()
}

const stageLabel = (s: string | null | undefined) => (s && s in STAGE_CONFIG ? `${STAGE_CONFIG[s as Stage].department}: ${STAGE_CONFIG[s as Stage].label}` : "Qo'lda")
type Named = { name?: string; fullName?: string; unit?: string; code?: string }
const n = (v: unknown) => (v as Named | null)?.name ?? (v as Named | null)?.fullName ?? null
const lines = (list: { item: unknown; qty: number }[]) => list.map((l) => `${n(l.item)}: ${roundQty(l.qty)} ${(l.item as Named)?.unit ?? ''}`.trim()).join('; ')

// ---------------------------------------------------------------- tools

const dateProps = {
  from: { type: 'string', description: 'Boshlanish sanasi YYYY-MM-DD (Toshkent vaqti). Berilmasa — oxirgi 30 kun.' },
  to: { type: 'string', description: 'Tugash sanasi YYYY-MM-DD. Berilmasa — bugun.' },
}

export const AI_TOOLS: AiTool[] = [
  {
    name: 'get_overview',
    description: "Zavodning umumiy holati: davr bo'yicha ishlab chiqarish (bosqichlar), sifat nazorati navbati va brak foizi, qabul kutayotgan topshirishlar, tayyor mahsulot qoldig'i, kam qolgan zaxiralar, sotuv va debitor qarz, lidlar voronkasi. Umumiy savollar uchun birinchi shu vositani chaqiring.",
    parameters: { type: 'object', properties: dateProps },
    run: async (args) => {
      const r = range(args)
      const [production, qc, pendingQc, pendingTransfers, finishedLoc, sales, leads, lowStock] = await Promise.all([
        OperationModel.aggregate([
          { $match: { createdAt: period(r) } },
          { $project: { stage: 1, qty: { $sum: '$outputs.qty' } } },
          { $group: { _id: '$stage', operations: { $sum: 1 }, qty: { $sum: '$qty' } } },
        ]),
        QcInspectionModel.aggregate([{ $match: { createdAt: period(r) } }, { $group: { _id: null, checked: { $sum: '$checkedQty' }, rejected: { $sum: '$rejectedQty' } } }]),
        OperationModel.countDocuments({ qcStatus: 'pending' }),
        TransferModel.countDocuments({ status: 'pending' }),
        LocationModel.findOne({ code: 'TAYYOR' }).lean(),
        SalesOrderModel.aggregate([
          { $match: { createdAt: period(r), status: { $in: ['confirmed', 'shipped', 'completed'] } } },
          { $group: { _id: null, orders: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } },
        ]),
        LeadModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$estimatedAmount' } } }]),
        StockModel.aggregate([
          { $group: { _id: '$item', qty: { $sum: '$qty' } } },
          { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
          { $unwind: '$item' },
          { $match: { 'item.minStock': { $gt: 0 }, $expr: { $lt: ['$qty', '$item.minStock'] } } },
          { $project: { _id: 0, name: '$item.name', qty: 1, min: '$item.minStock', unit: '$item.unit' } },
        ]),
      ])
      const [allDebt] = await SalesOrderModel.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'completed'] } } },
        { $group: { _id: null, debt: { $sum: { $subtract: ['$total', '$paidAmount'] } } } },
      ])
      const finished = finishedLoc ? await StockModel.find({ location: finishedLoc._id, qty: { $gt: 0 } }).populate('item', 'name unit cost price').lean() : []
      // Totals are computed here so smaller models never have to add numbers themselves.
      const finishedRows = finished.map((s) => {
        const item = s.item as unknown as { name: string; unit: string; cost: number; price: number }
        const unitValue = item.cost || item.price
        return { item: item.name, qty: s.qty, unit: item.unit, unit_value: unitValue, total_value: Math.round(s.qty * unitValue) }
      })
      const q = qc[0] ?? { checked: 0, rejected: 0 }
      return {
        period: r.label,
        production: STAGES.map((s) => {
          const row = production.find((p) => p._id === s)
          return { stage: stageLabel(s), operations: row?.operations ?? 0, output_qty: roundQty(row?.qty ?? 0) }
        }),
        quality: { checked: q.checked, rejected: q.rejected, reject_rate_percent: q.checked ? roundQty((q.rejected / q.checked) * 100) : 0, pending_inspections_now: pendingQc },
        transfers_waiting_acceptance_now: pendingTransfers,
        finished_goods_stock_now: {
          items: finishedRows,
          total_qty: finishedRows.reduce((sum, r) => sum + r.qty, 0),
          total_value: finishedRows.reduce((sum, r) => sum + r.total_value, 0),
          currency: "so'm",
        },
        low_stock_now: lowStock,
        sales: { ...(sales[0] ?? { orders: 0, total: 0, paid: 0 }), _id: undefined, currency: "so'm" },
        receivables_total_now: allDebt?.debt ?? 0,
        leads_by_status: leads.map((l) => ({ status: LEAD_STATUS_LABELS[l._id as LeadStatus] ?? l._id, count: l.count, estimated_amount: l.amount })),
      }
    },
  },

  {
    name: 'list_employees',
    description: "Hodimlar ro'yxati: ism, login, lavozim (rol), bo'lim, faol yoki yo'q, oxirgi 30 kundagi ishlab chiqarish operatsiyalari soni.",
    parameters: { type: 'object', properties: { role: { type: 'string', description: 'Rol bo\'yicha filtr: admin, director, warehouse, supply, foundry, fettling, cnc, assembly, painter, qc, sales' } } },
    run: async (args) => {
      const role = str(args.role)
      const users = await UserModel.find(role ? { role: role as Role } : {}).populate('location', 'name').sort({ role: 1, fullName: 1 }).lean()
      const since = new Date(Date.now() - 30 * 86_400_000)
      const ops = await OperationModel.aggregate<{ _id: Types.ObjectId; n: number; last: Date }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$worker', n: { $sum: 1 }, last: { $max: '$createdAt' } } },
      ])
      const map = new Map(ops.map((o) => [String(o._id), o]))
      return users.map((u) => ({
        name: u.fullName,
        username: u.username,
        role: ROLE_LABELS[u.role as Role],
        department: n(u.location),
        active: u.active,
        operations_last_30_days: map.get(String(u._id))?.n ?? 0,
        last_operation: dt(map.get(String(u._id))?.last),
      }))
    },
  },

  {
    name: 'employee_activity',
    description: "Bitta hodim davr ichida nima qilgani — to'liq tarix: ishlab chiqarish operatsiyalari (nima tayyorladi, nima sarfladi), topshirgan va qabul qilgan mahsulotlari, sifat tekshiruvlari, sotuv buyurtmalari va qabul qilgan to'lovlari, lidlar bo'yicha faoliyati, Telegram/Instagram yozishmalari soni.",
    parameters: {
      type: 'object',
      properties: { employee: { type: 'string', description: 'Hodim ismi yoki logini (qisman ham bo\'ladi)' }, ...dateProps },
      required: ['employee'],
    },
    run: async (args) => {
      const found = await resolveEmployee(str(args.employee))
      if ('error' in found) return found
      const u = found.user
      const r = range(args)
      const createdAt = period(r)
      const [operations, sent, received, inspections, orders, paymentsAgg, leads, messages] = await Promise.all([
        OperationModel.find({ worker: u._id, createdAt }).sort({ createdAt: -1 }).limit(100).populate(OPERATION_POPULATE).lean(),
        TransferModel.find({ sender: u._id, createdAt }).sort({ createdAt: -1 }).limit(50).populate(TRANSFER_POPULATE).lean(),
        TransferModel.find({ acceptedBy: u._id, resolvedAt: createdAt }).sort({ resolvedAt: -1 }).limit(50).populate(TRANSFER_POPULATE).lean(),
        QcInspectionModel.find({ inspector: u._id, createdAt }).sort({ createdAt: -1 }).limit(100).populate(QC_POPULATE).lean(),
        SalesOrderModel.find({ manager: u._id, createdAt }).sort({ createdAt: -1 }).limit(50).populate('customer', 'name').lean(),
        SalesOrderModel.aggregate([
          { $unwind: '$payments' },
          { $match: { 'payments.user': u._id, 'payments.date': createdAt } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$payments.amount' } } },
        ]),
        LeadModel.aggregate([
          { $unwind: '$activities' },
          { $match: { 'activities.user': u._id, 'activities.createdAt': createdAt } },
          { $project: { title: 1, status: 1, type: '$activities.type', text: '$activities.text', at: '$activities.createdAt' } },
          { $sort: { at: -1 } },
          { $limit: 50 },
        ]),
        ChatMessageModel.aggregate([
          { $match: { user: u._id, direction: 'out', createdAt } },
          { $group: { _id: null, sent: { $sum: 1 } } },
        ]),
      ])
      const outputs = new Map<string, number>()
      for (const op of operations) for (const o of op.outputs) outputs.set(`${n(o.item)} (${(o.item as Named).unit})`, roundQty((outputs.get(`${n(o.item)} (${(o.item as Named).unit})`) ?? 0) + o.qty))
      return {
        employee: { name: u.fullName, username: u.username, role: ROLE_LABELS[u.role as Role], department: n(u.location), active: u.active },
        period: r.label,
        production: {
          operations_count: operations.length,
          total_output_by_item: Object.fromEntries(outputs),
          operations: operations.slice(0, 40).map((op) => ({
            number: op.number,
            at: dt(op.createdAt),
            stage: stageLabel(op.stage),
            output: lines(op.outputs),
            consumed: lines(op.inputs),
            scrap_returned: lines(op.wastes),
            quality_status: QC_STATUS_LABELS[op.qcStatus],
          })),
        },
        handovers_sent: sent.map((t) => ({ number: t.number, at: dt(t.createdAt), from: n(t.from), to: n(t.to), goods: lines(t.lines), status: TRANSFER_STATUS_LABELS[t.status] })),
        handovers_accepted: received.map((t) => ({ number: t.number, at: dt(t.resolvedAt), from: n(t.from), to: n(t.to), goods: lines(t.lines), status: TRANSFER_STATUS_LABELS[t.status] })),
        quality_inspections: inspections.map((i) => ({ number: i.number, at: dt(i.createdAt), item: n(i.item), checked: i.checkedQty, passed: i.passedQty, rejected: i.rejectedQty, reason: i.defectReason ?? null })),
        sales_orders: orders.map((o) => ({ number: o.number, at: dt(o.createdAt), customer: n(o.customer), status: SALES_STATUS_LABELS[o.status as SalesStatus], total: o.total, paid: o.paidAmount })),
        payments_received: paymentsAgg[0] ? { count: paymentsAgg[0].count, amount: paymentsAgg[0].amount } : { count: 0, amount: 0 },
        lead_activities: leads.map((l) => ({ lead: l.title, type: l.type, text: String(l.text).slice(0, 200), at: dt(l.at) })),
        messages_sent_to_clients: messages[0]?.sent ?? 0,
      }
    },
  },

  {
    name: 'search_operations',
    description: "Ishlab chiqarish operatsiyalarini qidirish (bosqich, hodim, mahsulot, sana bo'yicha) va mahsulot bo'yicha jami natija. Bosqichlar: casting (liteyka quyish), cleaning (pishka stroy tozalash), cnc (CHPU), winding (obmotka), assembly (yig'ish), painting (bo'yash), packaging (birka va qadoqlash).",
    parameters: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: [...STAGES] },
        employee: { type: 'string', description: 'Hodim ismi yoki logini' },
        item: { type: 'string', description: 'Natija mahsulot nomi yoki kodi' },
        ...dateProps,
        limit: { type: 'number', description: "Qaytariladigan operatsiyalar soni (standart 50, maksimum 200)" },
      },
    },
    run: async (args) => {
      const r = range(args)
      const filter: Record<string, unknown> = { createdAt: period(r) }
      const stage = str(args.stage)
      if (stage) filter.stage = stage
      if (str(args.employee)) {
        const found = await resolveEmployee(str(args.employee))
        if ('error' in found) return found
        filter.worker = found.user._id
      }
      const items = await findItems(str(args.item))
      if (items) filter['outputs.item'] = { $in: items }
      const limit = num(args.limit, 50, 200)
      const [ops, total] = await Promise.all([
        OperationModel.find(filter).sort({ createdAt: -1 }).limit(limit).populate(OPERATION_POPULATE).lean(),
        OperationModel.countDocuments(filter),
      ])
      const byItem = await OperationModel.aggregate([
        { $match: filter },
        { $unwind: '$outputs' },
        ...(items ? [{ $match: { 'outputs.item': { $in: items } } }] : []),
        { $group: { _id: '$outputs.item', qty: { $sum: '$outputs.qty' } } },
        { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
        { $unwind: '$item' },
        { $project: { _id: 0, item: '$item.name', unit: '$item.unit', qty: 1 } },
      ])
      return {
        period: r.label,
        total_operations: total,
        total_output_by_item: byItem,
        operations: ops.map((op) => ({
          number: op.number,
          at: dt(op.createdAt),
          stage: stageLabel(op.stage),
          worker: n(op.worker),
          output: lines(op.outputs),
          consumed: lines(op.inputs),
          scrap_returned: lines(op.wastes),
          quality_status: QC_STATUS_LABELS[op.qcStatus],
          serials: op.serials.length ? op.serials.join(', ') : undefined,
        })),
      }
    },
  },

  {
    name: 'get_stock',
    description: "Joriy ombor qoldiqlari: qaysi bo'lim/omborda qaysi mahsulotdan qancha bor va qiymati. Joy yoki mahsulot nomi bo'yicha filtr, faqat kam qolganlarni ko'rsatish mumkin.",
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: "Joy nomi yoki kodi (XOMASHYO, LITEYKA, PISHKA, CHPU, SKLAD, YIGUV, BOYOQ, SIFAT, TAYYOR, BRAK)" },
        item: { type: 'string', description: 'Mahsulot nomi yoki kodi' },
        type: { type: 'string', enum: ['raw', 'casting', 'semi', 'component', 'material', 'finished', 'scrap'] },
        only_low: { type: 'boolean', description: "Faqat minimal zaxiradan kam qolganlar" },
      },
    },
    run: async (args) => {
      const filter: Record<string, unknown> = { qty: { $gt: 0.0000001 } }
      if (str(args.location)) {
        const loc = await findLocation(str(args.location))
        if (!loc) return { error: `"${args.location}" joyi topilmadi` }
        filter.location = loc._id
      }
      const items = await findItems(str(args.item))
      const type = str(args.type)
      if (items || type) {
        const itemFilter: Record<string, unknown> = {}
        if (items) itemFilter._id = { $in: items }
        if (type) itemFilter.type = type
        filter.item = { $in: await ItemModel.find(itemFilter).distinct('_id') }
      }
      const rows = await StockModel.find(filter).populate('item', 'code name unit type cost price minStock').populate('location', 'name order').limit(500).lean()
      let result = rows.map((s) => {
        const item = s.item as unknown as { code: string; name: string; unit: string; type: ItemType; cost: number; price: number; minStock: number }
        return {
          location: n(s.location),
          code: item.code,
          item: item.name,
          type: ITEM_TYPE_LABELS[item.type],
          qty: roundQty(s.qty),
          unit: item.unit,
          min_stock: item.minStock || undefined,
          value_at_cost: Math.round(s.qty * (item.cost || item.price)),
        }
      })
      if (args.only_low === true) {
        const totals = new Map<string, number>()
        for (const r of result) totals.set(r.code, (totals.get(r.code) ?? 0) + r.qty)
        result = result.filter((r) => r.min_stock && (totals.get(r.code) ?? 0) < r.min_stock)
      }
      return {
        rows: result,
        total_qty_by_unit: result.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.unit]: roundQty((acc[r.unit] ?? 0) + r.qty) }), {}),
        total_value_at_cost: result.reduce((s, r) => s + r.value_at_cost, 0),
        currency: "so'm",
      }
    },
  },

  {
    name: 'search_transfers',
    description: "Bo'limlar orasidagi topshirishlar (kim kimga nima topshirdi, qabul qilindimi yoki rad etildimi, sababi).",
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'cancelled'] },
        location: { type: 'string', description: "Qayerdan yoki qayerga (joy nomi/kodi)" },
        ...dateProps,
        limit: { type: 'number' },
      },
    },
    run: async (args) => {
      const r = range(args)
      const filter: Record<string, unknown> = { createdAt: period(r) }
      if (str(args.status)) filter.status = str(args.status)
      if (str(args.location)) {
        const loc = await findLocation(str(args.location))
        if (!loc) return { error: `"${args.location}" joyi topilmadi` }
        filter.$or = [{ from: loc._id }, { to: loc._id }]
      }
      const rows = await TransferModel.find(filter).sort({ createdAt: -1 }).limit(num(args.limit, 50, 200)).populate(TRANSFER_POPULATE).lean()
      return {
        period: r.label,
        transfers: rows.map((t) => ({
          number: t.number,
          at: dt(t.createdAt),
          from: n(t.from),
          to: n(t.to),
          goods: lines(t.lines),
          sender: n(t.sender),
          accepted_by: n(t.acceptedBy),
          status: TRANSFER_STATUS_LABELS[t.status as TransferStatus],
          reject_reason: t.rejectReason ?? undefined,
          resolved_at: dt(t.resolvedAt),
        })),
      }
    },
  },

  {
    name: 'quality_report',
    description: "Sifat nazorati hisoboti: bosqichlar bo'yicha tekshirilgan/o'tgan/brak soni va foizi, eng ko'p nuqson sabablari, so'nggi brak holatlari, qaysi ishchi mahsulotida brak ko'p.",
    parameters: { type: 'object', properties: dateProps },
    run: async (args) => {
      const r = range(args)
      const match = { createdAt: period(r) }
      const [byStage, reasons, recent, byWorker] = await Promise.all([
        QcInspectionModel.aggregate([
          { $match: match },
          { $group: { _id: '$stage', checked: { $sum: '$checkedQty' }, passed: { $sum: '$passedQty' }, rejected: { $sum: '$rejectedQty' }, scrap_kg: { $sum: '$scrapQty' } } },
        ]),
        QcInspectionModel.aggregate([
          { $match: { ...match, rejectedQty: { $gt: 0 } } },
          { $group: { _id: { $ifNull: ['$defectReason', "ko'rsatilmagan"] }, qty: { $sum: '$rejectedQty' } } },
          { $sort: { qty: -1 } },
          { $limit: 10 },
        ]),
        QcInspectionModel.find({ ...match, rejectedQty: { $gt: 0 } }).sort({ createdAt: -1 }).limit(20).populate(QC_POPULATE).lean(),
        QcInspectionModel.aggregate([
          { $match: { ...match, operation: { $ne: null } } },
          { $lookup: { from: 'operations', localField: 'operation', foreignField: '_id', as: 'op' } },
          { $unwind: '$op' },
          { $group: { _id: '$op.worker', checked: { $sum: '$checkedQty' }, rejected: { $sum: '$rejectedQty' } } },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
          { $unwind: '$u' },
          { $project: { _id: 0, worker: '$u.fullName', checked: 1, rejected: 1 } },
          { $sort: { rejected: -1 } },
        ]),
      ])
      return {
        period: r.label,
        by_stage: byStage.map((s) => ({ stage: stageLabel(s._id), checked: s.checked, passed: s.passed, rejected: s.rejected, reject_rate_percent: s.checked ? roundQty((s.rejected / s.checked) * 100) : 0, scrap_kg: roundQty(s.scrap_kg) })),
        top_defect_reasons: reasons.map((x) => ({ reason: x._id, qty: x.qty })),
        by_worker: byWorker,
        recent_rejections: recent.map((i) => ({ number: i.number, at: dt(i.createdAt), stage: stageLabel(i.stage), item: n(i.item), rejected: i.rejectedQty, reason: i.defectReason ?? null, inspector: n(i.inspector) })),
      }
    },
  },

  {
    name: 'search_sales',
    description: "Sotuv buyurtmalari: mijoz, menejer, holat, summa, to'langan va qarz. Jami summalar va mahsulotlar bo'yicha sotuv ham qaytadi.",
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'confirmed', 'shipped', 'completed', 'cancelled'] },
        customer: { type: 'string', description: 'Mijoz nomi yoki STIR' },
        manager: { type: 'string', description: 'Sotuv menejeri ismi' },
        with_debt: { type: 'boolean', description: "Faqat qarzi bor buyurtmalar" },
        ...dateProps,
        limit: { type: 'number' },
      },
    },
    run: async (args) => {
      const r = range(args)
      const filter: Record<string, unknown> = { createdAt: period(r) }
      if (str(args.status)) filter.status = str(args.status)
      if (str(args.customer)) {
        const q = rx(str(args.customer)!)
        filter.customer = { $in: await CounterpartyModel.find({ $or: [{ name: q }, { legalName: q }, { inn: q }] }).distinct('_id') }
      }
      if (str(args.manager)) {
        const found = await resolveEmployee(str(args.manager))
        if ('error' in found) return found
        filter.manager = found.user._id
      }
      if (args.with_debt === true) filter.$expr = { $gt: ['$total', '$paidAmount'] }
      const [orders, totals, byItem] = await Promise.all([
        SalesOrderModel.find(filter).sort({ createdAt: -1 }).limit(num(args.limit, 50, 200)).populate('customer', 'name').populate('manager', 'fullName').populate('lines.item', 'name unit').lean(),
        SalesOrderModel.aggregate([
          { $match: { ...filter, status: filter.status ?? { $in: ['confirmed', 'shipped', 'completed'] } } },
          { $group: { _id: null, orders: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } },
        ]),
        SalesOrderModel.aggregate([
          { $match: { ...filter, status: filter.status ?? { $in: ['confirmed', 'shipped', 'completed'] } } },
          { $unwind: '$lines' },
          { $group: { _id: '$lines.item', qty: { $sum: '$lines.qty' }, amount: { $sum: { $multiply: ['$lines.qty', '$lines.price'] } } } },
          { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'item' } },
          { $unwind: '$item' },
          { $sort: { amount: -1 } },
          { $project: { _id: 0, item: '$item.name', qty: 1, amount: 1 } },
        ]),
      ])
      const t = totals[0] ?? { orders: 0, total: 0, paid: 0 }
      return {
        period: r.label,
        totals: { orders: t.orders, total: t.total, paid: t.paid, debt: t.total - t.paid, currency: "so'm", note: 'Qoralama va bekor qilinganlar jamiga kirmaydi' },
        by_item: byItem,
        orders: orders.map((o) => ({
          number: o.number,
          at: dt(o.createdAt),
          customer: n(o.customer),
          manager: n(o.manager),
          status: SALES_STATUS_LABELS[o.status as SalesStatus],
          items: lines(o.lines),
          total: o.total,
          paid: o.paidAmount,
          debt: ['draft', 'cancelled'].includes(o.status) ? 0 : o.total - o.paidAmount,
          shipped_at: dt(o.shippedAt),
        })),
      }
    },
  },

  {
    name: 'search_clients',
    description: "B2B va boshqa mijozlar: rekvizitlar, soha, mas'ul menejer, jami xaridlar, to'langan, qarz, kredit limiti, oxirgi buyurtma sanasi.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nomi, STIR, telefon yoki viloyat' },
        with_debt: { type: 'boolean' },
        limit: { type: 'number' },
      },
    },
    run: async (args) => {
      const filter: Record<string, unknown> = { type: { $in: ['customer', 'both'] } }
      if (str(args.query)) {
        const q = rx(str(args.query)!)
        filter.$or = [{ name: q }, { legalName: q }, { inn: q }, { phone: q }, { region: q }]
      }
      const clients = await CounterpartyModel.find(filter).populate('manager', 'fullName').limit(500).lean()
      const stats = await clientStats(clients.map((c) => c._id))
      let rows = clients.map((c) => {
        const s = stats(c._id)
        return {
          name: c.name,
          legal_name: c.legalName,
          inn: c.inn,
          kind: c.kind ?? 'b2b',
          segment: c.segment,
          region: c.region,
          phone: c.phone,
          manager: n(c.manager),
          contract: c.contractNumber,
          credit_limit: c.creditLimit || undefined,
          orders: s.orders,
          total_purchases: s.total,
          paid: s.paid,
          debt: s.debt,
          over_credit_limit: !!c.creditLimit && s.debt > c.creditLimit,
          last_order: dt(s.lastOrderAt),
          open_leads: s.openLeads,
        }
      })
      if (args.with_debt === true) rows = rows.filter((r) => r.debt > 0)
      rows.sort((a, b) => b.total_purchases - a.total_purchases)
      return { count: rows.length, clients: rows.slice(0, num(args.limit, 50, 300)) }
    },
  },

  {
    name: 'search_leads',
    description: "CRM lidlari (potensial mijozlar): holat, manba (telegram, instagram, qo'ng'iroq...), mas'ul menejer, taxminiy summa, oxirgi faoliyat. Voronka statistikasi ham qaytadi.",
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] },
        manager: { type: 'string' },
        query: { type: 'string' },
        ...dateProps,
        limit: { type: 'number' },
      },
    },
    run: async (args) => {
      const r = range(args, 90)
      const filter: Record<string, unknown> = { createdAt: period(r) }
      if (str(args.status)) filter.status = str(args.status)
      if (str(args.manager)) {
        const found = await resolveEmployee(str(args.manager))
        if ('error' in found) return found
        filter.manager = found.user._id
      }
      if (str(args.query)) {
        const q = rx(str(args.query)!)
        filter.$or = [{ title: q }, { contactName: q }, { company: q }, { phone: q }]
      }
      const [leads, funnel] = await Promise.all([
        LeadModel.find(filter).sort({ updatedAt: -1 }).limit(num(args.limit, 50, 200)).populate('manager', 'fullName').lean(),
        LeadModel.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$estimatedAmount' } } }]),
      ])
      return {
        period: `yaratilgan: ${r.label}`,
        funnel: funnel.map((f) => ({ status: LEAD_STATUS_LABELS[f._id as LeadStatus], count: f.count, estimated_amount: f.amount })),
        leads: leads.map((l) => ({
          title: l.title,
          contact: l.contactName,
          phone: l.phone,
          company: l.company,
          source: l.source,
          status: LEAD_STATUS_LABELS[l.status as LeadStatus],
          manager: n(l.manager),
          estimated_amount: l.estimatedAmount,
          created: dt(l.createdAt),
          last_activity: l.activities[0] ? `${dt(l.activities[0].createdAt)}: ${l.activities[0].text.slice(0, 120)}` : null,
          open_tasks: l.activities.filter((a) => a.type === 'task' && !a.done).length,
        })),
      }
    },
  },

  {
    name: 'messaging_summary',
    description: "Sotuv menejerlarining Telegram/Instagram yozishmalari statistikasi: nechta suhbat, kiruvchi va chiquvchi xabarlar, javobsiz qolgan (o'qilmagan) mijozlar. Xabar matnlari qaytarilmaydi.",
    parameters: { type: 'object', properties: { manager: { type: 'string' }, ...dateProps } },
    run: async (args) => {
      const r = range(args, 7)
      const convFilter: Record<string, unknown> = {}
      if (str(args.manager)) {
        const found = await resolveEmployee(str(args.manager))
        if ('error' in found) return found
        convFilter.manager = found.user._id
      }
      const conversations = await ConversationModel.find(convFilter).select('_id manager unread lastMessageAt contactName channelType').populate('manager', 'fullName').lean()
      const ids = conversations.map((c) => c._id)
      const counts = await ChatMessageModel.aggregate<{ _id: { c: Types.ObjectId; d: string }; n: number }>([
        { $match: { conversation: { $in: ids }, createdAt: period(r) } },
        { $group: { _id: { c: '$conversation', d: '$direction' }, n: { $sum: 1 } } },
      ])
      const byManager = new Map<string, { manager: string; conversations: number; active_conversations: number; incoming: number; outgoing: number; unanswered: string[] }>()
      for (const c of conversations) {
        const name = n(c.manager) ?? '—'
        const row = byManager.get(name) ?? { manager: name, conversations: 0, active_conversations: 0, incoming: 0, outgoing: 0, unanswered: [] }
        row.conversations++
        const inc = counts.find((x) => x._id.c.equals(c._id) && x._id.d === 'in')?.n ?? 0
        const out = counts.find((x) => x._id.c.equals(c._id) && x._id.d === 'out')?.n ?? 0
        if (inc || out) row.active_conversations++
        row.incoming += inc
        row.outgoing += out
        if (c.unread > 0) row.unanswered.push(`${c.contactName} (${c.channelType}, ${c.unread} ta, oxirgi ${dt(c.lastMessageAt)})`)
        byManager.set(name, row)
      }
      return { period: r.label, managers: [...byManager.values()] }
    },
  },

  {
    name: 'stock_movements',
    description: "Ombor harakatlari jurnali: qaysi mahsulot qachon, qayerda, qaysi hujjat bilan, kim tomonidan kirim/chiqim qilingani.",
    parameters: {
      type: 'object',
      properties: {
        item: { type: 'string' },
        location: { type: 'string' },
        doc_type: { type: 'string', enum: ['receipt', 'transfer', 'operation', 'qc', 'adjustment', 'sale'] },
        ...dateProps,
        limit: { type: 'number' },
      },
    },
    run: async (args) => {
      const r = range(args)
      const filter: Record<string, unknown> = { createdAt: period(r) }
      const items = await findItems(str(args.item))
      if (items) filter.item = { $in: items }
      if (str(args.location)) {
        const loc = await findLocation(str(args.location))
        if (!loc) return { error: `"${args.location}" joyi topilmadi` }
        filter.location = loc._id
      }
      if (str(args.doc_type)) filter.docType = str(args.doc_type)
      const moves = await StockMoveModel.find(filter).sort({ createdAt: -1 }).limit(num(args.limit, 80, 300)).populate('item', 'name unit').populate('location', 'name').populate('user', 'fullName').lean()
      return {
        period: r.label,
        moves: moves.map((m) => ({
          at: dt(m.createdAt),
          document: `${DOC_TYPE_LABELS[m.docType as DocType]} ${m.docNumber}`,
          location: n(m.location),
          item: n(m.item),
          qty: roundQty(m.qty),
          unit: (m.item as unknown as Named)?.unit,
          by: n(m.user),
          note: m.note,
        })),
      }
    },
  },

  {
    name: 'create_excel',
    description: "Excel (.xlsx) fayl yaratadi va yuklab olish havolasini qaytaradi. Foydalanuvchi Excel, jadval, hujjat yoki fayl so'rasa: AVVAL kerakli ma'lumotni boshqa vositalar bilan oling, KEYIN shu vositaga ustunlar va qatorlarni to'liq bering. Raqamlarni son (number) sifatida bering, matn sifatida emas.",
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: "Fayl nomi, masalan: 'Sentabr sotuv hisoboti'" },
        sheets: {
          type: 'array',
          description: 'Varaqlar (kamida bitta)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Varaq nomi (31 belgigacha)' },
              title: { type: 'string', description: 'Jadval ustidagi sarlavha (ixtiyoriy)' },
              columns: { type: 'array', items: { type: 'string' }, description: 'Ustun nomlari' },
              rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: "Qatorlar: har biri ustunlar tartibidagi qiymatlar (raqamlar avtomatik son bo'ladi)" },
            },
            required: ['name', 'columns', 'rows'],
          },
        },
      },
      required: ['filename', 'sheets'],
    },
    run: async (args, ctx) => {
      const sheets = Array.isArray(args.sheets) ? (args.sheets as ExcelSheet[]) : []
      const valid = sheets.filter((s) => s && Array.isArray(s.columns) && Array.isArray(s.rows))
      if (!valid.length) return { error: "sheets bo'sh yoki noto'g'ri: har bir varaqda columns va rows bo'lishi kerak" }
      const file = await createExcelFile({ filename: str(args.filename) ?? 'hisobot', sheets: valid, user: ctx.user, chat: ctx.chat })
      ctx.files.push(file)
      return { created: true, file_name: file.name, download_url: file.url, rows: valid.reduce((s, x) => s + x.rows.length, 0) }
    },
  },
]

const MAX_RESULT_CHARS = 24_000

/** Runs a tool by name; errors are returned to the model as data so it can recover. */
export async function runAiTool(name: string, args: Args, ctx: ToolContext): Promise<string> {
  const tool = AI_TOOLS.find((t) => t.name === name)
  if (!tool) return JSON.stringify({ error: `Noma'lum vosita: ${name}` })
  try {
    const json = JSON.stringify(await tool.run(args ?? {}, ctx))
    return json.length > MAX_RESULT_CHARS
      ? `${json.slice(0, MAX_RESULT_CHARS)}… [natija qisqartirildi: filtrlarni toraytiring yoki limit kamaytiring]`
      : json
  } catch (error) {
    return JSON.stringify({ error: errorText(error) })
  }
}
