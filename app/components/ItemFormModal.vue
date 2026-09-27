<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import type { ItemDto } from '#shared/types/models'
import type { ItemType, ProductKind, Unit } from '#shared/utils/constants'

interface Props {
  item: ItemDto | null
}
const props = defineProps<Props>()
const show = defineModel<boolean>('show', { required: true })
const emit = defineEmits<{ (e: 'saved'): void }>()
const { run, pending } = useApiAction()
const formRef = ref<FormInst | null>(null)

function initial() {
  const i = props.item
  return {
    code: i?.code ?? '',
    name: i?.name ?? '',
    type: (i?.type ?? 'raw') as ItemType,
    unit: (i?.unit ?? 'kg') as Unit,
    productKind: (i?.productKind ?? null) as ProductKind | null,
    unitWeightKg: i?.unitWeightKg ?? null,
    price: i?.price ?? 0,
    cost: i?.cost ?? 0,
    minStock: i?.minStock ?? 0,
    serialTracked: i?.serialTracked ?? false,
    description: i?.description ?? '',
    active: i?.active ?? true,
  }
}
const form = ref(initial())
watch(show, (v) => {
  if (v) form.value = initial()
})

const rules: FormRules = {
  code: { required: true, message: 'Kodni kiriting', trigger: 'blur' },
  name: { required: true, message: 'Nomini kiriting', trigger: 'blur' },
}

const typeOptions = ITEM_TYPES.map((t) => ({ label: ITEM_TYPE_LABELS[t], value: t }))
const unitOptions = UNITS.map((u) => ({ label: u, value: u }))
const kindOptions = PRODUCT_KINDS.map((k) => ({ label: PRODUCT_KIND_LABELS[k], value: k }))

async function submit() {
  await formRef.value?.validate()
  const url = props.item ? `/api/items/${props.item._id}` : '/api/items'
  const res = await run(url, { method: props.item ? 'PUT' : 'POST', body: form.value, success: 'Saqlandi' })
  if (res !== null) {
    show.value = false
    emit('saved')
  }
}
</script>

<template>
  <n-modal v-model:show="show" preset="card" :title="item ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot / material'" class="max-w-2xl" :mask-closable="false">
    <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <n-form-item label="Kod (artikul)" path="code"><n-input v-model:value="form.code" placeholder="Q-KORPUS-90" /></n-form-item>
        <n-form-item label="Nomi" path="name"><n-input v-model:value="form.name" /></n-form-item>
        <n-form-item label="Turi"><n-select v-model:value="form.type" :options="typeOptions" /></n-form-item>
        <n-form-item label="O'lchov birligi"><n-select v-model:value="form.unit" :options="unitOptions" /></n-form-item>
        <n-form-item v-if="form.type === 'finished'" label="Mahsulot turi">
          <n-select v-model:value="form.productKind" :options="kindOptions" clearable />
        </n-form-item>
        <n-form-item label="Bir dona og'irligi (kg)">
          <n-input-number v-model:value="form.unitWeightKg" :min="0" clearable class="w-full" />
        </n-form-item>
        <n-form-item label="Tannarx / xarid narxi (so'm)"><n-input-number v-model:value="form.cost" :min="0" class="w-full" /></n-form-item>
        <n-form-item label="Sotuv narxi (so'm)"><n-input-number v-model:value="form.price" :min="0" class="w-full" /></n-form-item>
        <n-form-item label="Minimal zaxira"><n-input-number v-model:value="form.minStock" :min="0" class="w-full" /></n-form-item>
        <n-form-item label="Holat">
          <n-space>
            <n-checkbox v-model:checked="form.active">Faol</n-checkbox>
            <n-checkbox v-model:checked="form.serialTracked">Seriya raqami (birka)</n-checkbox>
          </n-space>
        </n-form-item>
      </div>
      <n-form-item label="Tavsif"><n-input v-model:value="form.description" type="textarea" :autosize="{ minRows: 2 }" /></n-form-item>
      <n-button type="primary" attr-type="submit" block :loading="pending">Saqlash</n-button>
    </n-form>
  </n-modal>
</template>
