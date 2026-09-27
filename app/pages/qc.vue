<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { OperationDto, QcInspectionDto, StockDto } from '#shared/types/models'

definePageMeta({ permission: ['qc.manage', 'production.view'] })
useHead({ title: 'Sifat nazorati — NamMotors ERP' })

const { can } = useAuth()
const refs = useRefsStore()
const qcLocationId = computed(() => refs.locationByCode.get(LOC.QC)?._id)
const tab = ref<'queue' | 'zone' | 'history'>('queue')

const { data: pendingOps, refresh: refreshPending, pending: loadingPending } = await useApiData<OperationDto[]>('/api/qc/pending', { default: () => [] })
const { data: zoneStock, refresh: refreshZone } = await useApiData<StockDto[]>('/api/stock', {
  query: () => ({ location: qcLocationId.value }),
  default: () => [],
})
const range = ref<[number, number] | null>(null)
const { data: history, refresh: refreshHistory, pending: loadingHistory } = await useApiData<QcInspectionDto[]>('/api/qc', {
  query: () => ({
    from: range.value ? new Date(range.value[0]).toISOString() : undefined,
    to: range.value ? new Date(range.value[1]).toISOString() : undefined,
  }),
  default: () => [],
})

const dialog = reactive<{ show: boolean; operation: OperationDto | null; itemId: string; maxQty: number }>({
  show: false,
  operation: null,
  itemId: '',
  maxQty: 0,
})

function inspect(operation: OperationDto | null, itemId: string, maxQty: number) {
  Object.assign(dialog, { show: true, operation, itemId, maxQty })
}

async function onSaved() {
  dialog.show = false
  await Promise.all([refreshPending(), refreshZone(), refreshHistory()])
}

/** Stock sitting in the QC zone that is not reserved by a pending operation (e.g. returns). */
const unassigned = computed(() => {
  const reserved = new Map<string, number>()
  for (const op of pendingOps.value) {
    for (const o of op.outputs) reserved.set(o.item._id, (reserved.get(o.item._id) ?? 0) + o.qty - o.inspectedQty)
  }
  return zoneStock.value
    .map((s) => ({ ...s, free: roundQty(s.qty - (reserved.get(s.item._id) ?? 0)) }))
    .filter((s) => s.free > 0)
})

const historyColumns: DataTableColumns<QcInspectionDto> = [
  { title: '№', key: 'number', width: 110 },
  { title: 'Sana', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'Bosqich', key: 'stage', render: (r) => (r.stage ? STAGE_CONFIG[r.stage].label : "Qo'lda") },
  { title: 'Mahsulot', key: 'item', minWidth: 200, render: (r) => r.item.name },
  { title: 'Tekshirildi', key: 'checkedQty', render: (r) => fmtQty(r.checkedQty, r.item.unit) },
  { title: "O'tdi", key: 'passedQty', render: (r) => fmtQty(r.passedQty) },
  { title: 'Brak', key: 'rejectedQty', render: (r) => fmtQty(r.rejectedQty) },
  { title: 'Sabab', key: 'defectReason', render: (r) => r.defectReason || '—' },
  { title: 'Nazoratchi', key: 'inspector', render: (r) => r.inspector.fullName },
]
</script>

<template>
  <div>
    <PageHeader title="Sifat nazorati" subtitle="Pishka stroy, yig'uv va to'liq sinovdan keyingi tekshiruvlar. Brak liteykaga qayta eritishga yoki izolyatorga yuboriladi." tour="qc" />

    <n-tabs v-model:value="tab" type="line" animated data-tour="qc-tabs">
      <n-tab-pane name="queue" :tab="`Navbat (${pendingOps.length})`">
        <n-spin :show="loadingPending">
          <n-empty v-if="!pendingOps.length" description="Tekshiruv kutayotgan operatsiya yo'q" class="py-10" />
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <n-card v-for="op in pendingOps" :key="op._id" size="small" data-tour="qc-card">
              <template #header>
                <div class="flex flex-wrap items-center gap-2">
                  <span>{{ op.number }}</span>
                  <n-tag size="small" :bordered="false" type="info">{{ STAGE_CONFIG[op.stage].department }} · {{ STAGE_CONFIG[op.stage].label }}</n-tag>
                </div>
              </template>
              <template #header-extra>
                <span class="text-xs text-slate-500">{{ fmtDateTime(op.createdAt) }}</span>
              </template>
              <div class="mb-2 text-xs text-slate-500">
                Ishchi: {{ op.worker.fullName }} · keyin: {{ op.afterQcLocation?.name ?? '—' }}
              </div>
              <div
                v-for="o in op.outputs"
                :key="o.item._id"
                class="flex items-center justify-between gap-2 border-t border-slate-100 py-2 text-sm"
              >
                <div>
                  <div>{{ o.item.name }}</div>
                  <div class="text-xs text-slate-500">
                    {{ fmtQty(o.inspectedQty) }} / {{ fmtQty(o.qty, o.item.unit) }} tekshirildi
                  </div>
                </div>
                <n-button
                  v-if="can('qc.manage') && o.qty - o.inspectedQty > 0"
                  size="small"
                  type="primary"
                  data-tour="qc-inspect"
                  @click="inspect(op, o.item._id, roundQty(o.qty - o.inspectedQty))"
                >
                  Tekshirish
                </n-button>
                <n-tag v-else size="small" type="success" :bordered="false">Tayyor</n-tag>
              </div>
            </n-card>
          </div>
        </n-spin>
      </n-tab-pane>

      <n-tab-pane name="zone" tab="Nazorat zonasidagi boshqa mahsulotlar">
        <n-empty v-if="!unassigned.length" description="Operatsiyaga bog'lanmagan mahsulot yo'q" class="py-10" />
        <n-card v-for="s in unassigned" :key="s._id" size="small" class="mb-2">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span>{{ s.item.name }} — {{ fmtQty(s.free, s.item.unit) }}</span>
            <n-button v-if="can('qc.manage')" size="small" type="primary" @click="inspect(null, s.item._id, s.free)">Tekshirish</n-button>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="history" tab="Tarix">
        <div class="mb-3 max-w-sm">
          <n-date-picker v-model:value="range" type="daterange" clearable />
        </div>
        <n-data-table
          :columns="historyColumns"
          :data="history"
          :loading="loadingHistory"
          :pagination="{ pageSize: 20 }"
          :scroll-x="1000"
          :row-key="(r: QcInspectionDto) => r._id"
          size="small"
        />
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="dialog.show" preset="card" title="Sifat tekshiruvi" class="max-w-xl" :mask-closable="false">
      <QcForm v-if="dialog.show" :operation="dialog.operation" :item-id="dialog.itemId" :max-qty="dialog.maxQty" @saved="onSaved" />
    </n-modal>
  </div>
</template>
