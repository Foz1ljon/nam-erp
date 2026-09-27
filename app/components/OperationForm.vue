<script setup lang="ts">
import type { OperationSaved } from '#shared/types/models'
import type { Stage } from '#shared/utils/stages'

interface Props {
  stage: Stage
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'saved', payload: OperationSaved): void
}>()

const refs = useRefsStore()
const { user } = useAuth()
const { run, pending } = useApiAction()
const config = computed(() => STAGE_CONFIG[props.stage])

const locId = (code: string) => refs.locationByCode.get(code)?._id ?? null

const form = reactive({
  sourceLocation: locId(config.value.source),
  targetLocation: locId(config.value.target),
  afterQcLocation: locId(config.value.afterQc),
  worker: user.value?.id ?? null,
  qcRequired: config.value.qcDefault,
  handover: !!config.value.next,
  handoverTo: config.value.next ? locId(config.value.next) : null,
  handoverReceiver: null as string | null,
  autoInputs: true,
  note: '',
})
const outputs = ref<EditableLine[]>([newLine()])
const inputs = ref<EditableLine[]>([])
const wastes = ref<EditableLine[]>([])

const { stock, refresh: refreshStock } = useLocationStock(() => form.sourceLocation)

/** Consumption derived from the recipe (BOM) of each output for this stage. */
function computeInputs() {
  const totals = new Map<string, number>()
  for (const out of outputs.value) {
    if (!out.item || !out.qty) continue
    const item = refs.itemById.get(out.item)
    for (const line of item?.bom ?? []) {
      if (line.stage !== props.stage) continue
      totals.set(line.component._id, roundQty((totals.get(line.component._id) ?? 0) + line.qty * out.qty))
    }
  }
  inputs.value = [...totals].map(([item, qty]) => newLine({ item, qty }))
}

watch(
  () => [form.autoInputs, outputs.value.map((o) => `${o.item}:${o.qty}`).join('|')],
  () => {
    if (form.autoInputs) computeInputs()
  },
  { immediate: true },
)

// Motors get a full test before reaching the warehouse, so packaging defaults to QC for them.
watch(
  () => outputs.value.map((o) => o.item).join('|'),
  () => {
    if (props.stage !== 'packaging') return
    form.qcRequired = outputs.value.some((o) => o.item && refs.itemById.get(o.item)?.productKind === 'motor')
  },
)

watch(
  () => form.handoverTo,
  () => {
    form.handoverReceiver = null
  },
)

const qcLocationName = computed(() => refs.locationByCode.get(LOC.QC)?.name)

async function submit() {
  const payload = {
    stage: props.stage,
    sourceLocation: form.sourceLocation,
    targetLocation: form.targetLocation,
    afterQcLocation: form.qcRequired ? form.afterQcLocation : null,
    worker: form.worker,
    qcRequired: form.qcRequired,
    note: form.note || undefined,
    inputs: toQtyLines(inputs.value),
    outputs: toQtyLines(outputs.value),
    wastes: toQtyLines(wastes.value),
    handoverTo: !form.qcRequired && form.handover ? form.handoverTo : null,
    handoverReceiver: !form.qcRequired && form.handover ? form.handoverReceiver : null,
  }
  const res = await run<OperationSaved>('/api/operations', {
    method: 'POST',
    body: payload,
    success: 'Operatsiya saqlandi',
  })
  if (res) {
    outputs.value = [newLine()]
    wastes.value = []
    form.note = ''
    await refreshStock()
    emit('saved', res)
  }
}
</script>

<template>
  <n-form label-placement="top" @submit.prevent="submit">
    <div class="mb-3 flex justify-end">
      <TourButton tour="operationForm" label="Formani qanday to'ldirish kerak?" size="small" auto />
    </div>
    <n-alert type="info" :bordered="false" class="mb-4">{{ config.description }}</n-alert>

    <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <n-form-item label="Sarf qaysi joydan olinadi" data-tour="op-source">
        <LocationSelect v-model="form.sourceLocation" />
      </n-form-item>
      <n-form-item label="Ishchi (bajaruvchi)" data-tour="op-worker">
        <UserSelect v-model="form.worker" :roles="[...config.roles, 'admin', 'director']" :clearable="false" />
      </n-form-item>
    </div>

    <n-divider title-placement="left">1. Natija (ishlab chiqarilgan)</n-divider>
    <LineEditor v-model="outputs" data-tour="op-outputs" :types="config.outputTypes" add-label="Mahsulot qo'shish" />

    <n-divider title-placement="left">2. Sarf (xomashyo, detal, material)</n-divider>
    <div class="mb-2 flex items-center gap-2 text-sm" data-tour="op-auto">
      <n-switch v-model:value="form.autoInputs" size="small" />
      <span>Retsept (BOM) bo'yicha avtomatik hisoblash</span>
    </div>
    <LineEditor v-model="inputs" data-tour="op-inputs" :types="config.inputTypes" :stock="stock" add-label="Sarf qo'shish" empty-text="Sarf yo'q" />

    <template v-if="config.wasteAllowed">
      <n-divider title-placement="left">3. Liteykaga qaytadigan qirindi / brak / ortiqcha quyma</n-divider>
      <LineEditor v-model="wastes" data-tour="op-wastes" :types="['scrap']" add-label="Qirindi qo'shish" empty-text="Qirindi yo'q" />
    </template>

    <n-divider title-placement="left">Keyingi qadam</n-divider>
    <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <n-form-item label="Sifat nazoratiga yuborish" data-tour="op-qc">
        <n-switch v-model:value="form.qcRequired" />
      </n-form-item>
      <n-form-item v-if="form.qcRequired" label="Tekshiruvdan o'tgach qayerga">
        <LocationSelect v-model="form.afterQcLocation" />
      </n-form-item>
      <n-form-item v-else label="Natija qayerga tushadi">
        <LocationSelect v-model="form.targetLocation" />
      </n-form-item>
    </div>
    <div v-if="!form.qcRequired" data-tour="op-handover" class="mb-3 rounded-md border border-blue-100 bg-blue-50/60 p-3">
      <div class="flex items-center gap-2 text-sm font-medium">
        <n-switch v-model:value="form.handover" size="small" />
        <span>Tayyor bo'lgach darhol keyingi bo'limga topshirish</span>
      </div>
      <div v-if="form.handover" class="mt-3 grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <n-form-item label="Qaysi bo'limga" :show-feedback="false">
          <LocationSelect v-model="form.handoverTo" :exclude="form.targetLocation" />
        </n-form-item>
        <n-form-item label="Qabul qiluvchi (ixtiyoriy)" :show-feedback="false">
          <UserSelect v-model="form.handoverReceiver" :location="form.handoverTo" placeholder="Bo'limdagi istalgan hodim" />
        </n-form-item>
      </div>
      <p class="m-0 mt-2 text-xs text-slate-500">
        Mahsulot «yo'lda» holatiga o'tadi va qabul qiluvchi bo'lim «Topshirish / qabul» sahifasida tasdiqlaydi.
      </p>
    </div>
    <p v-if="form.qcRequired" class="-mt-2 mb-3 text-xs text-slate-500">
      Natija avval «{{ qcLocationName }}» zonasiga tushadi; nazoratchi tekshirgach yaroqlisi tanlangan joyga o'tadi.
    </p>
    <p v-if="config.serials" class="-mt-2 mb-3 text-xs text-slate-500">
      Seriya raqamli mahsulotlar uchun birka raqamlari avtomatik yaratiladi va chop etish mumkin.
    </p>

    <n-form-item label="Izoh" data-tour="op-note">
      <n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" placeholder="Smena, pech raqami, partiya..." />
    </n-form-item>

    <n-button type="primary" attr-type="submit" size="large" block :loading="pending" data-tour="op-submit">Operatsiyani saqlash</n-button>
  </n-form>
</template>
