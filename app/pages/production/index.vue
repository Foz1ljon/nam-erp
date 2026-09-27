<script setup lang="ts">
import type { StockDto } from '#shared/types/models'
import type { LocationCode } from '#shared/utils/constants'
import type { Stage } from '#shared/utils/stages'

definePageMeta({ permission: 'production.view' })
useHead({ title: 'Ishlab chiqarish oqimi — NamMotors ERP' })

const refs = useRefsStore()
const { data: stock } = await useApiData<StockDto[]>('/api/stock', { default: () => [] })
const { data: pendingQc } = await useApiData<unknown[]>('/api/qc/pending', { default: () => [] })

const byLocation = computed(() => {
  const map = new Map<string, StockDto[]>()
  for (const s of stock.value) {
    const list = map.get(s.location.code) ?? []
    list.push(s)
    map.set(s.location.code, list)
  }
  return map
})

interface FlowNode {
  code: LocationCode
  stages: Stage[]
  note: string
}

const FLOW: FlowNode[] = [
  { code: LOC.RAW, stages: [], note: 'Chugun, metallar tashqaridan keladi' },
  { code: LOC.FOUNDRY, stages: ['casting'], note: "Quyish; qirindi va brak shu yerga qaytadi. Quymalarni sotish mumkin" },
  { code: LOC.FETTLING, stages: ['cleaning'], note: 'Qum va shlak tozalanadi → sifat nazorati' },
  { code: LOC.CNC, stages: ['cnc'], note: 'Rezba ochiladi → yarim tayyor' },
  { code: LOC.STORE, stages: [], note: 'Yarim tayyor, obmotka simi, jeleza, detallar' },
  { code: LOC.ASSEMBLY, stages: ['winding', 'assembly'], note: "Obmotka → korpusga yig'ish → sifat nazorati" },
  { code: LOC.PAINT, stages: ['painting', 'packaging'], note: "Bo'yash → birka → qadoq (dvigatel: to'liq sinov)" },
  { code: LOC.FINISHED, stages: [], note: 'Tayyor elektr dvigatel va nasoslar' },
]

function stockSummary(code: string) {
  const rows = byLocation.value.get(code) ?? []
  return rows
    .slice()
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
}
</script>

<template>
  <div>
    <PageHeader
      title="Ishlab chiqarish oqimi"
      subtitle="Xomashyodan tayyor mahsulotgacha: har bir bo'lim, undagi qoldiq va bajariladigan operatsiyalar"
      tour="flow"
    />

    <n-alert v-if="pendingQc.length" type="warning" class="mb-4" :bordered="false" data-tour="flow-qc-alert">
      Sifat nazoratida {{ pendingQc.length }} ta operatsiya tekshiruv kutmoqda.
      <NuxtLink to="/qc" class="font-medium">Ko'rish →</NuxtLink>
    </n-alert>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" data-tour="flow-grid">
      <n-card v-for="(node, i) in FLOW" :key="node.code" size="small" class="relative">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{{ i + 1 }}</span>
            <span>{{ refs.locationByCode.get(node.code)?.name ?? node.code }}</span>
          </div>
        </template>
        <p class="m-0 mb-3 text-xs text-slate-500">{{ node.note }}</p>
        <div v-if="node.stages.length" class="mb-3 flex flex-wrap gap-2">
          <NuxtLink v-for="s in node.stages" :key="s" :to="`/production/${s}`">
            <n-button size="small" type="primary" secondary>{{ STAGE_CONFIG[s].label }}</n-button>
          </NuxtLink>
        </div>
        <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          <li v-for="s in stockSummary(node.code)" :key="s._id" class="flex justify-between gap-2">
            <span class="truncate text-slate-700">{{ s.item.name }}</span>
            <span class="shrink-0 tabular-nums font-medium">{{ fmtQty(s.qty, s.item.unit) }}</span>
          </li>
          <li v-if="!stockSummary(node.code).length" class="text-slate-400">Bo'sh</li>
        </ul>
      </n-card>
    </div>
  </div>
</template>
