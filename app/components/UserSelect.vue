<script setup lang="ts">
import type { Role } from '#shared/utils/constants'

interface Props {
  roles?: Role[]
  location?: string | null
  placeholder?: string
  clearable?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  roles: undefined,
  location: null,
  placeholder: 'Hodimni tanlang',
  clearable: true,
})
const model = defineModel<string | null>({ required: true })
const refs = useRefsStore()

const options = computed(() =>
  refs.users
    .filter((u) => u.active)
    .filter((u) => !props.roles || props.roles.includes(u.role))
    .filter((u) => !props.location || u.location?._id === props.location || ['admin', 'director', 'warehouse'].includes(u.role))
    .map((u) => ({ label: `${u.fullName} — ${ROLE_LABELS[u.role]}`, value: u._id })),
)
</script>

<template>
  <n-select v-model:value="model" :options="options" filterable :clearable="clearable" :placeholder="placeholder" />
</template>
