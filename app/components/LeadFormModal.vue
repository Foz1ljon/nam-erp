<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import type { LeadDto } from '#shared/types/models'
import type { LeadSource, LeadStatus } from '#shared/utils/constants'

interface Props {
  lead: LeadDto | null
}
const props = defineProps<Props>()
const show = defineModel<boolean>('show', { required: true })
const emit = defineEmits<{ (e: 'saved', id: string): void }>()
const { run, pending } = useApiAction()
const { user } = useAuth()
const formRef = ref<FormInst | null>(null)

function initial() {
  const l = props.lead
  return {
    title: l?.title ?? '',
    contactName: l?.contactName ?? '',
    phone: l?.phone ?? '',
    company: l?.company ?? '',
    source: (l?.source ?? 'phone') as LeadSource,
    status: (l?.status ?? 'new') as LeadStatus,
    manager: l?.manager?._id ?? user.value?.id ?? null,
    estimatedAmount: l?.estimatedAmount ?? 0,
    productInterest: l?.productInterest ?? '',
    note: l?.note ?? '',
    lostReason: l?.lostReason ?? '',
  }
}
const form = ref(initial())
watch(show, (v) => {
  if (v) form.value = initial()
})

const rules: FormRules = {
  title: { required: true, message: 'Sarlavha kiriting', trigger: 'blur' },
  contactName: { required: true, message: 'Mijoz ismini kiriting', trigger: 'blur' },
}
const sourceOptions = LEAD_SOURCES.map((s) => ({ label: LEAD_SOURCE_LABELS[s], value: s }))
const statusOptions = LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], value: s }))

async function submit() {
  await formRef.value?.validate()
  const url = props.lead ? `/api/leads/${props.lead._id}` : '/api/leads'
  const res = await run<{ _id: string }>(url, { method: props.lead ? 'PUT' : 'POST', body: form.value, success: 'Saqlandi' })
  if (res) {
    show.value = false
    emit('saved', res._id)
  }
}
</script>

<template>
  <n-modal v-model:show="show" preset="card" :title="lead ? 'Lidni tahrirlash' : 'Yangi lid'" class="max-w-2xl" :mask-closable="false">
    <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" @submit.prevent="submit">
      <n-form-item label="Sarlavha (nima kerak)" path="title">
        <n-input v-model:value="form.title" placeholder="Masalan: 10 ta AIR80 dvigatel" />
      </n-form-item>
      <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <n-form-item label="Mijoz ismi" path="contactName"><n-input v-model:value="form.contactName" /></n-form-item>
        <n-form-item label="Telefon"><n-input v-model:value="form.phone" placeholder="+998" /></n-form-item>
        <n-form-item label="Kompaniya"><n-input v-model:value="form.company" /></n-form-item>
        <n-form-item label="Manba"><n-select v-model:value="form.source" :options="sourceOptions" /></n-form-item>
        <n-form-item label="Qiziqqan mahsulot"><n-input v-model:value="form.productInterest" /></n-form-item>
        <n-form-item label="Taxminiy summa (so'm)"><n-input-number v-model:value="form.estimatedAmount" :min="0" class="w-full" /></n-form-item>
        <n-form-item label="Holat"><n-select v-model:value="form.status" :options="statusOptions" /></n-form-item>
        <n-form-item label="Mas'ul menejer"><UserSelect v-model="form.manager" :roles="['sales', 'director', 'admin']" /></n-form-item>
      </div>
      <n-form-item v-if="form.status === 'lost'" label="Yo'qotish sababi"><n-input v-model:value="form.lostReason" /></n-form-item>
      <n-form-item label="Izoh"><n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" /></n-form-item>
      <n-button type="primary" attr-type="submit" block :loading="pending">Saqlash</n-button>
    </n-form>
  </n-modal>
</template>
