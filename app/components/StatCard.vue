<script setup lang="ts">
import { NuxtLink } from '#components'

interface Props {
  label: string
  value: string | number
  hint?: string
  to?: string
  tone?: 'default' | 'warning' | 'success' | 'info'
}
const props = withDefaults(defineProps<Props>(), { hint: undefined, to: undefined, tone: 'default' })

const accent = computed(() => ({
  default: 'border-l-slate-300',
  warning: 'border-l-amber-500',
  success: 'border-l-emerald-500',
  info: 'border-l-blue-600',
})[props.tone])
</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="block no-underline">
    <div class="h-full rounded-[10px] border border-l-4 border-slate-200 bg-white p-4 transition hover:shadow-sm" :class="accent">
      <div class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ label }}</div>
      <div class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ value }}</div>
      <div v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</div>
    </div>
  </component>
</template>
