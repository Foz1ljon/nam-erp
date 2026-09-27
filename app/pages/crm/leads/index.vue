<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { LeadDto } from '#shared/types/models'
import type { LeadStatus } from '#shared/utils/constants'
import { StatusTag } from '#components'

definePageMeta({ permission: 'crm.use' })
useHead({ title: 'Lidlar — NamMotors ERP' })

const { run } = useApiAction()
const view = ref<'board' | 'table'>('board')
const search = ref('')
const debounced = refDebounced(search, 300)
const manager = ref<string | null>(null)
const modalOpen = ref(false)

const { data: leads, pending, refresh } = await useApiData<LeadDto[]>('/api/leads', {
  query: () => ({ q: debounced.value, manager: manager.value }),
  default: () => [],
})

const columnsByStatus = computed(() =>
  LEAD_STATUSES.map((status) => {
    const list = leads.value.filter((l) => l.status === status)
    return { status, list, amount: list.reduce((s, l) => s + l.estimatedAmount, 0) }
  }),
)

const dragging = ref<string | null>(null)
const dropTarget = ref<LeadStatus | null>(null)

async function drop(status: LeadStatus) {
  const id = dragging.value
  dragging.value = null
  dropTarget.value = null
  const lead = leads.value.find((l) => l._id === id)
  if (!lead || lead.status === status) return
  const previous = lead.status
  lead.status = status
  const res = await run(`/api/leads/${lead._id}/status`, { method: 'PATCH', body: { status } })
  if (res === null) lead.status = previous
}

const tableColumns: DataTableColumns<LeadDto> = [
  { title: 'Sarlavha', key: 'title', minWidth: 220 },
  { title: 'Mijoz', key: 'contactName', width: 160 },
  { title: 'Telefon', key: 'phone', width: 150 },
  { title: 'Kompaniya', key: 'company', width: 160 },
  { title: 'Manba', key: 'source', width: 120, render: (r) => LEAD_SOURCE_LABELS[r.source] },
  { title: 'Summa', key: 'estimatedAmount', width: 150, align: 'right', render: (r) => fmtMoney(r.estimatedAmount) },
  { title: 'Holat', key: 'status', width: 150, render: (r) => h(StatusTag, { kind: 'lead', value: r.status }) },
  { title: 'Menejer', key: 'manager', width: 150, render: (r) => r.manager?.fullName ?? '—' },
  { title: 'Yangilangan', key: 'updatedAt', width: 140, render: (r) => fmtDateTime(r.updatedAt) },
]
const rowProps = (row: LeadDto) => ({ class: 'cursor-pointer', onClick: () => navigateTo(`/crm/leads/${row._id}`) })

async function onSaved(id: string) {
  await refresh()
  await navigateTo(`/crm/leads/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="Lidlar" subtitle="Potensial mijozlar: qo'ng'iroqlar, uchrashuvlar va takliflardan sotuvgacha. Kartani boshqa ustunga sudrab holatini o'zgartiring." tour="leads">
      <template #actions>
        <n-button type="primary" data-tour="leads-new" @click="modalOpen = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi lid
        </n-button>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <n-input v-model:value="search" clearable placeholder="Ism, telefon, kompaniya" class="max-w-xs" data-tour="leads-search" />
      <div class="w-64" data-tour="leads-manager"><UserSelect v-model="manager" :roles="['sales', 'director', 'admin']" placeholder="Barcha menejerlar" /></div>
      <n-radio-group v-model:value="view" data-tour="leads-view">
        <n-radio-button value="board">Kanban</n-radio-button>
        <n-radio-button value="table">Jadval</n-radio-button>
      </n-radio-group>
    </div>

    <div v-if="view === 'board'" class="flex gap-3 overflow-x-auto pb-4" data-tour="leads-board">
      <section
        v-for="col in columnsByStatus"
        :key="col.status"
        class="flex w-72 shrink-0 flex-col rounded-[10px] border bg-slate-100/70 transition"
        :class="dropTarget === col.status ? 'border-blue-500 bg-blue-50' : 'border-slate-200'"
        :aria-label="LEAD_STATUS_LABELS[col.status]"
        @dragover.prevent="dropTarget = col.status"
        @dragleave="dropTarget = null"
        @drop.prevent="drop(col.status)"
      >
        <header class="flex items-center justify-between px-3 py-2">
          <StatusTag kind="lead" :value="col.status" />
          <span class="text-xs text-slate-500">{{ col.list.length }} · {{ fmtMoney(col.amount) }}</span>
        </header>
        <div class="flex min-h-24 flex-col gap-2 px-2 pb-2">
          <NuxtLink
            v-for="lead in col.list"
            :key="lead._id"
            :to="`/crm/leads/${lead._id}`"
            draggable="true"
            class="block rounded-lg border border-slate-200 bg-white p-3 text-slate-800 no-underline shadow-xs hover:border-blue-400"
            @dragstart="dragging = lead._id"
          >
            <div class="text-sm font-medium">{{ lead.title }}</div>
            <div class="mt-1 text-xs text-slate-500">{{ lead.contactName }}<template v-if="lead.company"> · {{ lead.company }}</template></div>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="font-medium text-slate-700">{{ fmtMoney(lead.estimatedAmount) }}</span>
              <span class="text-slate-400">{{ LEAD_SOURCE_LABELS[lead.source] }}</span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>

    <n-card v-else size="small">
      <n-data-table
        :columns="tableColumns"
        :data="leads"
        :loading="pending"
        :row-props="rowProps"
        :pagination="{ pageSize: 30 }"
        :scroll-x="1400"
        :row-key="(r: LeadDto) => r._id"
        size="small"
      />
    </n-card>

    <LeadFormModal v-model:show="modalOpen" :lead="null" @saved="onSaved" />
  </div>
</template>
