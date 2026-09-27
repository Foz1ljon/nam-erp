<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { StockDto } from '#shared/types/models'
import type { ItemType } from '#shared/utils/constants'

definePageMeta({ permission: 'stock.view' })
useHead({ title: 'Qoldiqlar — NamMotors ERP' })

const location = ref<string | null>(null)
const type = ref<ItemType | null>(null)
const search = ref('')
const view = ref<'rows' | 'items'>('rows')

const { data: stock, pending, refresh } = await useApiData<StockDto[]>('/api/stock', {
  query: () => ({ location: location.value, type: type.value }),
  default: () => [],
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return stock.value
  return stock.value.filter((s) => s.item.name.toLowerCase().includes(q) || s.item.code.toLowerCase().includes(q))
})

interface ItemTotal {
  _id: string
  code: string
  name: string
  unit: string
  type: ItemType
  qty: number
  minStock: number
  value: number
  places: string
}

const byItem = computed<ItemTotal[]>(() => {
  const map = new Map<string, ItemTotal>()
  for (const s of filtered.value) {
    const row = map.get(s.item._id) ?? {
      _id: s.item._id,
      code: s.item.code,
      name: s.item.name,
      unit: s.item.unit,
      type: s.item.type,
      qty: 0,
      minStock: s.item.minStock,
      value: 0,
      places: '',
    }
    row.qty += s.qty
    row.value += s.qty * (s.item.cost || s.item.price)
    row.places = row.places ? `${row.places}, ${s.location.name}` : s.location.name
    map.set(s.item._id, row)
  }
  return [...map.values()]
})

const totalValue = computed(() => filtered.value.reduce((sum, s) => sum + s.qty * (s.item.cost || s.item.price), 0))

const rowColumns: DataTableColumns<StockDto> = [
  { title: 'Joy', key: 'location', minWidth: 180, render: (r) => r.location.name },
  { title: 'Kod', key: 'code', width: 160, render: (r) => r.item.code },
  { title: 'Nomi', key: 'name', minWidth: 240, render: (r) => r.item.name },
  { title: 'Turi', key: 'type', width: 170, render: (r) => ITEM_TYPE_LABELS[r.item.type] },
  { title: 'Qoldiq', key: 'qty', width: 130, align: 'right', sorter: (a, b) => a.qty - b.qty, render: (r) => fmtQty(r.qty, r.item.unit) },
  { title: 'Qiymati', key: 'value', width: 160, align: 'right', render: (r) => fmtMoney(r.qty * (r.item.cost || r.item.price)) },
]

const itemColumns: DataTableColumns<ItemTotal> = [
  { title: 'Kod', key: 'code', width: 160 },
  { title: 'Nomi', key: 'name', minWidth: 240 },
  { title: 'Turi', key: 'type', width: 170, render: (r) => ITEM_TYPE_LABELS[r.type] },
  { title: 'Joylar', key: 'places', minWidth: 220 },
  {
    title: 'Jami qoldiq',
    key: 'qty',
    width: 150,
    align: 'right',
    sorter: (a, b) => a.qty - b.qty,
    render: (r) => h('span', { class: r.minStock && r.qty < r.minStock ? 'text-amber-700 font-medium' : '' }, fmtQty(r.qty, r.unit)),
  },
  { title: 'Qiymati', key: 'value', width: 160, align: 'right', render: (r) => fmtMoney(r.value) },
]

const typeOptions = ITEM_TYPES.map((t) => ({ label: ITEM_TYPE_LABELS[t], value: t }))
</script>

<template>
  <div>
    <PageHeader title="Ombor qoldiqlari" :subtitle="`Barcha bo'lim va omborlardagi joriy qoldiq. Jami qiymat: ${fmtMoney(totalValue)}`" tour="stock">
      <template #actions>
        <n-button :loading="pending" @click="refresh()">Yangilash</n-button>
      </template>
    </PageHeader>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <LocationSelect v-model="location" clearable placeholder="Barcha joylar" data-tour="stock-location" />
      <n-select v-model:value="type" :options="typeOptions" clearable placeholder="Barcha turlar" data-tour="stock-type" />
      <n-input v-model:value="search" clearable placeholder="Qidirish: kod yoki nom" data-tour="stock-search" />
      <n-radio-group v-model:value="view" data-tour="stock-view">
        <n-radio-button value="rows">Joylar bo'yicha</n-radio-button>
        <n-radio-button value="items">Mahsulot bo'yicha</n-radio-button>
      </n-radio-group>
    </div>

    <n-card size="small" data-tour="stock-table">
      <n-data-table
        v-if="view === 'rows'"
        :columns="rowColumns"
        :data="filtered"
        :loading="pending"
        :pagination="{ pageSize: 30 }"
        :scroll-x="1000"
        :row-key="(r: StockDto) => r._id"
        size="small"
      />
      <n-data-table
        v-else
        :columns="itemColumns"
        :data="byItem"
        :loading="pending"
        :pagination="{ pageSize: 30 }"
        :scroll-x="1000"
        :row-key="(r: ItemTotal) => r._id"
        size="small"
      />
    </n-card>
  </div>
</template>
