<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { ProductUnitDto } from '#shared/types/models'
import type { ProductUnitStatus } from '#shared/utils/constants'

definePageMeta({ permission: 'stock.view' })
useHead({ title: 'Seriya raqamlari — NamMotors ERP' })

const q = ref('')
const debounced = refDebounced(q, 300)
const status = ref<ProductUnitStatus | null>(null)

const { data, pending } = await useApiData<ProductUnitDto[]>('/api/serials', {
  query: () => ({ q: debounced.value, status: status.value }),
  default: () => [],
})

const columns: DataTableColumns<ProductUnitDto> = [
  { title: 'Seriya raqami', key: 'serial', width: 180 },
  { title: 'Mahsulot', key: 'item', minWidth: 260, render: (r) => r.item.name },
  { title: 'Ishlab chiqarilgan', key: 'createdAt', width: 150, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'Operatsiya', key: 'operation', width: 120, render: (r) => r.operation?.number ?? '—' },
  { title: 'Holat', key: 'status', width: 110, render: (r) => (r.status === 'sold' ? 'Sotilgan' : 'Omborda') },
  { title: 'Buyurtma', key: 'salesOrder', width: 120, render: (r) => r.salesOrder?.number ?? '—' },
  { title: 'Sotilgan sana', key: 'soldAt', width: 130, render: (r) => fmtDate(r.soldAt) },
]
</script>

<template>
  <div>
    <PageHeader title="Seriya raqamlari (birkalar)" subtitle="Har bir elektr dvigatel va nasosning seriya raqami: qachon ishlab chiqarilgan va kimga sotilgan (kafolat uchun)" tour="serials" />
    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <n-input v-model:value="q" clearable placeholder="Seriya raqami bo'yicha qidirish" data-tour="serial-search" />
      <n-select
        v-model:value="status"
        data-tour="serial-status"
        clearable
        placeholder="Holat"
        :options="[{ label: 'Omborda', value: 'in_stock' }, { label: 'Sotilgan', value: 'sold' }]"
      />
    </div>
    <n-card size="small" data-tour="serial-table">
      <n-data-table :columns="columns" :data="data" :loading="pending" :pagination="{ pageSize: 30 }" :scroll-x="1000" :row-key="(r: ProductUnitDto) => r._id" size="small" />
    </n-card>
  </div>
</template>
