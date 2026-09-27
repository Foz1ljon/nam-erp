<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { SalesOrderDto } from '#shared/types/models'
import type { SalesStatus } from '#shared/utils/constants'
import { StatusTag } from '#components'

definePageMeta({ permission: 'sales.view' })
useHead({ title: 'Sotuv buyurtmalari — NamMotors ERP' })

const { can } = useAuth()
const status = ref<SalesStatus | null>(null)
const customer = ref<string | null>(null)
const range = ref<[number, number] | null>(null)

const { data: orders, pending } = await useApiData<SalesOrderDto[]>('/api/sales', {
  query: () => ({
    status: status.value,
    customer: customer.value,
    from: range.value ? new Date(range.value[0]).toISOString() : undefined,
    to: range.value ? new Date(range.value[1]).toISOString() : undefined,
  }),
  default: () => [],
})

const summary = computed(() => {
  const active = orders.value.filter((o) => !['draft', 'cancelled'].includes(o.status))
  const total = active.reduce((s, o) => s + o.total, 0)
  const paid = active.reduce((s, o) => s + o.paidAmount, 0)
  return { total, paid, debt: total - paid }
})

const columns: DataTableColumns<SalesOrderDto> = [
  { title: '№', key: 'number', width: 110 },
  { title: 'Sana', key: 'createdAt', width: 110, render: (r) => fmtDate(r.createdAt) },
  { title: 'Mijoz', key: 'customer', minWidth: 200, render: (r) => r.customer.name },
  {
    title: 'Mahsulotlar',
    key: 'lines',
    minWidth: 240,
    render: (r) => r.lines.map((l) => `${l.item.name} × ${fmtQty(l.qty)}`).join('; '),
  },
  { title: 'Summa', key: 'total', width: 150, align: 'right', render: (r) => fmtMoney(r.total) },
  {
    title: "To'langan",
    key: 'paidAmount',
    width: 150,
    align: 'right',
    render: (r) => h('span', { class: r.paidAmount >= r.total ? 'text-emerald-700' : 'text-amber-700' }, fmtMoney(r.paidAmount)),
  },
  { title: 'Holat', key: 'status', width: 130, render: (r) => h(StatusTag, { kind: 'sales', value: r.status }) },
  { title: 'Menejer', key: 'manager', width: 150, render: (r) => r.manager.fullName },
]

const rowProps = (row: SalesOrderDto) => ({
  class: 'cursor-pointer',
  onClick: () => navigateTo(`/sales/${row._id}`),
})
const statusOptions = SALES_STATUSES.map((s) => ({ label: SALES_STATUS_LABELS[s], value: s }))
</script>

<template>
  <div>
    <PageHeader title="Sotuv buyurtmalari" subtitle="Tayyor dvigatel va nasoslar, yarim tayyor mahsulotlar va liteyka quymalarini sotish" tour="sales">
      <template #actions>
        <NuxtLink v-if="can('sales.manage')" to="/sales/new">
          <n-button type="primary" data-tour="sales-new">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            Yangi buyurtma
          </n-button>
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3" data-tour="sales-stats">
      <StatCard label="Buyurtmalar summasi" :value="fmtMoney(summary.total)" tone="info" />
      <StatCard label="To'langan" :value="fmtMoney(summary.paid)" tone="success" />
      <StatCard label="Debitor qarz" :value="fmtMoney(summary.debt)" :tone="summary.debt > 0 ? 'warning' : 'default'" />
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3" data-tour="sales-filters">
      <n-select v-model:value="status" :options="statusOptions" clearable placeholder="Holat" />
      <CounterpartySelect v-model="customer" type="customer" placeholder="Barcha mijozlar" />
      <n-date-picker v-model:value="range" type="daterange" clearable />
    </div>

    <n-card size="small" data-tour="sales-table">
      <n-data-table
        :columns="columns"
        :data="orders"
        :loading="pending"
        :row-props="rowProps"
        :pagination="{ pageSize: 20 }"
        :scroll-x="1200"
        :row-key="(r: SalesOrderDto) => r._id"
        size="small"
      />
    </n-card>
  </div>
</template>
