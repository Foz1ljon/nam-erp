<script setup lang="ts">
import { AddOutline, TrashOutline } from '@vicons/ionicons5'
import type { ItemType } from '#shared/utils/constants'
import type { EditableLine } from '~/utils/lines'

interface Props {
  types?: readonly ItemType[]
  withPrice?: boolean
  withLocation?: boolean
  stock?: Record<string, number>
  addLabel?: string
  emptyText?: string
}
const props = withDefaults(defineProps<Props>(), {
  types: undefined,
  withPrice: false,
  withLocation: false,
  stock: undefined,
  addLabel: "Qator qo'shish",
  emptyText: "Qatorlar yo'q",
})
const lines = defineModel<EditableLine[]>({ required: true })
const refs = useRefsStore()

function add() {
  lines.value = [...lines.value, newLine({ price: props.withPrice ? 0 : undefined })]
}
function remove(key: number) {
  lines.value = lines.value.filter((l) => l.key !== key)
}
function onItemChange(line: EditableLine) {
  if (props.withPrice && line.item && !line.price) {
    const item = refs.itemById.get(line.item)
    line.price = item ? (item.type === 'raw' || item.type === 'material' || item.type === 'component' ? item.cost : item.price) : 0
  }
}
function unitOf(line: EditableLine) {
  return line.item ? refs.itemById.get(line.item)?.unit : undefined
}
function isShort(line: EditableLine) {
  return !!props.stock && !!line.item && (line.qty ?? 0) > (props.stock[line.item] ?? 0) + 1e-6
}

const total = computed(() => lines.value.reduce((s, l) => s + (l.qty ?? 0) * (l.price ?? 0), 0))
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="!lines.length" class="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
      {{ emptyText }}
    </div>
    <div
      v-for="line in lines"
      :key="line.key"
      class="grid grid-cols-12 items-start gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-2"
    >
      <div :class="withPrice || withLocation ? 'col-span-12 md:col-span-5' : 'col-span-12 md:col-span-7'">
        <ItemSelect v-model="line.item" :types="types" :stock="stock" @update:model-value="onItemChange(line)" />
      </div>
      <div v-if="withLocation" class="col-span-12 md:col-span-3">
        <LocationSelect v-model="line.location" placeholder="Qaysi joydan" />
      </div>
      <div :class="withPrice ? 'col-span-5 md:col-span-2' : 'col-span-9 md:col-span-4'">
        <n-input-number v-model:value="line.qty" :min="0" :precision="unitOf(line) === 'dona' ? 0 : 3" placeholder="Miqdor" :status="isShort(line) ? 'error' : undefined">
          <template #suffix>{{ unitOf(line) }}</template>
        </n-input-number>
        <div v-if="isShort(line)" class="mt-1 text-xs text-red-600">
          Mavjud: {{ fmtQty(stock?.[line.item!] ?? 0, unitOf(line)) }}
        </div>
      </div>
      <div v-if="withPrice" class="col-span-5 md:col-span-2">
        <n-input-number v-model:value="line.price" :min="0" :show-button="false" placeholder="Narx">
          <template #suffix>so'm</template>
        </n-input-number>
      </div>
      <div class="col-span-2 md:col-span-1 flex justify-end">
        <n-button quaternary circle type="error" aria-label="Qatorni o'chirish" @click="remove(line.key)">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
        </n-button>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <n-button dashed size="small" @click="add">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        {{ addLabel }}
      </n-button>
      <span v-if="withPrice" class="text-sm font-medium">Jami: {{ fmtMoney(total) }}</span>
    </div>
  </div>
</template>
