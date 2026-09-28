<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { ReceiptDto } from '#shared/types/models'

definePageMeta({ permission: 'stock.view' })
useHead({ title: 'Kirim — NamMotors ERP' })

const { can } = useAuth()
const refs = useRefsStore()
const { run, pending: saving } = useApiAction()
const drawerOpen = ref(false)
const range = ref<[number, number] | null>(null)

const { data: receipts, pending, refresh } = await useApiData<ReceiptDto[]>('/api/receipts', {
  query: () => ({
    from: range.value ? new Date(range.value[0]).toISOString() : undefined,
    to: range.value ? new Date(range.value[1]).toISOString() : undefined,
  }),
  default: () => [],
})

const form = reactive({
  supplier: null as string | null,
  location: refs.locationByCode.get(LOC.RAW)?._id ?? null,
  note: '',
})
const lines = ref<EditableLine[]>([newLine({ price: 0 })])

async function submit() {
  const res = await run('/api/receipts', {
    method: 'POST',
    body: { ...form, note: form.note || undefined, lines: toPricedLines(lines.value) },
    success: 'Kirim saqlandi',
  })
  if (res !== null) {
    drawerOpen.value = false
    lines.value = [newLine({ price: 0 })]
    form.note = ''
    refresh()
    refs.load(true)
  }
}

const columns: DataTableColumns<ReceiptDto> = [
  {
    type: 'expand',
    renderExpand: (r) =>
      h(
        'div',
        { class: 'text-sm flex flex-col gap-1' },
        r.lines.map((l) => h('div', `${l.item.name}: ${fmtQty(l.qty, l.item.unit)} × ${fmtMoney(l.price)} = ${fmtMoney(l.qty * l.price)}`)),
      ),
  },
  { title: '№', key: 'number', width: 110 },
  { title: 'Sana', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
  { title: "Yetkazib beruvchi", key: 'supplier', minWidth: 180, render: (r) => r.supplier?.name ?? '—' },
  { title: 'Ombor', key: 'location', minWidth: 160, render: (r) => r.location.name },
  { title: 'Pozitsiya', key: 'lines', width: 100, render: (r) => r.lines.length },
  { title: 'Summa', key: 'total', width: 160, align: 'right', render: (r) => fmtMoney(r.total) },
  { title: 'Qabul qildi', key: 'user', render: (r) => r.user.fullName },
]
</script>

<template>
  <div>
    <PageHeader title="Kirim (xarid)" subtitle="Tashqaridan kelgan xomashyo (chugun, metallar), sim, jeleza va sotib olinadigan detallar (parrak, podshipnik...)" tour="receipts">
      <template #actions>
        <n-button v-if="can('receipts.manage')" type="primary" data-tour="receipt-new" @click="drawerOpen = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi kirim
        </n-button>
      </template>
    </PageHeader>
    <div class="mb-4 max-w-sm" data-tour="receipt-range"><n-date-picker v-model:value="range" type="daterange" format="dd.MM.yyyy" clearable /></div>
    <n-card size="small" data-tour="receipt-table">
      <n-data-table :columns="columns" :data="receipts" :loading="pending" :pagination="{ pageSize: 20 }" :scroll-x="1000" :row-key="(r: ReceiptDto) => r._id" size="small" />
    </n-card>

    <n-drawer v-model:show="drawerOpen" width="min(820px, 100vw)" :auto-focus="false">
      <n-drawer-content title="Yangi kirim" closable :native-scrollbar="false">
        <n-form label-placement="top" @submit.prevent="submit">
          <div class="mb-3 flex justify-end">
            <TourButton tour="receiptForm" label="Formani qanday to'ldirish kerak?" size="small" auto />
          </div>
          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <n-form-item label="Yetkazib beruvchi" data-tour="rf-supplier">
              <CounterpartySelect v-model="form.supplier" type="supplier" />
            </n-form-item>
            <n-form-item label="Qaysi omborga" data-tour="rf-location">
              <LocationSelect v-model="form.location" :types="['warehouse', 'production']" />
            </n-form-item>
          </div>
          <LineEditor v-model="lines" :types="['raw', 'material', 'component']" with-price data-tour="rf-lines" />
          <n-form-item label="Izoh (hujjat raqami, avtomobil...)" class="mt-4" data-tour="rf-note">
            <n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" />
          </n-form-item>
          <n-button type="primary" attr-type="submit" block size="large" data-tour="rf-submit" :loading="saving" :disabled="!form.location">Saqlash</n-button>
        </n-form>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
