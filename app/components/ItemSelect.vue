<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import type { ItemType } from '#shared/utils/constants'

interface Props {
  types?: readonly ItemType[]
  placeholder?: string
  clearable?: boolean
  /** Show available quantity in this location next to each item. */
  stock?: Record<string, number>
}
const props = withDefaults(defineProps<Props>(), {
  types: undefined,
  placeholder: 'Mahsulot tanlang',
  clearable: false,
  stock: undefined,
})
const model = defineModel<string | null>({ required: true })
const refs = useRefsStore()

const options = computed<SelectOption[]>(() =>
  refs.items
    .filter((i) => i.active && (!props.types || props.types.includes(i.type)))
    .map((i) => {
      const available = props.stock ? ` — mavjud: ${fmtQty(props.stock[i._id] ?? 0, i.unit)}` : ''
      return { label: `${i.code} · ${i.name} (${i.unit})${available}`, value: i._id }
    }),
)
</script>

<template>
  <n-select v-model:value="model" :options="options" filterable :clearable="clearable" :placeholder="placeholder" />
</template>
