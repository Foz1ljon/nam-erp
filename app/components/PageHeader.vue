<script setup lang="ts">
import type { TourKey } from '~/utils/tours'

interface Props {
  title: string
  subtitle?: string
  /** Guided tour for this page: adds a "Yordam" button and runs once on first visit. */
  tour?: TourKey
}
withDefaults(defineProps<Props>(), { subtitle: undefined, tour: undefined })
</script>

<template>
  <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <h1 class="m-0 text-xl font-semibold text-slate-900 lg:text-2xl">{{ title }}</h1>
      <p v-if="subtitle" class="m-0 mt-1 max-w-3xl text-sm text-slate-500">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <TourButton v-if="tour" :tour="tour" auto data-tour="page-help" />
      <slot name="actions" />
    </div>
  </div>
</template>
