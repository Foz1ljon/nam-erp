<script setup lang="ts">
import { NButton, type DataTableColumns } from 'naive-ui'
import { NuxtLink, OperationDetails, StatusTag } from '#components'
import { AddOutline, PrintOutline } from '@vicons/ionicons5'
import type { OperationDto, OperationSaved } from '#shared/types/models'
import type { Stage } from '#shared/utils/stages'

definePageMeta({
  permission: 'production.view',
  validate: (route) => isStage(route.params.stage),
})

const route = useRoute()
const stage = computed(() => route.params.stage as Stage)
const config = computed(() => STAGE_CONFIG[stage.value])
useHead({ title: () => `${config.value.department}: ${config.value.label} — NamMotors ERP` })

const { can } = useAuth()
const canWork = computed(() => can(`stage.${stage.value}`))
const drawerOpen = ref(false)

const range = ref<[number, number] | null>(null)
const worker = ref<string | null>(null)
const query = computed(() => ({
  stage: stage.value,
  worker: worker.value,
  from: range.value ? new Date(range.value[0]).toISOString() : undefined,
  to: range.value ? new Date(range.value[1]).toISOString() : undefined,
}))
const { data: operations, pending, refresh } = await useApiData<OperationDto[]>('/api/operations', { query, default: () => [] })

const totals = computed(() => {
  const map = new Map<string, { name: string; unit: string; qty: number }>()
  for (const op of operations.value) {
    for (const o of op.outputs) {
      const row = map.get(o.item._id) ?? { name: o.item.name, unit: o.item.unit, qty: 0 }
      row.qty += o.qty
      map.set(o.item._id, row)
    }
  }
  return [...map.values()]
})

const columns = computed<DataTableColumns<OperationDto>>(() => [
  { type: 'expand', renderExpand: (row) => h(OperationDetails, { operation: row }) },
  { title: '№', key: 'number', width: 110 },
  { title: 'Sana', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
  {
    title: 'Natija',
    key: 'outputs',
    minWidth: 220,
    render: (r) => r.outputs.map((o) => `${o.item.name}: ${fmtQty(o.qty, o.item.unit)}`).join('; '),
  },
  { title: 'Ishchi', key: 'worker', render: (r) => r.worker.fullName },
  {
    title: 'Sifat',
    key: 'qcStatus',
    width: 150,
    render: (r) => h(StatusTag, { kind: 'qc', value: r.qcStatus }),
  },
  {
    title: '',
    key: 'actions',
    width: 60,
    render: (r) =>
      r.serials.length
        ? h(
            NuxtLink,
            { to: `/print/labels/${r._id}`, target: '_blank', 'aria-label': 'Birkalarni chop etish' },
            { default: () => h(NButton, { size: 'small', quaternary: true }, { icon: renderIcon(PrintOutline) }) },
          )
        : null,
  },
])

const message = useMessage()

function onSaved(res: OperationSaved) {
  drawerOpen.value = false
  refresh()
  if (res.handover) message.info(`${res.handover.number}: keyingi bo'limga topshirildi, qabul kutilmoqda`)
  if (res.handoverError) message.warning(`Operatsiya saqlandi, lekin topshirilmadi: ${res.handoverError}`, { duration: 8000 })
  if (res.serials.length) window.open(`/print/labels/${res._id}`, '_blank')
}
</script>

<template>
  <div>
    <PageHeader :title="`${config.department}: ${config.label}`" :subtitle="config.description" tour="stage">
      <template #actions>
        <n-button v-if="canWork" type="primary" data-tour="stage-new" @click="drawerOpen = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi operatsiya
        </n-button>
      </template>
    </PageHeader>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3" data-tour="stage-filters">
      <n-date-picker v-model:value="range" type="daterange" format="dd.MM.yyyy" clearable class="md:col-span-1" />
      <UserSelect v-model="worker" :roles="config.roles" placeholder="Barcha ishchilar" />
    </div>

    <div v-if="totals.length" class="mb-4 flex flex-wrap gap-2" data-tour="stage-totals">
      <n-tag v-for="t in totals" :key="t.name" type="info" :bordered="false">
        {{ t.name }}: <b>{{ fmtQty(t.qty, t.unit) }}</b>
      </n-tag>
    </div>

    <n-card size="small" data-tour="stage-table">
      <n-data-table
        :columns="columns"
        :data="operations"
        :loading="pending"
        :row-key="(r: OperationDto) => r._id"
        :pagination="{ pageSize: 20 }"
        :scroll-x="900"
        size="small"
      />
    </n-card>

    <n-drawer v-model:show="drawerOpen" width="min(760px, 100vw)" placement="right" :auto-focus="false">
      <n-drawer-content :title="`Yangi operatsiya: ${config.label}`" closable :native-scrollbar="false">
        <OperationForm :key="stage" :stage="stage" @saved="onSaved" />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
