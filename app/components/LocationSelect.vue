<script setup lang="ts">
import type { LocationType } from '#shared/utils/constants'

interface Props {
  types?: LocationType[]
  exclude?: string | null
  placeholder?: string
  clearable?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  types: undefined,
  exclude: null,
  placeholder: 'Joyni tanlang',
  clearable: false,
})
const model = defineModel<string | null>({ required: true })
const refs = useRefsStore()

const options = computed(() =>
  refs.locations
    .filter((l) => l.active && l._id !== props.exclude && (!props.types || props.types.includes(l.type)))
    .map((l) => ({ label: l.name, value: l._id })),
)
</script>

<template>
  <n-select v-model:value="model" :options="options" filterable :clearable="clearable" :placeholder="placeholder" />
</template>
