<script setup lang="ts">
import { ArrowBackOutline, LogoInstagram, PaperPlane, Send } from '@vicons/ionicons5'
import type { ChatMessageDto, ConversationDto } from '#shared/types/models'

definePageMeta({ permission: ['crm.use', 'channels.use'] })
useHead({ title: 'Xabarlar — NamMotors ERP' })

const route = useRoute()
const router = useRouter()
const { can } = useAuth()
const toast = useMessage()
const { run, pending: sending } = useApiAction()

const search = ref('')
const debounced = refDebounced(search, 300)
const unreadOnly = ref(false)
const selectedId = ref<string | null>((route.query.c as string | undefined) ?? null)

const { data: conversations, refresh: refreshList } = await useApiData<ConversationDto[]>('/api/inbox', {
  query: () => ({ q: debounced.value, channel: route.query.channel as string | undefined, unread: unreadOnly.value ? 'true' : undefined }),
  default: () => [],
})

interface Thread {
  conversation: ConversationDto
  messages: ChatMessageDto[]
}
const thread = ref<Thread | null>(null)
const draft = ref('')
const scroller = ref<HTMLElement | null>(null)

async function loadThread(scroll = true) {
  if (!selectedId.value) {
    thread.value = null
    return
  }
  try {
    const res = await $fetch<{ data: Thread }>(`/api/inbox/${selectedId.value}`)
    const grew = res.data.messages.length !== thread.value?.messages.length
    thread.value = res.data
    // useAsyncData data is a shallowRef in Nuxt 4: replace the list so the unread badge updates.
    if (conversations.value.some((c) => c._id === selectedId.value && c.unread)) {
      conversations.value = conversations.value.map((c) => (c._id === selectedId.value ? { ...c, unread: 0 } : c))
    }
    if (scroll && grew) {
      await nextTick()
      scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
    }
  } catch (error) {
    thread.value = null
    toast.error(errorMessage(error))
  }
}

function select(id: string) {
  selectedId.value = id
  router.replace({ query: { ...route.query, c: id } })
}

watch(selectedId, () => loadThread(), { immediate: import.meta.client })

// Live updates while the tab is visible.
const visibility = useDocumentVisibility()
useIntervalFn(() => {
  if (visibility.value !== 'visible') return
  refreshList()
  loadThread()
}, 5000)

async function send() {
  const text = draft.value.trim()
  if (!text || !selectedId.value) return
  const res = await run(`/api/inbox/${selectedId.value}/messages`, { method: 'POST', body: { text } })
  if (res !== null) {
    draft.value = ''
    await loadThread()
    refreshList()
  } else {
    await loadThread()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

async function linkCustomer(customer: string | null) {
  if (!selectedId.value) return
  if ((await run(`/api/inbox/${selectedId.value}`, { method: 'PATCH', body: { customer }, success: customer ? "Mijoz kartasiga bog'landi" : "Bog'lanish olib tashlandi" })) !== null) {
    loadThread(false)
    refreshList()
  }
}

async function handover(manager: string | null) {
  if (!selectedId.value || !manager) return
  if ((await run(`/api/inbox/${selectedId.value}`, { method: 'PATCH', body: { manager }, success: 'Suhbat boshqa menejerga berildi' })) !== null) {
    loadThread(false)
    refreshList()
  }
}

const customerId = computed({
  get: () => thread.value?.conversation.customer?._id ?? null,
  set: (v: string | null) => linkCustomer(v),
})
const managerId = computed({
  get: () => thread.value?.conversation.manager._id ?? null,
  set: (v: string | null) => handover(v),
})

/** "14:05" for today's messages, the date otherwise (Tashkent days, same on server and browser). */
function timeLabel(value: string) {
  return fmtDate(value) === fmtDate(new Date()) ? fmtDateTime(value).slice(-5) : fmtDate(value)
}
</script>

<template>
  <div>
    <PageHeader title="Xabarlar" subtitle="Telegram va Instagram profillaringizga mijozlar yozgan xabarlar. Har bir yangi yozgan odam avtomatik lid bo'ladi." tour="inbox">
      <template #actions>
        <NuxtLink v-if="can('channels.use')" to="/crm/channels"><n-button data-tour="inbox-profiles">Profillarni ulash</n-button></NuxtLink>
      </template>
    </PageHeader>

    <div class="grid h-[calc(100dvh-190px)] min-h-[480px] grid-cols-1 overflow-hidden rounded-[10px] border border-slate-200 bg-white md:grid-cols-[320px_1fr]">
      <!-- conversation list -->
      <aside class="flex min-h-0 flex-col border-r border-slate-200" :class="selectedId ? 'hidden md:flex' : 'flex'" data-tour="inbox-list">
        <div class="flex flex-col gap-2 border-b border-slate-200 p-3">
          <n-input v-model:value="search" clearable size="small" placeholder="Ism, telefon, matn" />
          <label class="flex items-center gap-2 text-xs text-slate-600"><n-switch v-model:value="unreadOnly" size="small" />Faqat o'qilmaganlar</label>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <n-empty v-if="!conversations.length" description="Hali xabar yo'q" class="py-10" />
          <button
            v-for="c in conversations"
            :key="c._id"
            type="button"
            class="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2.5 text-left transition hover:bg-slate-50"
            :class="c._id === selectedId ? 'bg-blue-50' : ''"
            @click="select(c._id)"
          >
            <n-icon size="18" class="mt-0.5 shrink-0" :color="c.channelType === 'telegram' ? '#229ED9' : '#E1306C'">
              <PaperPlane v-if="c.channelType === 'telegram'" />
              <LogoInstagram v-else />
            </n-icon>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-medium" :class="c.unread ? 'text-slate-900' : 'text-slate-700'">{{ c.contactName }}</span>
                <span class="shrink-0 text-xs text-slate-400">{{ timeLabel(c.lastMessageAt) }}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-xs text-slate-500">{{ c.lastMessageText }}</span>
                <n-badge v-if="c.unread" :value="c.unread" type="info" />
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- thread -->
      <section class="min-h-0 flex-col" :class="selectedId ? 'flex' : 'hidden md:flex'">
        <div v-if="!thread" class="flex flex-1 items-center justify-center text-sm text-slate-400">Chapdan suhbatni tanlang</div>
        <template v-else>
          <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3" data-tour="inbox-header">
            <n-button class="md:hidden!" quaternary circle aria-label="Orqaga" @click="selectedId = null">
              <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
            </n-button>
            <div class="min-w-0 flex-1">
              <div class="font-medium">{{ thread.conversation.contactName }}</div>
              <div class="text-xs text-slate-500">
                {{ CHANNEL_TYPE_LABELS[thread.conversation.channelType] }} · {{ thread.conversation.channel.name }}
                <template v-if="thread.conversation.contactUsername"> · @{{ thread.conversation.contactUsername }}</template>
                <template v-if="thread.conversation.contactPhone">
                  · <a :href="`tel:${thread.conversation.contactPhone}`">{{ thread.conversation.contactPhone }}</a>
                </template>
              </div>
            </div>
            <NuxtLink v-if="thread.conversation.lead" :to="`/crm/leads/${thread.conversation.lead._id}`" class="flex items-center gap-1 text-sm no-underline">
              Lid: <StatusTag kind="lead" :value="thread.conversation.lead.status" />
            </NuxtLink>
            <div class="w-56" data-tour="inbox-customer">
              <CounterpartySelect v-model="customerId" type="customer" placeholder="Mijoz kartasiga bog'lash" />
            </div>
            <NuxtLink v-if="thread.conversation.customer" :to="`/crm/clients/${thread.conversation.customer._id}`">
              <n-button size="small">Mijoz kartasi</n-button>
            </NuxtLink>
            <div v-if="can('users.manage') || can('ai.use')" class="w-52">
              <UserSelect v-model="managerId" :roles="['sales', 'director', 'admin']" :clearable="false" placeholder="Menejer" />
            </div>
          </header>

          <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4" data-tour="inbox-thread">
            <div class="flex flex-col gap-2">
              <div
                v-for="m in thread.messages"
                :key="m._id"
                class="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-xs"
                :class="[
                  m.direction === 'out' ? 'self-end rounded-br-sm bg-blue-600 text-white' : 'self-start rounded-bl-sm bg-white text-slate-800',
                  m.status === 'failed' ? 'bg-red-50! text-red-800! ring-1 ring-red-300' : '',
                ]"
              >
                <div class="whitespace-pre-wrap break-words">{{ m.text }}</div>
                <div class="mt-1 text-right text-[11px]" :class="m.direction === 'out' && m.status !== 'failed' ? 'text-blue-100' : 'text-slate-400'">
                  <template v-if="m.user">{{ m.user.fullName }} · </template>{{ fmtDateTime(m.createdAt) }}
                  <template v-if="m.status === 'failed'"> · yuborilmadi: {{ m.error }}</template>
                </div>
              </div>
            </div>
          </div>

          <footer class="flex items-end gap-2 border-t border-slate-200 p-3" data-tour="inbox-reply">
            <n-input
              v-model:value="draft"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 6 }"
              placeholder="Javob yozing… (Enter — yuborish, Shift+Enter — yangi qator)"
              @keydown="onKeydown"
            />
            <n-button type="primary" :loading="sending" :disabled="!draft.trim()" aria-label="Yuborish" @click="send">
              <template #icon><n-icon><Send /></n-icon></template>
            </n-button>
          </footer>
        </template>
      </section>
    </div>
  </div>
</template>
