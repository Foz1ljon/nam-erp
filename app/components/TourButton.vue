<script setup lang="ts">
import { HelpCircleOutline } from '@vicons/ionicons5'
import type { TourKey } from '~/utils/tours'

interface Props {
  tour: TourKey
  label?: string
  /** Start automatically on the user's first visit. */
  auto?: boolean
  size?: 'tiny' | 'small' | 'medium'
}
const props = withDefaults(defineProps<Props>(), { label: 'Yordam', auto: false, size: 'medium' })
const { start, autoStart } = useTour()

onMounted(() => {
  if (props.auto) autoStart(props.tour)
})
</script>

<template>
  <n-button
    :size="size"
    secondary
    type="info"
    :aria-label="`${label}: sahifadagi tugmalar nima qilishini ko'rsatish`"
    @click="start(tour)"
  >
    <template #icon><n-icon><HelpCircleOutline /></n-icon></template>
    {{ label }}
  </n-button>
</template>
