<script setup lang="ts">
import { NButton, NTag, type DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { LocationDto } from '#shared/types/models'
import type { LocationType } from '#shared/utils/constants'

useHead({ title: "Bo'limlar va omborlar — NamMotors ERP" })

const { can } = useAuth()
const refs = useRefsStore()
const { run, pending: saving } = useApiAction()
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const SYSTEM_CODES = new Set<string>(Object.values(LOC))

const { data, pending, refresh } = await useApiData<LocationDto[]>('/api/locations', { default: () => [] })

const empty = () => ({ code: '', name: '', type: 'warehouse' as LocationType, active: true, order: 100 })
const form = ref(empty())

function open(row: LocationDto | null) {
  editingId.value = row?._id ?? null
  form.value = row ? { code: row.code, name: row.name, type: row.type, active: row.active, order: row.order } : empty()
  modalOpen.value = true
}

async function submit() {
  const url = editingId.value ? `/api/locations/${editingId.value}` : '/api/locations'
  const res = await run(url, { method: editingId.value ? 'PUT' : 'POST', body: form.value, success: 'Saqlandi' })
  if (res !== null) {
    modalOpen.value = false
    await Promise.all([refresh(), refs.load(true)])
  }
}

const columns: DataTableColumns<LocationDto> = [
  { title: 'Tartib', key: 'order', width: 80 },
  { title: 'Kod', key: 'code', width: 130 },
  { title: 'Nomi', key: 'name', minWidth: 220 },
  { title: 'Turi', key: 'type', width: 200, render: (r) => LOCATION_TYPE_LABELS[r.type] },
  {
    title: 'Holat',
    key: 'active',
    width: 160,
    render: (r) =>
      h('div', { class: 'flex gap-1' }, [
        h(NTag, { size: 'small', type: r.active ? 'success' : 'default', bordered: false }, () => (r.active ? 'Faol' : 'Nofaol')),
        SYSTEM_CODES.has(r.code) ? h(NTag, { size: 'small', bordered: false }, () => 'Tizim') : null,
      ]),
  },
  {
    title: '',
    key: 'actions',
    width: 110,
    render: (r) => (can('catalog.manage') ? h(NButton, { size: 'small', onClick: () => open(r) }, () => 'Tahrirlash') : null),
  },
]
const typeOptions = LOCATION_TYPES.map((t) => ({ label: LOCATION_TYPE_LABELS[t], value: t }))
</script>

<template>
  <div>
    <PageHeader title="Bo'limlar va omborlar" subtitle="Zavoddagi har bir sex va ombor alohida qoldiqqa ega. Tizim joylari ishlab chiqarish oqimida ishlatiladi." tour="locations">
      <template #actions>
        <n-button v-if="can('catalog.manage')" type="primary" data-tour="loc-new" @click="open(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi joy
        </n-button>
      </template>
    </PageHeader>
    <n-card size="small" data-tour="loc-table">
      <n-data-table :columns="columns" :data="data" :loading="pending" :scroll-x="800" :row-key="(r: LocationDto) => r._id" size="small" />
    </n-card>

    <n-modal v-model:show="modalOpen" preset="card" :title="editingId ? 'Tahrirlash' : 'Yangi joy'" class="max-w-lg" :mask-closable="false">
      <n-form label-placement="top" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-x-4">
          <n-form-item label="Kod"><n-input v-model:value="form.code" :disabled="!!editingId && SYSTEM_CODES.has(form.code)" /></n-form-item>
          <n-form-item label="Tartib raqami"><n-input-number v-model:value="form.order" class="w-full" /></n-form-item>
        </div>
        <n-form-item label="Nomi"><n-input v-model:value="form.name" /></n-form-item>
        <n-form-item label="Turi"><n-select v-model:value="form.type" :options="typeOptions" /></n-form-item>
        <n-form-item label="Holat"><n-checkbox v-model:checked="form.active">Faol</n-checkbox></n-form-item>
        <n-button type="primary" attr-type="submit" block :loading="saving">Saqlash</n-button>
      </n-form>
    </n-modal>
  </div>
</template>
