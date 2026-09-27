<script setup lang="ts">
import type { OperationDto } from '#shared/types/models'

interface Props {
  operation: OperationDto
}
defineProps<Props>()
</script>

<template>
  <div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
    <div>
      <div class="mb-1 font-medium text-slate-700">Natija</div>
      <div v-for="o in operation.outputs" :key="o.item._id" class="flex justify-between gap-2">
        <span>{{ o.item.name }}</span>
        <span class="tabular-nums">{{ fmtQty(o.qty, o.item.unit) }}<template v-if="operation.qcRequired"> (tekshirildi {{ fmtQty(o.inspectedQty) }})</template></span>
      </div>
    </div>
    <div>
      <div class="mb-1 font-medium text-slate-700">Sarf ({{ operation.sourceLocation.name }})</div>
      <div v-if="!operation.inputs.length" class="text-slate-400">—</div>
      <div v-for="o in operation.inputs" :key="o.item._id" class="flex justify-between gap-2">
        <span>{{ o.item.name }}</span>
        <span class="tabular-nums">{{ fmtQty(o.qty, o.item.unit) }}</span>
      </div>
    </div>
    <div>
      <div class="mb-1 font-medium text-slate-700">Qirindi (liteykaga)</div>
      <div v-if="!operation.wastes.length" class="text-slate-400">—</div>
      <div v-for="o in operation.wastes" :key="o.item._id" class="flex justify-between gap-2">
        <span>{{ o.item.name }}</span>
        <span class="tabular-nums">{{ fmtQty(o.qty, o.item.unit) }}</span>
      </div>
    </div>
    <div v-if="operation.serials.length" class="md:col-span-3">
      <div class="mb-1 font-medium text-slate-700">Seriya raqamlari</div>
      <div class="flex flex-wrap gap-1">
        <n-tag v-for="s in operation.serials" :key="s" size="small">{{ s }}</n-tag>
      </div>
    </div>
    <div v-if="operation.handoverTransfer" class="flex items-center gap-2 md:col-span-3">
      <span class="text-slate-700">Topshirildi: {{ operation.handoverTransfer.to.name }} ({{ operation.handoverTransfer.number }})</span>
      <StatusTag kind="transfer" :value="operation.handoverTransfer.status" />
    </div>
    <div v-if="operation.note" class="text-slate-600 md:col-span-3">Izoh: {{ operation.note }}</div>
  </div>
</template>
