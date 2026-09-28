<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { ItemRef, UserRef } from '#shared/types/models'
import type { ItemType } from '#shared/utils/constants'
import type { Stage } from '#shared/utils/stages'

definePageMeta({ permission: ['reports.view'] })
useHead({ title: 'Hisobotlar — NamMotors ERP' })

interface ProductionRow {
  stage: Stage
  qty: number
  operations: number
  weightKg: number
  worker: Pick<UserRef, '_id' | 'fullName' | 'role'>
  item: Pick<ItemRef, '_id' | 'code' | 'name' | 'unit'>
}
interface ProductionReport {
  outputs: ProductionRow[]
  wastes: { stage: Stage; qty: number }[]
}
interface QcReport {
  byStage: { stage: Stage | 'manual'; checked: number; passed: number; rejected: number; scrapKg: number; inspections: number }[]
  reasons: { reason: string; qty: number; count: number }[]
}
interface Totals {
  total: number
  paid: number
  count: number
}
interface SalesReport {
  byDay: ({ day: string } & Totals)[]
  byItem: { qty: number; amount: number; item: Pick<ItemRef, '_id' | 'code' | 'name' | 'unit' | 'type'> }[]
  byManager: ({ manager: { _id: string; fullName: string } } & Totals)[]
  totals: Totals
}
interface StockValueRow {
  type: ItemType
  costValue: number
  saleValue: number
  positions: number
  location: { _id: string; code: string; name: string }
}

const tab = ref<'production' | 'workers' | 'qc' | 'sales' | 'stock'>('production')
// Shared between server render and hydration (a fresh `new Date()` on each side would change the request key).
// Current month in Tashkent time, whatever zone the server renders in.
const range = useState<[number, number]>('reports:range', () => [startOfMonth().getTime(), endOfDay().getTime()])
const query = computed(() => ({ from: new Date(range.value[0]).toISOString(), to: new Date(range.value[1]).toISOString() }))

const { data: production, pending: p1 } = await useApiData<ProductionReport>('/api/reports/production', { query, default: () => ({ outputs: [], wastes: [] }) })
const { data: qc, pending: p2 } = await useApiData<QcReport>('/api/reports/qc', { query, default: () => ({ byStage: [], reasons: [] }) })
const { data: sales, pending: p3 } = await useApiData<SalesReport>('/api/reports/sales', {
  query,
  default: () => ({ byDay: [], byItem: [], byManager: [], totals: { total: 0, paid: 0, count: 0 } }),
})
const { data: stockValue } = await useApiData<StockValueRow[]>('/api/reports/stock-value', { default: () => [] })

// ---- production by stage & item
interface StageItemRow {
  key: string
  stage: Stage
  item: string
  unit: string
  qty: number
  weightKg: number
  operations: number
}
const stageItems = computed<StageItemRow[]>(() => {
  const map = new Map<string, StageItemRow>()
  for (const r of production.value.outputs) {
    const key = `${r.stage}:${r.item._id}`
    const row = map.get(key) ?? { key, stage: r.stage, item: r.item.name, unit: r.item.unit, qty: 0, weightKg: 0, operations: 0 }
    row.qty += r.qty
    row.weightKg += r.weightKg
    row.operations += r.operations
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage))
})
const stageItemColumns: DataTableColumns<StageItemRow> = [
  { title: 'Bosqich', key: 'stage', width: 220, render: (r) => `${STAGE_CONFIG[r.stage].department}: ${STAGE_CONFIG[r.stage].label}` },
  { title: 'Mahsulot', key: 'item', minWidth: 240 },
  { title: 'Miqdor', key: 'qty', width: 130, align: 'right', render: (r) => fmtQty(r.qty, r.unit) },
  { title: "Og'irlik", key: 'weightKg', width: 130, align: 'right', render: (r) => (r.weightKg ? fmtQty(r.weightKg, 'kg') : '—') },
  { title: 'Operatsiyalar', key: 'operations', width: 120, align: 'right' },
]

// ---- worker productivity
interface WorkerRow {
  key: string
  worker: string
  role: string
  stage: Stage
  details: string
  qty: number
  operations: number
}
const workers = computed<WorkerRow[]>(() => {
  const map = new Map<string, WorkerRow>()
  for (const r of production.value.outputs) {
    const key = `${r.worker._id}:${r.stage}`
    const row = map.get(key) ?? { key, worker: r.worker.fullName, role: ROLE_LABELS[r.worker.role], stage: r.stage, details: '', qty: 0, operations: 0 }
    row.qty += r.qty
    row.operations += r.operations
    row.details = row.details ? `${row.details}; ${r.item.name}: ${fmtQty(r.qty, r.item.unit)}` : `${r.item.name}: ${fmtQty(r.qty, r.item.unit)}`
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty)
})
const workerColumns: DataTableColumns<WorkerRow> = [
  { title: 'Hodim', key: 'worker', width: 200 },
  { title: 'Lavozim', key: 'role', width: 200 },
  { title: 'Bosqich', key: 'stage', width: 160, render: (r) => STAGE_CONFIG[r.stage].label },
  { title: 'Ishlab chiqargan', key: 'details', minWidth: 300 },
  { title: 'Operatsiyalar', key: 'operations', width: 120, align: 'right' },
]

// ---- QC
const qcColumns: DataTableColumns<QcReport['byStage'][number]> = [
  { title: 'Bosqich', key: 'stage', width: 200, render: (r) => (r.stage === 'manual' ? "Qo'lda tekshiruv" : STAGE_CONFIG[r.stage].label) },
  { title: 'Tekshirildi', key: 'checked', align: 'right', render: (r) => fmtQty(r.checked) },
  { title: "O'tdi", key: 'passed', align: 'right', render: (r) => fmtQty(r.passed) },
  { title: 'Brak', key: 'rejected', align: 'right', render: (r) => fmtQty(r.rejected) },
  {
    title: 'Brak %',
    key: 'rate',
    width: 200,
    render: (r) => {
      const pct = r.checked ? (r.rejected / r.checked) * 100 : 0
      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', { class: 'h-2 flex-1 rounded bg-slate-100' }, [h('div', { class: 'h-2 rounded bg-red-500', style: { width: `${Math.min(100, pct)}%` } })]),
        h('span', { class: 'w-12 text-right tabular-nums' }, `${pct.toFixed(1)}%`),
      ])
    },
  },
  { title: 'Qirindi (kg)', key: 'scrapKg', align: 'right', render: (r) => fmtQty(r.scrapKg) },
]

// ---- sales
const maxDay = computed(() => Math.max(1, ...sales.value.byDay.map((d) => d.total)))
const salesItemColumns: DataTableColumns<SalesReport['byItem'][number]> = [
  { title: 'Mahsulot', key: 'item', minWidth: 240, render: (r) => r.item.name },
  { title: 'Turi', key: 'type', width: 180, render: (r) => ITEM_TYPE_LABELS[r.item.type] },
  { title: 'Miqdor', key: 'qty', width: 120, align: 'right', render: (r) => fmtQty(r.qty, r.item.unit) },
  { title: 'Summa', key: 'amount', width: 160, align: 'right', render: (r) => fmtMoney(r.amount) },
]
const managerColumns: DataTableColumns<SalesReport['byManager'][number]> = [
  { title: 'Menejer', key: 'manager', render: (r) => r.manager.fullName },
  { title: 'Buyurtmalar', key: 'count', align: 'right' },
  { title: 'Summa', key: 'total', align: 'right', render: (r) => fmtMoney(r.total) },
  { title: "To'langan", key: 'paid', align: 'right', render: (r) => fmtMoney(r.paid) },
]

// ---- stock value
const stockColumns: DataTableColumns<StockValueRow> = [
  { title: 'Joy', key: 'location', minWidth: 200, render: (r) => r.location.name },
  { title: 'Turi', key: 'type', width: 200, render: (r) => ITEM_TYPE_LABELS[r.type] },
  { title: 'Pozitsiya', key: 'positions', width: 100, align: 'right' },
  { title: 'Tannarx bo\'yicha', key: 'costValue', width: 170, align: 'right', render: (r) => fmtMoney(r.costValue) },
  { title: 'Sotuv narxida', key: 'saleValue', width: 170, align: 'right', render: (r) => fmtMoney(r.saleValue) },
]
const stockTotal = computed(() => stockValue.value.reduce((s, r) => s + r.costValue, 0))
</script>

<template>
  <div>
    <PageHeader title="Hisobotlar" subtitle="Ishlab chiqarish, hodimlar unumdorligi, sifat, sotuv va ombor qiymati" tour="reports">
      <template #actions>
        <n-date-picker v-model:value="range" type="daterange" format="dd.MM.yyyy" data-tour="reports-range" />
      </template>
    </PageHeader>

    <n-tabs v-model:value="tab" type="line" animated data-tour="reports-tabs">
      <n-tab-pane name="production" tab="Ishlab chiqarish">
        <div class="mb-4 flex flex-wrap gap-2">
          <n-tag v-for="w in production.wastes" :key="w.stage" type="warning" :bordered="false">
            {{ STAGE_CONFIG[w.stage].department }}: liteykaga qaytgan qirindi {{ fmtQty(w.qty, 'kg') }}
          </n-tag>
        </div>
        <n-data-table :columns="stageItemColumns" :data="stageItems" :loading="p1" :scroll-x="800" :row-key="(r: StageItemRow) => r.key" size="small" />
      </n-tab-pane>

      <n-tab-pane name="workers" tab="Hodimlar unumdorligi">
        <n-data-table :columns="workerColumns" :data="workers" :loading="p1" :scroll-x="1000" :row-key="(r: WorkerRow) => r.key" size="small" />
      </n-tab-pane>

      <n-tab-pane name="qc" tab="Sifat">
        <n-data-table :columns="qcColumns" :data="qc.byStage" :loading="p2" :scroll-x="800" size="small" />
        <h3 class="mt-6 mb-2 text-base font-semibold">Eng ko'p uchragan nuqsonlar</h3>
        <n-empty v-if="!qc.reasons.length" description="Ma'lumot yo'q" />
        <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          <li v-for="r in qc.reasons" :key="r.reason" class="flex justify-between border-b border-slate-100 py-1">
            <span class="capitalize">{{ r.reason }}</span>
            <span class="tabular-nums">{{ fmtQty(r.qty) }} ({{ r.count }} marta)</span>
          </li>
        </ul>
      </n-tab-pane>

      <n-tab-pane name="sales" tab="Sotuv">
        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Sotuv summasi" :value="fmtMoney(sales.totals.total)" tone="info" />
          <StatCard label="To'langan" :value="fmtMoney(sales.totals.paid)" tone="success" />
          <StatCard label="Buyurtmalar" :value="sales.totals.count" />
        </div>
        <n-card v-if="sales.byDay.length" size="small" title="Kunlar bo'yicha" class="mb-4">
          <div class="flex flex-col gap-1">
            <div v-for="d in sales.byDay" :key="d.day" class="grid grid-cols-12 items-center gap-2 text-sm">
              <span class="col-span-3 md:col-span-2 tabular-nums text-slate-600">{{ fmtDate(d.day) }}</span>
              <div class="col-span-5 md:col-span-7 h-3 rounded bg-slate-100">
                <div class="h-3 rounded bg-blue-600" :style="{ width: `${(d.total / maxDay) * 100}%` }" />
              </div>
              <span class="col-span-4 md:col-span-3 text-right tabular-nums">{{ fmtMoney(d.total) }}</span>
            </div>
          </div>
        </n-card>
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <n-card size="small" title="Mahsulotlar bo'yicha" class="xl:col-span-2">
            <n-data-table :columns="salesItemColumns" :data="sales.byItem" :loading="p3" :scroll-x="700" size="small" />
          </n-card>
          <n-card size="small" title="Menejerlar bo'yicha">
            <n-data-table :columns="managerColumns" :data="sales.byManager" :loading="p3" size="small" />
          </n-card>
        </div>
      </n-tab-pane>

      <n-tab-pane name="stock" tab="Ombor qiymati">
        <p class="mt-0 text-sm text-slate-600">Joriy qoldiqlarning tannarx bo'yicha jami qiymati: <b>{{ fmtMoney(stockTotal) }}</b></p>
        <n-data-table :columns="stockColumns" :data="stockValue" :scroll-x="900" size="small" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
