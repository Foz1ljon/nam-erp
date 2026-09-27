<script setup lang="ts">
type Kind = 'transfer' | 'qc' | 'sales' | 'lead'
type TagType = 'default' | 'info' | 'success' | 'warning' | 'error'

interface Props {
  kind: Kind
  value: string
}
const props = defineProps<Props>()

const MAP: Record<Kind, { labels: Record<string, string>; types: Record<string, TagType> }> = {
  transfer: {
    labels: TRANSFER_STATUS_LABELS,
    types: { pending: 'warning', accepted: 'success', rejected: 'error', cancelled: 'default' },
  },
  qc: { labels: QC_STATUS_LABELS, types: { none: 'default', pending: 'warning', done: 'success' } },
  sales: {
    labels: SALES_STATUS_LABELS,
    types: { draft: 'default', confirmed: 'info', shipped: 'warning', completed: 'success', cancelled: 'error' },
  },
  lead: {
    labels: LEAD_STATUS_LABELS,
    types: { new: 'info', contacted: 'default', qualified: 'warning', proposal: 'warning', won: 'success', lost: 'error' },
  },
}

const label = computed(() => MAP[props.kind].labels[props.value] ?? props.value)
const type = computed(() => MAP[props.kind].types[props.value] ?? 'default')
</script>

<template>
  <n-tag :type="type" size="small" round :bordered="false">{{ label }}</n-tag>
</template>
