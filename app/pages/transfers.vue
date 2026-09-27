<script setup lang="ts">
import { NButton, NInput, NSpace, type DataTableColumns } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { TransferDto } from '#shared/types/models'
import type { TransferStatus } from '#shared/utils/constants'
import { StatusTag } from '#components'

definePageMeta({ permission: 'transfers.use' })
useHead({ title: 'Topshirish va qabul — NamMotors ERP' })

const { user } = useAuth()
const dialog = useDialog()
const { run } = useApiAction()
const scope = ref<'incoming' | 'outgoing' | 'all'>('incoming')
const status = ref<TransferStatus | null>(null)
const drawerOpen = ref(false)

const { data: transfers, pending, refresh } = await useApiData<TransferDto[]>('/api/transfers', {
  query: () => ({ scope: scope.value, status: status.value }),
  default: () => [],
})

const SUPERVISORS = ['admin', 'director', 'warehouse']
function canReceive(t: TransferDto) {
  const u = user.value
  if (!u || t.status !== 'pending') return false
  if (SUPERVISORS.includes(u.role)) return true
  if (t.receiver) return t.receiver._id === u.id
  return u.locationId === t.to._id
}
function canCancel(t: TransferDto) {
  const u = user.value
  return !!u && t.status === 'pending' && (t.sender._id === u.id || SUPERVISORS.includes(u.role))
}

async function accept(t: TransferDto) {
  if (await run(`/api/transfers/${t._id}/accept`, { method: 'POST', success: 'Qabul qilindi' }) !== null) refresh()
}

function reject(t: TransferDto) {
  const reason = ref('')
  dialog.warning({
    title: `${t.number} ni rad etish`,
    content: () => h(NInput, { value: reason.value, 'onUpdate:value': (v: string) => (reason.value = v), placeholder: 'Sabab (masalan: miqdor mos emas)' }),
    positiveText: 'Rad etish',
    negativeText: 'Bekor',
    onPositiveClick: async () => {
      const res = await run(`/api/transfers/${t._id}/reject`, { method: 'POST', body: { reason: reason.value }, success: 'Rad etildi' })
      if (res === null) return false
      refresh()
    },
  })
}

function cancel(t: TransferDto) {
  dialog.warning({
    title: 'Topshirishni bekor qilish',
    content: `${t.number} bekor qilinsin? Mahsulotlar qaytib jo'natuvchiga tushadi.`,
    positiveText: 'Ha',
    negativeText: "Yo'q",
    onPositiveClick: async () => {
      if (await run(`/api/transfers/${t._id}/cancel`, { method: 'POST', success: 'Bekor qilindi' }) !== null) refresh()
    },
  })
}

const columns: DataTableColumns<TransferDto> = [
  { title: '№', key: 'number', width: 110 },
  { title: 'Sana', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'Qayerdan → Qayerga', key: 'route', minWidth: 220, render: (r) => `${r.from.name} → ${r.to.name}` },
  {
    title: 'Mahsulotlar',
    key: 'lines',
    minWidth: 240,
    render: (r) => r.lines.map((l) => `${l.item.name}: ${fmtQty(l.qty, l.item.unit)}`).join('; '),
  },
  {
    title: 'Topshirdi / Qabul qildi',
    key: 'people',
    minWidth: 180,
    render: (r) => `${r.sender.fullName} → ${r.acceptedBy?.fullName ?? r.receiver?.fullName ?? "bo'lim"}`,
  },
  {
    title: 'Holat',
    key: 'status',
    width: 150,
    render: (r) => h('div', [h(StatusTag, { kind: 'transfer', value: r.status }), r.rejectReason ? h('div', { class: 'text-xs text-red-600 mt-1' }, r.rejectReason) : null]),
  },
  {
    title: '',
    key: 'actions',
    width: 200,
    render: (r) =>
      h(NSpace, { size: 'small' }, () => [
        canReceive(r) ? h(NButton, { size: 'small', type: 'primary', 'data-tour': 'transfer-accept', onClick: () => accept(r) }, () => 'Qabul qilish') : null,
        canReceive(r) ? h(NButton, { size: 'small', 'data-tour': 'transfer-reject', onClick: () => reject(r) }, () => 'Rad etish') : null,
        canCancel(r) && !canReceive(r) ? h(NButton, { size: 'small', 'data-tour': 'transfer-cancel', onClick: () => cancel(r) }, () => 'Bekor qilish') : null,
      ]),
  },
]

const statusOptions = TRANSFER_STATUSES.map((s) => ({ label: TRANSFER_STATUS_LABELS[s], value: s }))

function onSaved() {
  drawerOpen.value = false
  scope.value = 'outgoing'
  refresh()
}
</script>

<template>
  <div>
    <PageHeader
      title="Topshirish va qabul qilish"
      subtitle="Bo'limlar orasida mahsulot jonli topshiriladi: jo'natuvchi topshiradi, qabul qiluvchi tasdiqlaydi. Tasdiqlanguncha mahsulot «yo'lda» hisoblanadi."
      tour="transfers"
    >
      <template #actions>
        <n-button type="primary" data-tour="transfer-new" @click="drawerOpen = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi topshirish
        </n-button>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <n-radio-group v-model:value="scope" data-tour="transfer-scope">
        <n-radio-button value="incoming">Menga kelgan</n-radio-button>
        <n-radio-button value="outgoing">Men topshirgan</n-radio-button>
        <n-radio-button value="all">Barchasi</n-radio-button>
      </n-radio-group>
      <n-select v-model:value="status" :options="statusOptions" clearable placeholder="Holat" class="w-52" data-tour="transfer-status" />
    </div>

    <n-card size="small" data-tour="transfer-table">
      <n-data-table
        :columns="columns"
        :data="transfers"
        :loading="pending"
        :pagination="{ pageSize: 20 }"
        :scroll-x="1200"
        :row-key="(r: TransferDto) => r._id"
        size="small"
      />
    </n-card>

    <n-drawer v-model:show="drawerOpen" width="min(720px, 100vw)" :auto-focus="false">
      <n-drawer-content title="Yangi topshirish" closable :native-scrollbar="false">
        <TransferForm @saved="onSaved" />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
