<script setup lang="ts">
import type { OperationDto } from '#shared/types/models'

definePageMeta({ layout: 'blank', permission: 'production.view' })

const route = useRoute()
const { data: op } = await useApiData<OperationDto | null>(() => `/api/operations/${route.params.id}`, { default: () => null })
useHead({ title: () => `Birkalar ${op.value?.number ?? ''}` })

const labels = computed(() => {
  if (!op.value) return []
  // Serials were generated in output order, one per unit of each serial-tracked output.
  const result: { serial: string; name: string; code: string; kind: string; weight?: number | null }[] = []
  let cursor = 0
  for (const o of op.value.outputs) {
    if (!o.item.serialTracked) continue
    for (let i = 0; i < o.qty && cursor < op.value.serials.length; i++) {
      result.push({
        serial: op.value.serials[cursor++]!,
        name: o.item.name,
        code: o.item.code,
        kind: o.item.productKind ? PRODUCT_KIND_LABELS[o.item.productKind] : '',
        weight: o.item.unitWeightKg,
      })
    }
  }
  return result
})

function print() {
  window.print()
}
</script>

<template>
  <div class="p-6">
    <div class="no-print mb-4 flex items-center gap-3">
      <n-button type="primary" @click="print">Chop etish</n-button>
      <span class="text-sm text-slate-500">{{ labels.length }} ta birka · operatsiya {{ op?.number }}</span>
    </div>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3">
      <div v-for="l in labels" :key="l.serial" class="break-inside-avoid rounded border-2 border-slate-800 bg-white p-3 text-slate-900">
        <div class="flex items-center justify-between border-b border-slate-800 pb-1">
          <span class="text-sm font-bold">NAMMOTORS</span>
          <span class="text-[10px]">O'zbekistonda ishlab chiqarilgan</span>
        </div>
        <div class="mt-2 text-xs uppercase text-slate-600">{{ l.kind }}</div>
        <div class="text-sm font-semibold leading-tight">{{ l.name }}</div>
        <div class="mt-1 text-xs">Model: {{ l.code }}</div>
        <div v-if="l.weight" class="text-xs">Og'irligi: {{ l.weight }} kg</div>
        <div class="mt-2 font-mono text-base font-bold tracking-wider">№ {{ l.serial }}</div>
        <div class="text-[10px] text-slate-600">Sana: {{ fmtDate(op?.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>
