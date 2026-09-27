<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { AdjustmentDto } from '#shared/types/models'

definePageMeta({ permission: 'stock.view' })
useHead({ title: 'Inventarizatsiya — NamMotors ERP' })

interface CountLine {
  item: string
  name: string
  unit: string
  expected: number
  actual: number | null
}

const { can } = useAuth()
const refs = useRefsStore()
const { run, pending: saving } = useApiAction()
const drawerOpen = ref(false)
const location = ref<string | null>(null)
const note = ref('')
const extraItem = ref<string | null>(null)
const countLines = ref<CountLine[]>([])

const { data: adjustments, pending, refresh } = await useApiData<AdjustmentDto[]>('/api/adjustments', { default: () => [] })
const { stock } = useLocationStock(location)

watch(stock, (s) => {
  countLines.value = Object.entries(s).map(([item, qty]) => {
    const it = refs.itemById.get(item)
    return { item, name: it?.name ?? item, unit: it?.unit ?? '', expected: qty, actual: qty }
  })
})

function addItem() {
  if (!extraItem.value || countLines.value.some((l) => l.item === extraItem.value)) return
  const it = refs.itemById.get(extraItem.value)
  countLines.value.push({ item: extraItem.value, name: it?.name ?? '', unit: it?.unit ?? '', expected: 0, actual: 0 })
  extraItem.value = null
}

const changed = computed(() => countLines.value.filter((l) => l.actual !== null && Math.abs(l.actual - l.expected) > 1e-6))

async function submit() {
  const res = await run('/api/adjustments', {
    method: 'POST',
    body: { location: location.value, note: note.value || undefined, lines: changed.value.map((l) => ({ item: l.item, actualQty: l.actual })) },
    success: 'Inventarizatsiya natijasi saqlandi',
  })
  if (res !== null) {
    drawerOpen.value = false
    note.value = ''
    location.value = null
    refresh()
  }
}

const columns: DataTableColumns<AdjustmentDto> = [
  {
    type: 'expand',
    renderExpand: (r) =>
      h(
        'div',
        { class: 'text-sm flex flex-col gap-1' },
        r.lines.map((l) => {
          const diff = l.actualQty - l.expectedQty
          return h('div', `${l.item.name}: hisobda ${fmtQty(l.expectedQty)} → haqiqiy ${fmtQty(l.actualQty, l.item.unit)} (${diff > 0 ? '+' : ''}${fmtQty(diff)})`)
        }),
      ),
  },
  { title: '№', key: 'number', width: 110 },
  { title: 'Sana', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'Joy', key: 'location', render: (r) => r.location.name },
  { title: 'Pozitsiya', key: 'lines', width: 100, render: (r) => r.lines.length },
  { title: 'Izoh', key: 'note', render: (r) => r.note ?? '' },
  { title: "Mas'ul", key: 'user', render: (r) => r.user.fullName },
]
</script>

<template>
  <div>
    <PageHeader title="Inventarizatsiya" subtitle="Haqiqiy sanoq natijasini kiritish: farq avtomatik kirim yoki chiqim sifatida jurnalga yoziladi" tour="adjustments">
      <template #actions>
        <n-button v-if="can('adjustments.manage')" type="primary" data-tour="adj-new" @click="drawerOpen = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi inventarizatsiya
        </n-button>
      </template>
    </PageHeader>
    <n-card size="small" data-tour="adj-table">
      <n-data-table :columns="columns" :data="adjustments" :loading="pending" :pagination="{ pageSize: 20 }" :scroll-x="800" :row-key="(r: AdjustmentDto) => r._id" size="small" />
    </n-card>

    <n-drawer v-model:show="drawerOpen" width="min(760px, 100vw)" :auto-focus="false">
      <n-drawer-content title="Inventarizatsiya" closable :native-scrollbar="false">
        <n-form label-placement="top" @submit.prevent="submit">
          <n-form-item label="Joy">
            <LocationSelect v-model="location" />
          </n-form-item>
          <template v-if="location">
            <div class="mb-3 flex gap-2">
              <ItemSelect v-model="extraItem" placeholder="Hisobda yo'q mahsulot qo'shish" clearable />
              <n-button @click="addItem">Qo'shish</n-button>
            </div>
            <div class="flex flex-col gap-1">
              <div v-for="l in countLines" :key="l.item" class="grid grid-cols-12 items-center gap-2 border-b border-slate-100 py-1 text-sm">
                <span class="col-span-6">{{ l.name }}</span>
                <span class="col-span-2 text-right tabular-nums text-slate-500">{{ fmtQty(l.expected, l.unit) }}</span>
                <n-input-number v-model:value="l.actual" :min="0" size="small" class="col-span-4" :status="l.actual !== l.expected ? 'warning' : undefined" />
              </div>
            </div>
            <n-form-item label="Izoh" class="mt-4">
              <n-input v-model:value="note" type="textarea" :autosize="{ minRows: 2 }" />
            </n-form-item>
            <n-button type="primary" attr-type="submit" block :loading="saving" :disabled="!changed.length">
              {{ changed.length }} ta farqni saqlash
            </n-button>
          </template>
        </n-form>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
