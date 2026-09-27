<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { ClientDetails } from '#shared/types/models'
import { NuxtLink, StatusTag } from '#components'

definePageMeta({ permission: ['crm.use', 'sales.view'] })

const route = useRoute()
const { can } = useAuth()
const editOpen = ref(false)

const { data, refresh } = await useApiData<ClientDetails | null>(() => `/api/clients/${route.params.id}`, { default: () => null })
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Mijoz topilmadi', fatal: true })
useHead({ title: () => `${data.value?.client.name ?? 'Mijoz'} — NamMotors ERP` })

const client = computed(() => data.value!.client)
const stats = computed(() => data.value!.stats)
const overLimit = computed(() => !!client.value.creditLimit && stats.value.debt > client.value.creditLimit)

type Order = ClientDetails['orders'][number]
type Payment = ClientDetails['payments'][number]
type TopItem = ClientDetails['topItems'][number]

const orderColumns: DataTableColumns<Order> = [
  { title: '№', key: 'number', width: 120, render: (r) => h(NuxtLink, { to: `/sales/${r._id}` }, () => r.number) },
  { title: 'Sana', key: 'createdAt', width: 110, render: (r) => fmtDate(r.createdAt) },
  { title: 'Holat', key: 'status', width: 130, render: (r) => h(StatusTag, { kind: 'sales', value: r.status }) },
  { title: 'Summa', key: 'total', align: 'right', render: (r) => fmtMoney(r.total) },
  { title: "To'langan", key: 'paidAmount', align: 'right', render: (r) => fmtMoney(r.paidAmount) },
  {
    title: 'Qarz',
    key: 'debt',
    align: 'right',
    render: (r) => {
      const debt = ['draft', 'cancelled'].includes(r.status) ? 0 : r.total - r.paidAmount
      return h('span', { class: debt > 0 ? 'text-red-600' : 'text-slate-400' }, fmtMoney(debt))
    },
  },
  { title: "Jo'natilgan", key: 'shippedAt', width: 110, render: (r) => fmtDate(r.shippedAt) },
]

const paymentColumns: DataTableColumns<Payment> = [
  { title: 'Sana', key: 'date', width: 140, render: (r) => fmtDateTime(r.date) },
  { title: 'Buyurtma', key: 'orderNumber', width: 120, render: (r) => h(NuxtLink, { to: `/sales/${r.orderId}` }, () => r.orderNumber) },
  { title: 'Usul', key: 'method', width: 140, render: (r) => PAYMENT_METHOD_LABELS[r.method] },
  { title: 'Summa', key: 'amount', align: 'right', render: (r) => fmtMoney(r.amount) },
  { title: 'Qabul qildi', key: 'user', render: (r) => r.user?.fullName ?? '—' },
  { title: 'Izoh', key: 'note', render: (r) => r.note ?? '' },
]

const itemColumns: DataTableColumns<TopItem> = [
  { title: 'Mahsulot', key: 'item', minWidth: 240, render: (r) => r.item.name },
  { title: 'Miqdor', key: 'qty', width: 120, align: 'right', render: (r) => fmtQty(r.qty, r.item.unit) },
  { title: 'Summa', key: 'amount', width: 160, align: 'right', render: (r) => fmtMoney(r.amount) },
]

const requisites = computed(() => {
  const c = client.value
  return [
    ['Yuridik nomi', c.legalName],
    [c.kind === 'b2b' ? 'STIR' : 'JShShIR', c.inn],
    ['Rahbar', c.director],
    ['Bank', c.bankName],
    ['Hisob raqami', c.bankAccount],
    ['MFO', c.mfo],
    ['OKED', c.oked],
    ["QQS kodi", c.vatCode],
    ['Shartnoma', c.contractNumber ? `№ ${c.contractNumber}${c.contractDate ? ' · ' + fmtDate(c.contractDate) : ''}` : ''],
    ["To'lov muddati", c.paymentTermsDays ? `${c.paymentTermsDays} kun` : ''],
    ['Kredit limiti', c.creditLimit ? fmtMoney(c.creditLimit) : ''],
  ].filter(([, v]) => v) as [string, string][]
})

const contacts = computed(() => {
  const c = client.value
  return [
    ["Mas'ul shaxs", c.contactPerson],
    ['Telefon', c.phone],
    ['Email', c.email],
    ['Telegram', c.telegram],
    ['Instagram', c.instagram],
    ['Veb-sayt', c.website],
    ['Viloyat', c.region],
    ['Manzil', c.address],
  ].filter(([, v]) => v) as [string, string][]
})
</script>

<template>
  <div v-if="data">
    <PageHeader
      :title="client.name"
      :subtitle="[CLIENT_KIND_LABELS[client.kind], client.segment ? CLIENT_SEGMENT_LABELS[client.segment] : null, client.manager ? `Menejer: ${client.manager.fullName}` : null].filter(Boolean).join(' · ')"
      tour="client"
    >
      <template #actions>
        <n-button v-if="can('counterparties.manage')" data-tour="client-edit" @click="editOpen = true">Tahrirlash</n-button>
        <NuxtLink v-if="can('sales.manage')" :to="{ path: '/sales/new', query: { customer: client._id } }">
          <n-button type="primary" data-tour="client-order">Yangi buyurtma</n-button>
        </NuxtLink>
      </template>
    </PageHeader>

    <n-alert v-if="overLimit" type="error" :bordered="false" class="mb-4">
      Qarz kredit limitidan oshgan: {{ fmtMoney(stats.debt) }} / {{ fmtMoney(client.creditLimit) }}. Yangi jo'natishdan oldin to'lovni talab qiling.
    </n-alert>

    <div class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="client-stats">
      <StatCard label="Jami savdo" :value="fmtMoney(stats.total)" :hint="`${stats.orders} ta buyurtma`" tone="info" />
      <StatCard label="To'langan" :value="fmtMoney(stats.paid)" tone="success" />
      <StatCard label="Qarz" :value="fmtMoney(stats.debt)" :tone="stats.debt > 0 ? 'warning' : 'default'" :hint="client.creditLimit ? `Limit: ${fmtMoney(client.creditLimit)}` : undefined" />
      <StatCard label="Oxirgi buyurtma" :value="fmtDate(stats.lastOrderAt)" :hint="stats.openLeads ? `${stats.openLeads} ta faol lid` : undefined" />
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <n-card size="small" class="xl:col-span-2" data-tour="client-tabs">
        <n-tabs type="line" animated>
          <n-tab-pane name="orders" :tab="`Buyurtmalar (${data.orders.length})`">
            <n-data-table :columns="orderColumns" :data="data.orders" :pagination="{ pageSize: 15 }" :scroll-x="800" size="small" />
          </n-tab-pane>
          <n-tab-pane name="payments" :tab="`To'lovlar (${data.payments.length})`">
            <n-data-table :columns="paymentColumns" :data="data.payments" :pagination="{ pageSize: 15 }" :scroll-x="800" size="small" />
          </n-tab-pane>
          <n-tab-pane name="items" tab="Ko'p olinadigan mahsulotlar">
            <n-data-table :columns="itemColumns" :data="data.topItems" size="small" />
          </n-tab-pane>
          <n-tab-pane name="leads" :tab="`Lidlar (${data.leads.length})`">
            <n-empty v-if="!data.leads.length" description="Lid yo'q" class="py-6" />
            <NuxtLink
              v-for="l in data.leads"
              :key="l._id"
              :to="`/crm/leads/${l._id}`"
              class="flex items-center justify-between border-b border-slate-100 py-2 text-sm no-underline"
            >
              <span>{{ l.title }} <span class="text-slate-400">· {{ fmtDate(l.createdAt) }}</span></span>
              <span class="flex items-center gap-2">{{ fmtMoney(l.estimatedAmount) }} <StatusTag kind="lead" :value="l.status" /></span>
            </NuxtLink>
          </n-tab-pane>
          <n-tab-pane name="chats" :tab="`Yozishmalar (${data.conversations.length})`">
            <n-empty v-if="!data.conversations.length" description="Telegram/Instagram yozishmalari yo'q" class="py-6" />
            <NuxtLink
              v-for="c in data.conversations"
              :key="c._id"
              :to="{ path: '/crm/inbox', query: { c: c._id } }"
              class="block border-b border-slate-100 py-2 text-sm no-underline"
            >
              <div class="flex justify-between">
                <span class="font-medium">{{ CHANNEL_TYPE_LABELS[c.channelType] }} · {{ c.contactName }}</span>
                <span class="text-xs text-slate-400">{{ fmtDateTime(c.lastMessageAt) }}</span>
              </div>
              <div class="truncate text-slate-500">{{ c.lastMessageText }}</div>
            </NuxtLink>
          </n-tab-pane>
        </n-tabs>
      </n-card>

      <div class="flex flex-col gap-5">
        <n-card size="small" title="Aloqa" data-tour="client-contacts">
          <n-empty v-if="!contacts.length" size="small" description="Kiritilmagan" />
          <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <template v-for="[label, value] in contacts" :key="label">
              <dt class="text-slate-500">{{ label }}</dt>
              <dd class="m-0 break-words">
                <a v-if="label === 'Telefon'" :href="`tel:${value}`">{{ value }}</a>
                <a v-else-if="label === 'Email'" :href="`mailto:${value}`">{{ value }}</a>
                <span v-else>{{ value }}</span>
              </dd>
            </template>
          </dl>
        </n-card>
        <n-card size="small" title="Rekvizitlar va shartnoma" data-tour="client-requisites">
          <n-empty v-if="!requisites.length" size="small" description="Kiritilmagan" />
          <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <template v-for="[label, value] in requisites" :key="label">
              <dt class="text-slate-500">{{ label }}</dt>
              <dd class="m-0 break-words">{{ value }}</dd>
            </template>
          </dl>
          <p v-if="client.note" class="mt-3 mb-0 text-sm text-slate-600">{{ client.note }}</p>
        </n-card>
      </div>
    </div>

    <ClientFormModal v-model:show="editOpen" :client="client" @saved="refresh()" />
  </div>
</template>
