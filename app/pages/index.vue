<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { DashboardDto, OperationDto } from '#shared/types/models'

useHead({ title: 'Bosh sahifa — NamMotors ERP' })
const { user, can } = useAuth()
const { data, refresh, pending } = await useApiData<DashboardDto | null>('/api/dashboard', { default: () => null })

const production = computed(() =>
  STAGES.map((stage) => {
    const row = data.value?.todayProduction.find((p) => p.stage === stage)
    return { stage, qty: row?.qty ?? 0, operations: row?.operations ?? 0 }
  }),
)

const leadTotals = computed(() => {
  const rows = data.value?.leadsByStatus ?? []
  const active = rows.filter((r) => !['won', 'lost'].includes(r.status))
  return { count: active.reduce((s, r) => s + r.count, 0), amount: active.reduce((s, r) => s + r.amount, 0) }
})

const recentColumns: DataTableColumns<OperationDto> = [
  { title: '№', key: 'number', width: 110 },
  { title: 'Bosqich', key: 'stage', render: (r) => `${STAGE_CONFIG[r.stage].department} · ${STAGE_CONFIG[r.stage].label}` },
  { title: 'Natija', key: 'outputs', render: (r) => r.outputs.map((o) => `${o.item.name}: ${fmtQty(o.qty, o.item.unit)}`).join(', ') },
  { title: 'Ishchi', key: 'worker', render: (r) => r.worker.fullName },
  { title: 'Vaqt', key: 'createdAt', width: 140, render: (r) => fmtDateTime(r.createdAt) },
]
</script>

<template>
  <div>
    <PageHeader :title="`Xush kelibsiz, ${user?.fullName ?? ''}`" subtitle="Zavoddagi bugungi holat" tour="dashboard">
      <template #actions>
        <n-button :loading="pending" @click="refresh()">Yangilash</n-button>
      </template>
    </PageHeader>

    <div v-if="data" class="flex flex-col gap-5">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Qabul kutayotgan topshirishlar"
          :value="data.myPendingTransfers"
          hint="Sizga yoki bo'limingizga yuborilgan"
          data-tour="dash-transfers"
          to="/transfers"
          :tone="data.myPendingTransfers ? 'warning' : 'default'"
        />
        <StatCard data-tour="dash-qc" label="Sifat nazorati navbati" :value="data.pendingQc" hint="Tekshirilmagan operatsiyalar" to="/qc" :tone="data.pendingQc ? 'warning' : 'default'" />
        <StatCard
          v-if="can('sales.view')"
          label="Oylik sotuv"
          data-tour="dash-sales"
          :value="fmtMoney(data.salesMonth.total)"
          :hint="`${data.salesMonth.count} ta buyurtma · to'langan ${fmtMoney(data.salesMonth.paid)}`"
          to="/sales"
          tone="success"
        />
        <StatCard
          v-if="can('crm.use')"
          label="Faol lidlar"
          data-tour="dash-leads"
          :value="leadTotals.count"
          :hint="`Taxminiy: ${fmtMoney(leadTotals.amount)}`"
          to="/crm/leads"
          tone="info"
        />
      </div>

      <n-card title="Bugungi ishlab chiqarish" size="small" data-tour="dash-production">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          <NuxtLink
            v-for="p in production"
            :key="p.stage"
            :to="`/production/${p.stage}`"
            class="rounded-lg border border-slate-200 p-3 no-underline transition hover:border-blue-400"
          >
            <div class="text-xs text-slate-500">{{ STAGE_CONFIG[p.stage].department }}</div>
            <div class="text-sm font-medium text-slate-800">{{ STAGE_CONFIG[p.stage].label }}</div>
            <div class="mt-1 text-xl font-semibold tabular-nums text-slate-900">{{ fmtQty(p.qty) }}</div>
            <div class="text-xs text-slate-500">{{ p.operations }} ta operatsiya</div>
          </NuxtLink>
        </div>
      </n-card>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <n-card title="Tayyor mahsulot ombori" size="small" data-tour="dash-finished">
          <n-empty v-if="!data.finishedStock.length" description="Tayyor mahsulot yo'q" />
          <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
            <li v-for="s in data.finishedStock" :key="s.item._id" class="flex justify-between gap-2 text-sm">
              <span>{{ s.item.name }}</span>
              <span class="shrink-0 font-semibold whitespace-nowrap tabular-nums">{{ fmtQty(s.qty, s.item.unit) }}</span>
            </li>
          </ul>
        </n-card>

        <n-card title="Kam qolgan zaxiralar" size="small" data-tour="dash-lowstock">
          <n-empty v-if="!data.lowStock.length" description="Hammasi yetarli" />
          <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
            <li v-for="s in data.lowStock" :key="s.item._id" class="flex justify-between gap-2 text-sm">
              <span>{{ s.item.name }}</span>
              <span class="shrink-0 whitespace-nowrap tabular-nums text-amber-700">{{ fmtQty(s.qty) }} / {{ fmtQty(s.minStock, s.item.unit) }}</span>
            </li>
          </ul>
        </n-card>

        <n-card title="Bo'limlardagi qoldiq" size="small" data-tour="dash-locations">
          <ul class="m-0 flex list-none flex-col gap-2 p-0">
            <li v-for="l in data.locationTotals" :key="l.location._id" class="flex justify-between gap-2 text-sm">
              <span>{{ l.location.name }}</span>
              <span class="shrink-0 whitespace-nowrap tabular-nums text-slate-600">{{ fmtQty(l.qtyKg) }} kg · {{ fmtQty(l.qtyPcs) }} dona</span>
            </li>
          </ul>
        </n-card>
      </div>

      <n-card v-if="can('production.view')" title="So'nggi operatsiyalar" size="small" data-tour="dash-recent">
        <n-data-table :columns="recentColumns" :data="data.recentOperations" :bordered="false" size="small" :scroll-x="720" :row-key="(r: OperationDto) => r._id" />
      </n-card>
    </div>
  </div>
</template>
