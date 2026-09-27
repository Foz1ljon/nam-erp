<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { ClientListRow, UserRef } from '#shared/types/models'
import type { ClientKind, ClientSegment } from '#shared/utils/constants'

definePageMeta({ permission: ['crm.use', 'sales.view'] })
useHead({ title: 'Mijozlar — NamMotors ERP' })

const { can } = useAuth()
const search = ref('')
const debounced = refDebounced(search, 300)
const kind = ref<ClientKind | null>(null)
const segment = ref<ClientSegment | null>(null)
const manager = ref<string | null>(null)
const debtOnly = ref(false)
const modalOpen = ref(false)

const { data: clients, pending, refresh } = await useApiData<ClientListRow[]>('/api/clients', {
  query: () => ({ q: debounced.value, kind: kind.value, segment: segment.value, manager: manager.value, debtOnly: debtOnly.value ? 'true' : undefined }),
  default: () => [],
})

const totals = computed(() => ({
  count: clients.value.length,
  total: clients.value.reduce((s, c) => s + c.stats.total, 0),
  debt: clients.value.reduce((s, c) => s + Math.max(0, c.stats.debt), 0),
  withDebt: clients.value.filter((c) => c.stats.debt > 0).length,
}))

const columns: DataTableColumns<ClientListRow> = [
  {
    title: 'Mijoz',
    key: 'name',
    minWidth: 240,
    render: (r) =>
      h('div', [
        h('div', { class: 'font-medium' }, r.name),
        h('div', { class: 'text-xs text-slate-500' }, [r.legalName, r.inn ? `STIR ${r.inn}` : null].filter(Boolean).join(' · ')),
      ]),
  },
  { title: 'Turi', key: 'kind', width: 110, render: (r) => (r.kind === 'b2b' ? 'B2B' : 'Jismoniy') },
  { title: 'Soha', key: 'segment', width: 170, render: (r) => (r.segment ? CLIENT_SEGMENT_LABELS[r.segment] : '—') },
  { title: 'Telefon', key: 'phone', width: 150 },
  { title: 'Menejer', key: 'manager', width: 150, render: (r) => (r.manager as UserRef | null)?.fullName ?? '—' },
  { title: 'Buyurtmalar', key: 'orders', width: 110, align: 'right', render: (r) => r.stats.orders },
  { title: 'Jami savdo', key: 'total', width: 150, align: 'right', sorter: (a, b) => a.stats.total - b.stats.total, render: (r) => fmtMoney(r.stats.total) },
  {
    title: 'Qarz',
    key: 'debt',
    width: 150,
    align: 'right',
    sorter: (a, b) => a.stats.debt - b.stats.debt,
    render: (r) => h('span', { class: r.stats.debt > 0 ? 'font-medium text-red-600' : 'text-slate-400' }, fmtMoney(r.stats.debt)),
  },
  { title: 'Oxirgi buyurtma', key: 'lastOrderAt', width: 130, render: (r) => fmtDate(r.stats.lastOrderAt) },
  { title: 'Faol lidlar', key: 'openLeads', width: 100, align: 'right', render: (r) => r.stats.openLeads || '—' },
]

const rowProps = (row: ClientListRow) => ({ class: 'cursor-pointer', onClick: () => navigateTo(`/crm/clients/${row._id}`) })
const kindOptions = CLIENT_KINDS.map((k) => ({ label: CLIENT_KIND_LABELS[k], value: k }))
const segmentOptions = CLIENT_SEGMENTS.map((s) => ({ label: CLIENT_SEGMENT_LABELS[s], value: s }))

async function onSaved(id: string) {
  await refresh()
  await navigateTo(`/crm/clients/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="Mijozlar (B2B)" subtitle="Korxonalar, dilerlar va xususiy mijozlar: rekvizitlar, shartnoma, savdolar tarixi va qarzdorlik" tour="clients">
      <template #actions>
        <n-button v-if="can('counterparties.manage')" type="primary" data-tour="clients-new" @click="modalOpen = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi mijoz
        </n-button>
      </template>
    </PageHeader>

    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="clients-stats">
      <StatCard label="Mijozlar" :value="totals.count" />
      <StatCard label="Jami savdo" :value="fmtMoney(totals.total)" tone="info" />
      <StatCard label="Debitor qarz" :value="fmtMoney(totals.debt)" :tone="totals.debt ? 'warning' : 'default'" />
      <StatCard label="Qarzdor mijozlar" :value="totals.withDebt" :tone="totals.withDebt ? 'warning' : 'default'" />
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" data-tour="clients-filters">
      <n-input v-model:value="search" clearable placeholder="Nomi, STIR, telefon, viloyat" class="md:col-span-2" />
      <n-select v-model:value="kind" :options="kindOptions" clearable placeholder="Shaxs turi" />
      <n-select v-model:value="segment" :options="segmentOptions" clearable placeholder="Soha" />
      <UserSelect v-model="manager" :roles="['sales', 'director', 'admin']" placeholder="Menejer" />
      <label class="flex items-center gap-2 text-sm"><n-switch v-model:value="debtOnly" size="small" />Faqat qarzdorlar</label>
    </div>

    <n-card size="small" data-tour="clients-table">
      <n-data-table
        :columns="columns"
        :data="clients"
        :loading="pending"
        :row-props="rowProps"
        :pagination="{ pageSize: 30 }"
        :scroll-x="1500"
        :row-key="(r: ClientListRow) => r._id"
        size="small"
      />
    </n-card>

    <ClientFormModal v-model:show="modalOpen" :client="null" @saved="onSaved" />
  </div>
</template>
