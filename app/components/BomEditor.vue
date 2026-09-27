<script setup lang="ts">
import { AddOutline, TrashOutline } from '@vicons/ionicons5'
import type { ItemDto } from '#shared/types/models'
import type { Stage } from '#shared/utils/stages'

interface Props {
  item: ItemDto
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'saved'): void }>()
const { run, pending } = useApiAction()
const { can } = useAuth()

interface Row {
  key: number
  component: string | null
  qty: number | null
  stage: Stage
}
let seq = 0
const rows = ref<Row[]>(
  props.item.bom.map((b) => ({ key: ++seq, component: b.component._id, qty: b.qty, stage: b.stage })),
)
const stageOptions = STAGES.map((s) => ({ label: `${STAGE_CONFIG[s].department}: ${STAGE_CONFIG[s].label}`, value: s }))

function add() {
  rows.value.push({ key: ++seq, component: null, qty: null, stage: 'assembly' })
}

async function save() {
  const lines = rows.value.filter((r) => r.component && (r.qty ?? 0) > 0).map((r) => ({ component: r.component, qty: r.qty, stage: r.stage }))
  const res = await run(`/api/items/${props.item._id}/bom`, { method: 'PUT', body: { lines }, success: 'Retsept saqlandi' })
  if (res !== null) emit('saved')
}
</script>

<template>
  <div>
    <p class="m-0 mb-3 text-sm text-slate-500">
      1 {{ item.unit }} «{{ item.name }}» ishlab chiqarish uchun har bir bosqichda qancha sarflanadi. Operatsiyada sarf shu retsept bo'yicha avtomatik hisoblanadi.
    </p>
    <div class="flex flex-col gap-2">
      <div v-for="r in rows" :key="r.key" class="grid grid-cols-12 gap-2">
        <n-select v-model:value="r.stage" :options="stageOptions" class="col-span-12 md:col-span-4" />
        <div class="col-span-12 md:col-span-5"><ItemSelect v-model="r.component" /></div>
        <n-input-number v-model:value="r.qty" :min="0" placeholder="Miqdor" class="col-span-9 md:col-span-2" />
        <n-button quaternary circle type="error" class="col-span-3 md:col-span-1" aria-label="O'chirish" @click="rows = rows.filter((x) => x.key !== r.key)">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
        </n-button>
      </div>
    </div>
    <div v-if="can('catalog.manage')" class="mt-3 flex justify-between">
      <n-button dashed size="small" @click="add">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        Komponent qo'shish
      </n-button>
      <n-button type="primary" :loading="pending" @click="save">Retseptni saqlash</n-button>
    </div>
  </div>
</template>
