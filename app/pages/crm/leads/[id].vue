<script setup lang="ts">
import { CallOutline } from '@vicons/ionicons5'
import type { LeadDto, PhoneCallDto } from '#shared/types/models'
import type { ActivityType, SalesStatus } from '#shared/utils/constants'

definePageMeta({ permission: 'crm.use' })

type LeadDetails = LeadDto & {
  orders: { _id: string; number: string; status: SalesStatus; total: number; paidAmount: number; createdAt: string }[]
  calls: PhoneCallDto[]
}

const route = useRoute()
const { can } = useAuth()
const refs = useRefsStore()
const { run, pending: saving } = useApiAction()
const editOpen = ref(false)

const { data: lead, refresh } = await useApiData<LeadDetails | null>(() => `/api/leads/${route.params.id}`, { default: () => null })
if (!lead.value) throw createError({ statusCode: 404, statusMessage: 'Lid topilmadi', fatal: true })
useHead({ title: () => `${lead.value?.title ?? 'Lid'} — NamMotors ERP` })

const activity = reactive({ type: 'call' as ActivityType, text: '', dueAt: null as number | null })
const typeOptions = ACTIVITY_TYPES.map((t) => ({ label: ACTIVITY_TYPE_LABELS[t], value: t }))

async function addActivity() {
  if (!lead.value || !activity.text.trim()) return
  const res = await run(`/api/leads/${lead.value._id}/activities`, {
    method: 'POST',
    body: { type: activity.type, text: activity.text, dueAt: activity.dueAt ? new Date(activity.dueAt).toISOString() : null },
  })
  if (res !== null) {
    activity.text = ''
    activity.dueAt = null
    refresh()
  }
}

async function toggleDone(activityId: string, done: boolean) {
  if (!lead.value) return
  if (await run(`/api/leads/${lead.value._id}/activities/${activityId}`, { method: 'PATCH', body: { done } }) !== null) refresh()
}

async function createOrder() {
  if (!lead.value) return
  const res = await run<{ customer: string; lead: string }>(`/api/leads/${lead.value._id}/convert`, { method: 'POST' })
  if (res) {
    await refs.load(true)
    await navigateTo({ path: '/sales/new', query: { customer: res.customer, lead: res.lead } })
  }
}
</script>

<template>
  <div v-if="lead">
    <PageHeader :title="lead.title" :subtitle="`${lead.contactName}${lead.company ? ' · ' + lead.company : ''} · ${LEAD_SOURCE_LABELS[lead.source]}`" tour="lead">
      <template #actions>
        <StatusTag kind="lead" :value="lead.status" />
        <n-button data-tour="lead-edit" @click="editOpen = true">Tahrirlash</n-button>
        <n-button v-if="can('sales.manage') && lead.status !== 'lost'" type="primary" data-tour="lead-order" @click="createOrder">Sotuv buyurtmasi yaratish</n-button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div class="flex flex-col gap-5 xl:col-span-2">
        <n-card size="small" title="Faoliyat (qo'ng'iroq, uchrashuv, vazifa)">
          <n-form data-tour="lead-activity" @submit.prevent="addActivity">
            <div class="grid grid-cols-1 gap-2 md:grid-cols-12">
              <n-select v-model:value="activity.type" :options="typeOptions" class="md:col-span-3" />
              <n-input v-model:value="activity.text" placeholder="Nima bo'ldi yoki nima qilish kerak" class="md:col-span-5" />
              <n-date-picker v-if="activity.type === 'task' || activity.type === 'meeting'" v-model:value="activity.dueAt" type="datetime" format="dd.MM.yyyy HH:mm" clearable placeholder="Muddat" class="md:col-span-3" />
              <n-button type="primary" attr-type="submit" :loading="saving" class="md:col-span-1">+</n-button>
            </div>
          </n-form>
          <n-timeline class="mt-5" data-tour="lead-timeline">
            <n-timeline-item
              v-for="a in lead.activities"
              :key="a._id"
              :type="a.type === 'task' ? (a.done ? 'success' : 'warning') : 'default'"
              :title="ACTIVITY_TYPE_LABELS[a.type]"
              :time="`${fmtDateTime(a.createdAt)} · ${a.user.fullName}`"
            >
              <div class="text-sm">{{ a.text }}</div>
              <div v-if="a.type === 'task'" class="mt-1 flex items-center gap-2 text-xs">
                <label class="flex items-center gap-1.5"><n-switch size="small" :value="a.done" @update:value="(v: boolean) => toggleDone(a._id, v)" />Bajarildi</label>
                <span v-if="a.dueAt" class="text-slate-500">muddat: {{ fmtDateTime(a.dueAt) }}</span>
              </div>
            </n-timeline-item>
          </n-timeline>
          <n-empty v-if="!lead.activities.length" description="Hali faoliyat yo'q" />
        </n-card>

        <n-card v-if="lead.calls.length" size="small" title="Qo'ng'iroqlar va yozuvlar">
          <ul class="m-0 flex list-none flex-col p-0">
            <li v-for="c in lead.calls" :key="c._id" class="flex flex-col gap-2 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
              <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span class="font-medium" :class="c.direction === 'missed' || c.direction === 'rejected' ? 'text-red-600' : ''">
                  {{ CALL_DIRECTION_LABELS[c.direction] }}<template v-if="c.duration"> · {{ fmtDuration(c.duration) }}</template>
                </span>
                <span class="text-xs text-slate-500">{{ fmtDateTime(c.startedAt) }} · {{ c.phone }} · {{ c.user.fullName }}</span>
              </div>
              <audio
                v-if="c.recording"
                controls
                preload="none"
                class="h-9 w-full"
                :src="`/api/calls/${c._id}/audio`"
                :aria-label="`${CALL_DIRECTION_LABELS[c.direction]} yozuvi, ${fmtDateTime(c.startedAt)}`"
              />
              <span v-else-if="c.duration" class="text-xs text-slate-400">Yozuv hali yuklanmagan</span>
            </li>
          </ul>
        </n-card>
      </div>

      <div class="flex flex-col gap-5">
        <n-card size="small" title="Ma'lumot" data-tour="lead-info">
          <dl class="m-0 grid grid-cols-2 gap-y-2 text-sm">
            <dt class="text-slate-500">Telefon</dt>
            <dd class="m-0">
              <a v-if="lead.phone" :href="`tel:${lead.phone}`" class="inline-flex items-center gap-1">
                <n-icon><CallOutline /></n-icon>{{ lead.phone }}
              </a>
              <span v-else>—</span>
            </dd>
            <dt class="text-slate-500">Mahsulot</dt>
            <dd class="m-0">{{ lead.productInterest || '—' }}</dd>
            <dt class="text-slate-500">Taxminiy summa</dt>
            <dd class="m-0">{{ fmtMoney(lead.estimatedAmount) }}</dd>
            <dt class="text-slate-500">Menejer</dt>
            <dd class="m-0">{{ lead.manager?.fullName ?? '—' }}</dd>
            <dt class="text-slate-500">Mijoz kartasi</dt>
            <dd class="m-0">{{ lead.customer?.name ?? '—' }}</dd>
            <dt class="text-slate-500">Yaratilgan</dt>
            <dd class="m-0">{{ fmtDateTime(lead.createdAt) }}</dd>
          </dl>
          <p v-if="lead.note" class="mt-3 mb-0 text-sm text-slate-600">{{ lead.note }}</p>
          <p v-if="lead.lostReason" class="mt-2 mb-0 text-sm text-red-600">Sabab: {{ lead.lostReason }}</p>
        </n-card>
        <n-card size="small" title="Buyurtmalar" data-tour="lead-orders">
          <n-empty v-if="!lead.orders.length" size="small" description="Buyurtma yo'q" />
          <NuxtLink v-for="o in lead.orders" :key="o._id" :to="`/sales/${o._id}`" class="flex items-center justify-between border-t border-slate-100 py-2 text-sm no-underline">
            <span>{{ o.number }} · {{ fmtDate(o.createdAt) }}</span>
            <span class="flex items-center gap-2"><b>{{ fmtMoney(o.total) }}</b><StatusTag kind="sales" :value="o.status" /></span>
          </NuxtLink>
        </n-card>
      </div>
    </div>

    <LeadFormModal v-model:show="editOpen" :lead="lead" @saved="refresh()" />
  </div>
</template>
