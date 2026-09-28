<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { Paginated, StockMoveDto } from '#shared/types/models'
import type { DocType } from '#shared/utils/constants'

definePageMeta({ permission: 'stock.view' })
useHead({ title: 'Harakatlar jurnali — NamMotors ERP' })

const location = ref<string | null>(null)
const item = ref<string | null>(null)
const docType = ref<DocType | null>(null)
const range = ref<[number, number] | null>(null)
const page = ref(1)
const pageSize = 50

watch([location, item, docType, range], () => {
  page.value = 1
})

const { data, pending } = await useApiData<Paginated<StockMoveDto>>('/api/stock/moves', {
  query: () => ({
    location: location.value,
    item: item.value,
    docType: docType.value,
    from: range.value ? new Date(range.value[0]).toISOString() : undefined,
    to: range.value ? new Date(range.value[1]).toISOString() : undefined,
    page: page.value,
    pageSize,
  }),
  default: () => ({ items: [], total: 0 }),
})

const pagination = computed(() => ({
  page: page.value,
  pageSize,
  itemCount: data.value.total,
  onUpdatePage: (p: number) => (page.value = p),
}))

const columns: DataTableColumns<StockMoveDto> = [
  { title: 'Vaqt', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'Hujjat', key: 'doc', width: 190, render: (r) => `${DOC_TYPE_LABELS[r.docType]} ${r.docNumber}` },
  { title: 'Joy', key: 'location', minWidth: 170, render: (r) => r.location.name },
  { title: 'Mahsulot', key: 'item', minWidth: 240, render: (r) => r.item.name },
  {
    title: 'Miqdor',
    key: 'qty',
    width: 130,
    align: 'right',
    render: (r) => h('span', { class: r.qty > 0 ? 'text-emerald-700' : 'text-red-600' }, `${r.qty > 0 ? '+' : ''}${fmtQty(r.qty, r.item.unit)}`),
  },
  { title: 'Hodim', key: 'user', render: (r) => r.user?.fullName ?? '—' },
  { title: 'Izoh', key: 'note', render: (r) => r.note || '—' },
]

const docOptions = DOC_TYPES.map((d) => ({ label: DOC_TYPE_LABELS[d], value: d }))
</script>

<template>
  <div>
    <PageHeader title="Harakatlar jurnali" subtitle="Har bir kirim, chiqim, topshirish va ishlab chiqarish harakati — kim, qachon, qayerda" tour="moves" />
    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="moves-filters">
      <LocationSelect v-model="location" clearable placeholder="Barcha joylar" />
      <ItemSelect v-model="item" clearable placeholder="Barcha mahsulotlar" />
      <n-select v-model:value="docType" :options="docOptions" clearable placeholder="Hujjat turi" />
      <n-date-picker v-model:value="range" type="daterange" format="dd.MM.yyyy" clearable />
    </div>
    <n-card size="small" data-tour="moves-table">
      <n-data-table
        remote
        :columns="columns"
        :data="data.items"
        :loading="pending"
        :pagination="pagination"
        :scroll-x="1100"
        :row-key="(r: StockMoveDto) => r._id"
        size="small"
      />
    </n-card>
  </div>
</template>
