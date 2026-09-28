<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import type { CounterpartyDto } from '#shared/types/models'
import type { ClientKind, ClientSegment, CounterpartyType } from '#shared/utils/constants'

interface Props {
  client: CounterpartyDto | null
  /** Default type for new records ("customer" from CRM, anything from the catalog). */
  defaultType?: CounterpartyType
}
const props = withDefaults(defineProps<Props>(), { defaultType: 'customer' })
const show = defineModel<boolean>('show', { required: true })
const emit = defineEmits<{ (e: 'saved', id: string): void }>()

const { user } = useAuth()
const refs = useRefsStore()
const { run, pending } = useApiAction()
const formRef = ref<FormInst | null>(null)

function managerId(c: CounterpartyDto | null) {
  if (!c?.manager) return null
  return typeof c.manager === 'string' ? c.manager : c.manager._id
}

function initial() {
  const c = props.client
  return {
    name: c?.name ?? '',
    type: (c?.type ?? props.defaultType) as CounterpartyType,
    kind: (c?.kind ?? 'b2b') as ClientKind,
    segment: (c?.segment ?? null) as ClientSegment | null,
    manager: managerId(c) ?? (user.value?.role === 'sales' ? user.value.id : null),
    inn: c?.inn ?? '',
    legalName: c?.legalName ?? '',
    director: c?.director ?? '',
    bankName: c?.bankName ?? '',
    bankAccount: c?.bankAccount ?? '',
    mfo: c?.mfo ?? '',
    oked: c?.oked ?? '',
    vatCode: c?.vatCode ?? '',
    phone: c?.phone ?? '',
    email: c?.email ?? '',
    website: c?.website ?? '',
    telegram: c?.telegram ?? '',
    instagram: c?.instagram ?? '',
    region: c?.region ?? '',
    address: c?.address ?? '',
    contactPerson: c?.contactPerson ?? '',
    contractNumber: c?.contractNumber ?? '',
    contractDate: c?.contractDate ? new Date(c.contractDate).getTime() : (null as number | null),
    paymentTermsDays: c?.paymentTermsDays ?? 0,
    creditLimit: c?.creditLimit ?? 0,
    note: c?.note ?? '',
  }
}
const form = ref(initial())
watch(show, (v) => {
  if (v) form.value = initial()
})

const rules: FormRules = {
  name: { required: true, message: 'Nomini kiriting', trigger: 'blur' },
}

const typeOptions = COUNTERPARTY_TYPES.map((t) => ({ label: COUNTERPARTY_TYPE_LABELS[t], value: t }))
const kindOptions = CLIENT_KINDS.map((k) => ({ label: CLIENT_KIND_LABELS[k], value: k }))
const segmentOptions = CLIENT_SEGMENTS.map((s) => ({ label: CLIENT_SEGMENT_LABELS[s], value: s }))
const isB2b = computed(() => form.value.kind === 'b2b')

async function submit() {
  await formRef.value?.validate()
  const body = {
    ...form.value,
    contractDate: form.value.contractDate ? new Date(form.value.contractDate).toISOString() : null,
  }
  const url = props.client ? `/api/counterparties/${props.client._id}` : '/api/counterparties'
  const res = await run<{ _id: string }>(url, { method: props.client ? 'PUT' : 'POST', body, success: 'Saqlandi' })
  if (res) {
    await refs.load(true)
    show.value = false
    emit('saved', res._id)
  }
}
</script>

<template>
  <n-modal v-model:show="show" preset="card" :title="client ? client.name : 'Yangi mijoz / kontragent'" class="max-w-3xl" :mask-closable="false">
    <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" @submit.prevent="submit">
      <n-tabs type="line" animated>
        <n-tab-pane name="main" tab="Asosiy">
          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <n-form-item label="Nomi (qisqa)" path="name" class="md:col-span-2">
              <n-input v-model:value="form.name" placeholder="Masalan: Agro Servis" />
            </n-form-item>
            <n-form-item label="Shaxs turi"><n-select v-model:value="form.kind" :options="kindOptions" /></n-form-item>
            <n-form-item label="Kontragent turi"><n-select v-model:value="form.type" :options="typeOptions" /></n-form-item>
            <n-form-item label="Soha (segment)"><n-select v-model:value="form.segment" :options="segmentOptions" clearable /></n-form-item>
            <n-form-item label="Mas'ul sotuv menejeri">
              <UserSelect v-model="form.manager" :roles="['sales', 'director', 'admin']" />
            </n-form-item>
            <n-form-item label="Mas'ul shaxs (aloqa)"><n-input v-model:value="form.contactPerson" /></n-form-item>
            <n-form-item label="Telefon"><n-input v-model:value="form.phone" placeholder="+998" /></n-form-item>
            <n-form-item label="Viloyat / shahar"><n-input v-model:value="form.region" /></n-form-item>
            <n-form-item label="Manzil"><n-input v-model:value="form.address" /></n-form-item>
          </div>
        </n-tab-pane>

        <n-tab-pane name="requisites" :tab="isB2b ? 'Rekvizitlar' : 'Hujjatlar'">
          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <n-form-item v-if="isB2b" label="Yuridik nomi" class="md:col-span-2">
              <n-input v-model:value="form.legalName" placeholder="«AGRO SERVIS» MChJ" />
            </n-form-item>
            <n-form-item :label="isB2b ? 'STIR (INN)' : 'JShShIR'"><n-input v-model:value="form.inn" :maxlength="14" /></n-form-item>
            <n-form-item v-if="isB2b" label="Rahbar (direktor)"><n-input v-model:value="form.director" /></n-form-item>
            <n-form-item v-if="isB2b" label="Bank nomi"><n-input v-model:value="form.bankName" /></n-form-item>
            <n-form-item v-if="isB2b" label="Hisob raqami (20 xona)"><n-input v-model:value="form.bankAccount" :maxlength="20" /></n-form-item>
            <n-form-item v-if="isB2b" label="MFO"><n-input v-model:value="form.mfo" :maxlength="5" /></n-form-item>
            <n-form-item v-if="isB2b" label="OKED"><n-input v-model:value="form.oked" /></n-form-item>
            <n-form-item v-if="isB2b" label="QQS to'lovchi kodi"><n-input v-model:value="form.vatCode" /></n-form-item>
          </div>
        </n-tab-pane>

        <n-tab-pane name="contract" tab="Shartnoma va to'lov">
          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <n-form-item label="Shartnoma raqami"><n-input v-model:value="form.contractNumber" /></n-form-item>
            <n-form-item label="Shartnoma sanasi"><n-date-picker v-model:value="form.contractDate" type="date" format="dd.MM.yyyy" clearable class="w-full" /></n-form-item>
            <n-form-item label="To'lov muddati (kun)">
              <n-input-number v-model:value="form.paymentTermsDays" :min="0" :max="365" class="w-full" />
            </n-form-item>
            <n-form-item label="Kredit limiti (so'm)">
              <n-input-number v-model:value="form.creditLimit" :min="0" :show-button="false" class="w-full" />
            </n-form-item>
          </div>
          <p class="m-0 text-xs text-slate-500">Kredit limiti — mijoz to'lovsiz qancha summagacha mahsulot olishi mumkin. Qarz limitdan oshsa, mijoz kartasida ogohlantirish chiqadi.</p>
        </n-tab-pane>

        <n-tab-pane name="online" tab="Onlayn">
          <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <n-form-item label="Email"><n-input v-model:value="form.email" /></n-form-item>
            <n-form-item label="Veb-sayt"><n-input v-model:value="form.website" /></n-form-item>
            <n-form-item label="Telegram"><n-input v-model:value="form.telegram" placeholder="@username" /></n-form-item>
            <n-form-item label="Instagram"><n-input v-model:value="form.instagram" placeholder="@username" /></n-form-item>
          </div>
        </n-tab-pane>
      </n-tabs>

      <n-form-item label="Izoh"><n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" /></n-form-item>
      <n-button type="primary" attr-type="submit" block :loading="pending">Saqlash</n-button>
    </n-form>
  </n-modal>
</template>
