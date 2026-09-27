<script setup lang="ts">
import type { CounterpartyType } from '#shared/utils/constants'

interface Props {
  type?: CounterpartyType
  placeholder?: string
  clearable?: boolean
}
const props = withDefaults(defineProps<Props>(), { type: undefined, placeholder: 'Kontragentni tanlang', clearable: true })
const model = defineModel<string | null>({ required: true })
const refs = useRefsStore()

const options = computed(() =>
  refs.counterparties
    .filter((c) => !props.type || c.type === props.type || c.type === 'both')
    .map((c) => ({ label: c.phone ? `${c.name} (${c.phone})` : c.name, value: c._id })),
)
</script>

<template>
  <n-select v-model:value="model" :options="options" filterable :clearable="clearable" :placeholder="placeholder" />
</template>
