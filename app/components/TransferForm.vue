<script setup lang="ts">
const emit = defineEmits<{ (e: 'saved'): void }>()
const { user } = useAuth()
const { run, pending } = useApiAction()

const form = reactive({
  from: user.value?.locationId ?? null,
  to: null as string | null,
  receiver: null as string | null,
  note: '',
})
const lines = ref<EditableLine[]>([newLine()])
const { stock } = useLocationStock(() => form.from)

watch(() => form.to, () => {
  form.receiver = null
})

async function submit() {
  const res = await run('/api/transfers', {
    method: 'POST',
    body: { ...form, note: form.note || undefined, lines: toQtyLines(lines.value) },
    success: "Topshirildi. Qabul qiluvchi tasdiqlashi kutilmoqda",
  })
  if (res !== null) emit('saved')
}
</script>

<template>
  <n-form label-placement="top" @submit.prevent="submit">
    <div class="mb-3 flex justify-end">
      <TourButton tour="transferForm" label="Formani qanday to'ldirish kerak?" size="small" auto />
    </div>
    <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <n-form-item label="Qayerdan (topshiruvchi bo'lim)" data-tour="tf-from">
        <LocationSelect v-model="form.from" />
      </n-form-item>
      <n-form-item label="Qayerga (qabul qiluvchi bo'lim)" data-tour="tf-to">
        <LocationSelect v-model="form.to" :exclude="form.from" />
      </n-form-item>
    </div>
    <n-form-item label="Qabul qiluvchi hodim (ixtiyoriy)" data-tour="tf-receiver">
      <UserSelect v-model="form.receiver" :location="form.to" placeholder="Bo'limdagi istalgan hodim qabul qiladi" />
    </n-form-item>
    <n-divider title-placement="left">Topshiriladigan mahsulotlar</n-divider>
    <LineEditor v-model="lines" :stock="stock" data-tour="tf-lines" />
    <n-form-item label="Izoh" class="mt-4">
      <n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" />
    </n-form-item>
    <n-button type="primary" attr-type="submit" block size="large" data-tour="tf-submit" :loading="pending" :disabled="!form.from || !form.to">Topshirish</n-button>
  </n-form>
</template>
