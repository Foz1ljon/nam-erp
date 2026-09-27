<script setup lang="ts">
import { NButton, NSpace, NTag, type DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { ItemDto } from '#shared/types/models'
import type { ItemType } from '#shared/utils/constants'

useHead({ title: "Mahsulot va materiallar — NamMotors ERP" })

const { can } = useAuth()
const refs = useRefsStore()
const type = ref<ItemType | null>(null)
const search = ref('')
const editOpen = ref(false)
const editing = ref<ItemDto | null>(null)
const bomItem = ref<ItemDto | null>(null)

const { data: items, pending, refresh } = await useApiData<ItemDto[]>('/api/items', {
  query: () => ({ type: type.value }),
  default: () => [],
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? items.value.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)) : items.value
})

function openEdit(item: ItemDto | null) {
  editing.value = item
  editOpen.value = true
}

async function onSaved() {
  await Promise.all([refresh(), refs.load(true)])
  if (bomItem.value) bomItem.value = items.value.find((i) => i._id === bomItem.value?._id) ?? null
}

const columns: DataTableColumns<ItemDto> = [
  { title: 'Kod', key: 'code', width: 170 },
  {
    title: 'Nomi',
    key: 'name',
    minWidth: 260,
    render: (r) => h('div', [h('span', r.name), r.active ? null : h(NTag, { size: 'small', class: 'ml-2' }, () => 'nofaol')]),
  },
  { title: 'Turi', key: 'type', width: 190, render: (r) => ITEM_TYPE_LABELS[r.type] },
  { title: 'Birlik', key: 'unit', width: 80 },
  { title: "Og'irlik", key: 'unitWeightKg', width: 90, render: (r) => (r.unitWeightKg ? `${r.unitWeightKg} kg` : '—') },
  { title: 'Tannarx', key: 'cost', width: 130, align: 'right', render: (r) => fmtMoney(r.cost) },
  { title: 'Sotuv narxi', key: 'price', width: 130, align: 'right', render: (r) => fmtMoney(r.price) },
  { title: 'Retsept', key: 'bom', width: 90, render: (r) => (r.bom.length ? `${r.bom.length} qator` : '—') },
  {
    title: '',
    key: 'actions',
    width: 190,
    render: (r) =>
      h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => (bomItem.value = r) }, () => 'Retsept'),
        can('catalog.manage') ? h(NButton, { size: 'small', onClick: () => openEdit(r) }, () => 'Tahrirlash') : null,
      ]),
  },
]

const typeOptions = ITEM_TYPES.map((t) => ({ label: ITEM_TYPE_LABELS[t], value: t }))
</script>

<template>
  <div>
    <PageHeader title="Mahsulot va materiallar" subtitle="Xomashyo, quymalar, yarim tayyor, detal, materiallar va tayyor mahsulotlar; har biri uchun ishlab chiqarish retsepti (BOM)" tour="items">
      <template #actions>
        <n-button v-if="can('catalog.manage')" type="primary" data-tour="items-new" @click="openEdit(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi
        </n-button>
      </template>
    </PageHeader>
    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3" data-tour="items-filters">
      <n-select v-model:value="type" :options="typeOptions" clearable placeholder="Barcha turlar" />
      <n-input v-model:value="search" clearable placeholder="Qidirish" />
    </div>
    <n-card size="small" data-tour="items-table">
      <n-data-table :columns="columns" :data="filtered" :loading="pending" :pagination="{ pageSize: 30 }" :scroll-x="1300" :row-key="(r: ItemDto) => r._id" size="small" />
    </n-card>

    <ItemFormModal v-model:show="editOpen" :item="editing" @saved="onSaved" />

    <n-drawer :show="!!bomItem" width="min(860px, 100vw)" :auto-focus="false" @update:show="(v: boolean) => !v && (bomItem = null)">
      <n-drawer-content v-if="bomItem" :title="`Retsept: ${bomItem.name}`" closable :native-scrollbar="false">
        <BomEditor :key="bomItem._id" :item="bomItem" @saved="onSaved" />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
