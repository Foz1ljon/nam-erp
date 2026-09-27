<script setup lang="ts">
import type { SalesOrderDto } from '#shared/types/models'
import type { PaymentMethod } from '#shared/utils/constants'

definePageMeta({ permission: 'sales.view' })

const route = useRoute()
const refs = useRefsStore()
const dialog = useDialog()
const { can } = useAuth()
const { run, pending: saving } = useApiAction()

const isNew = computed(() => route.params.id === 'new')
const { data: order, refresh } = await useApiData<SalesOrderDto | null>(
  () => (isNew.value ? null : `/api/sales/${route.params.id}`),
  { default: () => null },
)
const current = computed(() => (isNew.value ? null : order.value))
useHead({ title: () => (current.value ? `Buyurtma ${current.value.number}` : 'Yangi buyurtma') + ' — NamMotors ERP' })

const editable = computed(() => can('sales.manage') && (isNew.value || current.value?.status === 'draft'))
const finishedLocation = refs.locationByCode.get(LOC.FINISHED)?._id ?? null

const form = reactive({
  customer: (route.query.customer as string | undefined) ?? null,
  lead: (route.query.lead as string | undefined) ?? null,
  discount: 0,
  note: '',
})
const lines = ref<EditableLine[]>([newLine({ price: 0, location: finishedLocation })])

watch(
  current,
  (o) => {
    if (!o) return
    form.customer = o.customer._id
    form.lead = o.lead?._id ?? null
    form.discount = o.discount
    form.note = o.note ?? ''
    lines.value = o.lines.map((l) => newLine({ item: l.item._id, qty: l.qty, price: l.price, location: l.location._id }))
  },
  { immediate: true },
)

const subtotal = computed(() => lines.value.reduce((s, l) => s + (l.qty ?? 0) * (l.price ?? 0), 0))
const total = computed(() => Math.max(0, subtotal.value - (form.discount ?? 0)))

async function save() {
  const body = {
    customer: form.customer,
    lead: form.lead,
    discount: form.discount ?? 0,
    note: form.note || undefined,
    lines: lines.value
      .filter((l) => l.item && (l.qty ?? 0) > 0)
      .map((l) => ({ item: l.item, qty: l.qty, price: l.price ?? 0, location: l.location })),
  }
  if (isNew.value) {
    const res = await run<{ _id: string }>('/api/sales', { method: 'POST', body, success: 'Buyurtma yaratildi' })
    if (res) await navigateTo(`/sales/${res._id}`, { replace: true })
  } else if (current.value) {
    const res = await run(`/api/sales/${current.value._id}`, { method: 'PUT', body, success: 'Saqlandi' })
    if (res !== null) refresh()
  }
}

async function action(kind: 'confirm' | 'cancel' | 'complete') {
  if (!current.value) return
  const res = await run(`/api/sales/${current.value._id}/status`, { method: 'POST', body: { action: kind }, success: 'Holat yangilandi' })
  if (res !== null) refresh()
}

function ship() {
  if (!current.value) return
  const id = current.value._id
  dialog.info({
    title: "Jo'natish",
    content: "Mahsulotlar ko'rsatilgan omborlardan chiqim qilinadi. Davom etilsinmi?",
    positiveText: "Jo'natish",
    negativeText: 'Bekor',
    onPositiveClick: async () => {
      if (await run(`/api/sales/${id}/ship`, { method: 'POST', success: "Jo'natildi" }) !== null) refresh()
    },
  })
}

const payment = reactive({ amount: null as number | null, method: 'transfer' as PaymentMethod, note: '' })
const paymentOpen = ref(false)
const remaining = computed(() => (current.value ? current.value.total - current.value.paidAmount : 0))
const methodOptions = PAYMENT_METHODS.map((m) => ({ label: PAYMENT_METHOD_LABELS[m], value: m }))

async function addPayment() {
  if (!current.value) return
  const res = await run(`/api/sales/${current.value._id}/payments`, {
    method: 'POST',
    body: { amount: payment.amount, method: payment.method, note: payment.note || undefined },
    success: "To'lov qabul qilindi",
  })
  if (res !== null) {
    paymentOpen.value = false
    Object.assign(payment, { amount: null, note: '' })
    refresh()
  }
}
</script>

<template>
  <div>
    <PageHeader :title="current ? `Buyurtma ${current.number}` : 'Yangi sotuv buyurtmasi'" :subtitle="current ? `${fmtDateTime(current.createdAt)} · ${current.manager.fullName}` : undefined" tour="salesOrder">
      <template #actions>
        <StatusTag v-if="current" kind="sales" :value="current.status" />
        <template v-if="current && can('sales.manage')">
          <n-button v-if="current.status === 'draft'" type="primary" data-tour="so-confirm" @click="action('confirm')">Tasdiqlash</n-button>
          <n-button v-if="current.status === 'confirmed'" type="primary" data-tour="so-ship" @click="ship">Jo'natish (ombordan chiqim)</n-button>
          <n-button v-if="['confirmed', 'shipped'].includes(current.status) && remaining > 0" data-tour="so-payment" @click="paymentOpen = true">To'lov qabul qilish</n-button>
          <n-button v-if="current.status === 'shipped'" data-tour="so-complete" @click="action('complete')">Yakunlash</n-button>
          <n-button v-if="['draft', 'confirmed'].includes(current.status)" type="error" ghost data-tour="so-cancel" @click="action('cancel')">Bekor qilish</n-button>
        </template>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <n-card size="small" class="xl:col-span-2" title="Buyurtma tarkibi">
        <n-form label-placement="top" :disabled="!editable" @submit.prevent="save">
          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <n-form-item label="Mijoz" data-tour="so-customer">
              <CounterpartySelect v-model="form.customer" type="customer" />
            </n-form-item>
            <n-form-item label="Chegirma (so'm)" data-tour="so-discount">
              <n-input-number v-model:value="form.discount" :min="0" class="w-full" />
            </n-form-item>
          </div>
          <LineEditor v-model="lines" :types="['finished', 'semi', 'casting', 'scrap', 'component', 'material', 'raw']" with-price with-location data-tour="so-lines" />
          <n-form-item label="Izoh" class="mt-4">
            <n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" />
          </n-form-item>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-base">
              Jami: <b>{{ fmtMoney(total) }}</b>
              <span v-if="form.discount" class="text-sm text-slate-500">(chegirma {{ fmtMoney(form.discount) }})</span>
            </div>
            <n-button v-if="editable" type="primary" attr-type="submit" data-tour="so-save" :loading="saving" :disabled="!form.customer">Saqlash</n-button>
          </div>
        </n-form>
      </n-card>

      <div v-if="current" class="flex flex-col gap-5">
        <n-card size="small" title="Mijoz">
          <div class="text-sm">
            <div class="font-medium">{{ current.customer.name }}</div>
            <div v-if="current.customer.phone" class="text-slate-500">{{ current.customer.phone }}</div>
            <div v-if="current.customer.address" class="text-slate-500">{{ current.customer.address }}</div>
            <div v-if="current.lead && can('crm.use')" class="mt-2">
              Lid: <NuxtLink :to="`/crm/leads/${current.lead._id}`">{{ current.lead.title }}</NuxtLink>
            </div>
          </div>
        </n-card>
        <n-card size="small" title="To'lovlar" data-tour="so-payments">
          <div class="mb-2 flex justify-between text-sm">
            <span>To'langan</span><b>{{ fmtMoney(current.paidAmount) }}</b>
          </div>
          <div class="mb-3 flex justify-between text-sm">
            <span>Qoldiq</span><b :class="remaining > 0 ? 'text-amber-700' : 'text-emerald-700'">{{ fmtMoney(remaining) }}</b>
          </div>
          <n-empty v-if="!current.payments.length" size="small" description="To'lov yo'q" />
          <div v-for="p in current.payments" :key="p._id" class="border-t border-slate-100 py-2 text-sm">
            <div class="flex justify-between"><span>{{ PAYMENT_METHOD_LABELS[p.method] }}</span><b>{{ fmtMoney(p.amount) }}</b></div>
            <div class="text-xs text-slate-500">{{ fmtDateTime(p.date) }} · {{ p.user.fullName }}<template v-if="p.note"> · {{ p.note }}</template></div>
          </div>
        </n-card>
      </div>
    </div>

    <n-modal v-model:show="paymentOpen" preset="card" title="To'lov qabul qilish" class="max-w-md">
      <n-form label-placement="top" @submit.prevent="addPayment">
        <n-form-item :label="`Summa (qoldiq ${fmtMoney(remaining)})`">
          <n-input-number v-model:value="payment.amount" :min="1" :max="remaining" class="w-full" />
        </n-form-item>
        <n-form-item label="To'lov usuli"><n-select v-model:value="payment.method" :options="methodOptions" /></n-form-item>
        <n-form-item label="Izoh"><n-input v-model:value="payment.note" /></n-form-item>
        <n-button type="primary" attr-type="submit" block :loading="saving" :disabled="!payment.amount">Saqlash</n-button>
      </n-form>
    </n-modal>
  </div>
</template>
