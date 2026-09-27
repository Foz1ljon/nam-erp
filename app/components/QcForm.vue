<script setup lang="ts">
import type { OperationDto } from '#shared/types/models'
import type { RejectAction } from '#shared/utils/constants'

interface Props {
  operation?: OperationDto | null
  itemId: string
  /** Maximum quantity that may be inspected. */
  maxQty: number
}
const props = withDefaults(defineProps<Props>(), { operation: null })
const emit = defineEmits<{ (e: 'saved'): void }>()

const refs = useRefsStore()
const { run, pending } = useApiAction()
const item = computed(() => refs.itemById.get(props.itemId))

const DEFECT_REASONS = [
  "G'ovaklik (rakovina)",
  'Yoriq',
  "To'liq quyilmagan",
  "O'lcham mos emas",
  'Rezba nuqsoni',
  "Qum qoldig'i",
  'Izolyatsiya qarshiligi past',
  'Shovqin / tebranish',
  "Bo'yoq nuqsoni",
  "Sinovdan o'tmadi",
]

const form = reactive({
  passedQty: props.maxQty as number | null,
  rejectedQty: 0 as number | null,
  rejectAction: 'scrap' as RejectAction | null,
  scrapItem: refs.items.find((i) => i.code === 'QR-BRAK')?._id ?? null,
  scrapQty: null as number | null,
  defectReason: '',
  passedLocation: props.operation?.afterQcLocation?._id ?? null,
  note: '',
})

const checked = computed(() => (form.passedQty ?? 0) + (form.rejectedQty ?? 0))
const overLimit = computed(() => checked.value > props.maxQty + 1e-6)
const estimatedScrap = computed(() => {
  const w = item.value?.unit === 'kg' ? 1 : (item.value?.unitWeightKg ?? 0)
  return roundQty((form.rejectedQty ?? 0) * w)
})

watch(
  () => form.rejectedQty,
  (rejected) => {
    const r = rejected ?? 0
    form.passedQty = Math.max(0, roundQty(props.maxQty - r))
  },
)

const actionOptions = REJECT_ACTIONS.map((a) => ({ label: REJECT_ACTION_LABELS[a], value: a }))

async function submit() {
  const res = await run('/api/qc', {
    method: 'POST',
    body: {
      operation: props.operation?._id ?? null,
      item: props.itemId,
      passedQty: form.passedQty ?? 0,
      rejectedQty: form.rejectedQty ?? 0,
      rejectAction: (form.rejectedQty ?? 0) > 0 ? form.rejectAction : null,
      scrapItem: form.rejectAction === 'scrap' ? form.scrapItem : null,
      scrapQty: form.scrapQty ?? 0,
      defectReason: form.defectReason || undefined,
      passedLocation: form.passedLocation,
      note: form.note || undefined,
    },
    success: 'Tekshiruv natijasi saqlandi',
  })
  if (res !== null) emit('saved')
}
</script>

<template>
  <n-form label-placement="top" @submit.prevent="submit">
    <div class="mb-3 flex justify-end">
      <TourButton tour="qcForm" label="Formani qanday to'ldirish kerak?" size="small" auto />
    </div>
    <div class="mb-4 rounded-md bg-slate-50 p-3 text-sm">
      <div class="font-medium">{{ item?.name }}</div>
      <div class="text-slate-500">
        Tekshirilishi kerak: <b>{{ fmtQty(maxQty, item?.unit) }}</b>
        <template v-if="operation"> · operatsiya {{ operation.number }} ({{ STAGE_CONFIG[operation.stage].label }})</template>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-x-4" data-tour="qc-passed">
      <n-form-item label="Yaroqli (o'tdi)">
        <n-input-number v-model:value="form.passedQty" :min="0" :max="maxQty" :precision="item?.unit === 'dona' ? 0 : 3" class="w-full" />
      </n-form-item>
      <n-form-item label="Brak (o'tmadi)">
        <n-input-number v-model:value="form.rejectedQty" :min="0" :max="maxQty" :precision="item?.unit === 'dona' ? 0 : 3" class="w-full" />
      </n-form-item>
    </div>
    <n-alert v-if="overLimit" type="error" :bordered="false" class="mb-3">Jami {{ fmtQty(checked) }} — ruxsat etilgan miqdordan ko'p</n-alert>

    <n-form-item label="Yaroqli mahsulot qayerga o'tkaziladi" data-tour="qc-location">
      <LocationSelect v-model="form.passedLocation" />
    </n-form-item>

    <template v-if="(form.rejectedQty ?? 0) > 0">
      <n-form-item label="Brak bilan nima qilinadi" data-tour="qc-action">
        <n-radio-group v-model:value="form.rejectAction">
          <n-space vertical>
            <n-radio v-for="o in actionOptions" :key="o.value" :value="o.value" :label="o.label" />
          </n-space>
        </n-radio-group>
      </n-form-item>
      <div v-if="form.rejectAction === 'scrap'" class="grid grid-cols-1 gap-x-4 md:grid-cols-2" data-tour="qc-scrap">
        <n-form-item label="Qirindi turi">
          <ItemSelect v-model="form.scrapItem" :types="['scrap']" />
        </n-form-item>
        <n-form-item label="Qirindi og'irligi (kg)">
          <n-input-number v-model:value="form.scrapQty" :min="0" :placeholder="`Avto: ${estimatedScrap}`" class="w-full" />
        </n-form-item>
      </div>
      <n-form-item label="Nuqson sababi" data-tour="qc-reason">
        <div class="flex w-full flex-col gap-2">
          <n-input v-model:value="form.defectReason" placeholder="Sababni kiriting yoki tanlang" />
          <div class="flex flex-wrap gap-1">
            <n-tag v-for="r in DEFECT_REASONS" :key="r" size="small" checkable :checked="form.defectReason === r" @update:checked="form.defectReason = r">
              {{ r }}
            </n-tag>
          </div>
        </div>
      </n-form-item>
    </template>

    <n-form-item label="Izoh">
      <n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2 }" />
    </n-form-item>
    <n-button type="primary" attr-type="submit" block data-tour="qc-submit" :loading="pending" :disabled="overLimit || checked <= 0 || !form.passedLocation">
      Natijani saqlash
    </n-button>
  </n-form>
</template>
