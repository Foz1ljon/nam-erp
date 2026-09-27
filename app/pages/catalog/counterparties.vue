<script setup lang="ts">
import { NButton, type DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { CounterpartyDto } from '#shared/types/models'
import type { CounterpartyType } from '#shared/utils/constants'

useHead({ title: 'Kontragentlar — NamMotors ERP' })

const { can } = useAuth()
const type = ref<CounterpartyType | null>(null)
const search = ref('')
const debounced = refDebounced(search, 300)
const modalOpen = ref(false)
const editing = ref<CounterpartyDto | null>(null)

const { data, pending, refresh } = await useApiData<CounterpartyDto[]>('/api/counterparties', {
  query: () => ({ type: type.value, q: debounced.value }),
  default: () => [],
})

function open(row: CounterpartyDto | null) {
  editing.value = row
  modalOpen.value = true
}

const columns: DataTableColumns<CounterpartyDto> = [
  { title: 'Nomi', key: 'name', minWidth: 220 },
  { title: 'Turi', key: 'type', width: 200, render: (r) => COUNTERPARTY_TYPE_LABELS[r.type] },
  { title: 'STIR', key: 'inn', width: 120 },
  { title: 'Telefon', key: 'phone', width: 160 },
  { title: "Mas'ul shaxs", key: 'contactPerson', width: 160 },
  { title: 'Manzil', key: 'address', minWidth: 160 },
  {
    title: '',
    key: 'actions',
    width: 110,
    render: (r) => (can('counterparties.manage') ? h(NButton, { size: 'small', onClick: () => open(r) }, () => 'Tahrirlash') : null),
  },
]
const typeOptions = COUNTERPARTY_TYPES.map((t) => ({ label: COUNTERPARTY_TYPE_LABELS[t], value: t }))
</script>

<template>
  <div>
    <PageHeader title="Kontragentlar" subtitle="Mijozlar va yetkazib beruvchilar (xomashyo, sim, parrak, podshipnik...)" tour="counterparties">
      <template #actions>
        <n-button v-if="can('counterparties.manage')" type="primary" data-tour="cp-new" @click="open(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi
        </n-button>
      </template>
    </PageHeader>
    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3" data-tour="cp-filters">
      <n-select v-model:value="type" :options="typeOptions" clearable placeholder="Barcha turlar" />
      <n-input v-model:value="search" clearable placeholder="Nomi, telefon yoki STIR" />
    </div>
    <n-card size="small" data-tour="cp-table">
      <n-data-table :columns="columns" :data="data" :loading="pending" :pagination="{ pageSize: 30 }" :scroll-x="1100" :row-key="(r: CounterpartyDto) => r._id" size="small" />
    </n-card>

    <ClientFormModal v-model:show="modalOpen" :client="editing" default-type="supplier" @saved="refresh()" />
  </div>
</template>
