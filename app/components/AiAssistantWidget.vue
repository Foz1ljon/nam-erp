<script setup lang="ts">
import { AddOutline, Close, ExpandOutline, SettingsOutline, Sparkles, TimeOutline } from '@vicons/ionicons5'

const { can } = useAuth()
const { configured, activeLabel, thinking, messages, ensureLoaded, newChat } = useAiAssistant()

const open = ref(false)
const historyOpen = ref(false)
const settingsOpen = ref(false)
const chatView = ref<{ focus: () => void } | null>(null)
const panel = ref<HTMLElement | null>(null)

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await ensureLoaded()
    await nextTick()
    chatView.value?.focus()
  }
}

function startNew() {
  newChat()
  historyOpen.value = false
  nextTick(() => chatView.value?.focus())
}

async function expand() {
  open.value = false
  await navigateTo('/ai')
}

onKeyStroke('Escape', () => {
  if (open.value && !settingsOpen.value) open.value = false
})

// Unseen-answer dot: the assistant replied while the panel was closed.
const unseen = ref(false)
watch(
  () => messages.value.length,
  () => {
    if (!open.value && messages.value.at(-1)?.role === 'assistant') unseen.value = true
  },
)
watch(open, (v) => {
  if (v) unseen.value = false
})
</script>

<template>
  <div class="no-print">
    <!-- Chat panel -->
    <Transition
      enter-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-out"
      enter-from-class="opacity-0 translate-y-3 scale-95"
      leave-active-class="motion-safe:transition motion-safe:duration-150 motion-safe:ease-in"
      leave-to-class="opacity-0 translate-y-3 scale-95"
    >
      <section
        v-if="open"
        ref="panel"
        role="dialog"
        aria-label="AI yordamchi"
        class="fixed inset-0 z-[1500] flex origin-bottom-right flex-col overflow-hidden bg-white shadow-2xl sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(660px,calc(100vh-8rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-slate-200"
      >
        <header class="nm-ai-header flex items-center gap-3 px-4 py-3 text-white">
          <div class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
            <n-icon size="20" :class="thinking ? 'motion-safe:animate-spin' : 'nm-ai-breathe'"><Sparkles /></n-icon>
            <span class="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-indigo-600" :class="configured ? 'bg-emerald-400' : 'bg-amber-400'" />
          </div>
          <div class="min-w-0 flex-1 leading-tight">
            <div class="font-semibold">AI yordamchi</div>
            <div class="truncate text-xs text-white/80">
              {{ thinking ? 'Javob tayyorlanmoqda…' : configured ? `Onlayn · ${activeLabel}` : 'Model ulanmagan' }}
            </div>
          </div>
          <div class="flex items-center">
            <n-button quaternary circle size="small" class="text-white!" aria-label="Yangi suhbat" title="Yangi suhbat" @click="startNew">
              <template #icon><n-icon color="#fff"><AddOutline /></n-icon></template>
            </n-button>
            <n-popover v-model:show="historyOpen" trigger="click" placement="bottom-end" :width="280" style="max-height: 360px" scrollable>
              <template #trigger>
                <n-button quaternary circle size="small" aria-label="Suhbatlar tarixi" title="Suhbatlar tarixi">
                  <template #icon><n-icon color="#fff"><TimeOutline /></n-icon></template>
                </n-button>
              </template>
              <AiChatHistory @selected="historyOpen = false" />
            </n-popover>
            <n-button v-if="can('ai.settings')" quaternary circle size="small" aria-label="AI modelini sozlash" title="AI modelini sozlash" @click="settingsOpen = true">
              <template #icon><n-icon color="#fff"><SettingsOutline /></n-icon></template>
            </n-button>
            <n-button quaternary circle size="small" class="hidden! sm:inline-flex!" aria-label="To'liq ekranda ochish" title="To'liq ekranda ochish" @click="expand">
              <template #icon><n-icon color="#fff"><ExpandOutline /></n-icon></template>
            </n-button>
            <n-button quaternary circle size="small" aria-label="Yopish" title="Yopish (Esc)" @click="open = false">
              <template #icon><n-icon color="#fff"><Close /></n-icon></template>
            </n-button>
          </div>
        </header>

        <n-alert v-if="!configured" type="warning" :bordered="false" class="m-3" title="AI modeli ulanmagan">
          <template v-if="can('ai.settings')">
            Bepul Google Gemini kalitini ulash uchun
            <n-button text type="primary" @click="settingsOpen = true">sozlamalarni oching</n-button>.
          </template>
          <template v-else>Administrator AI modelini ulashi kerak.</template>
        </n-alert>

        <AiChatView ref="chatView" compact class="min-h-0 flex-1" />
      </section>
    </Transition>

    <!-- Floating live button -->
    <button
      type="button"
      data-tour="ai-fab"
      class="group fixed right-5 bottom-5 z-[1500] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-indigo-500/40 outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:right-6 sm:bottom-6 sm:h-16 sm:w-16"
      :class="open ? 'max-sm:hidden' : ''"
      :aria-label="open ? 'AI yordamchini yopish' : 'AI yordamchini ochish'"
      :aria-expanded="open"
      @click="toggle"
    >
      <!-- halo -->
      <span v-if="!open" class="nm-ai-orb absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping" aria-hidden="true" />
      <!-- orb -->
      <span class="nm-ai-orb absolute inset-0 rounded-full transition-transform group-hover:scale-105 group-active:scale-95" aria-hidden="true" />
      <span class="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/25 to-transparent" aria-hidden="true" />
      <n-icon size="28" class="relative" :class="thinking ? 'motion-safe:animate-spin' : open ? '' : 'nm-ai-breathe'">
        <Close v-if="open" />
        <Sparkles v-else />
      </n-icon>
      <!-- online / new-answer indicator -->
      <span v-if="!open" class="absolute top-0.5 right-0.5 flex h-3.5 w-3.5" aria-hidden="true">
        <span class="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping" :class="unseen ? 'bg-rose-400' : 'bg-emerald-400'" />
        <span class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white" :class="unseen ? 'bg-rose-500' : 'bg-emerald-500'" />
      </span>
      <span
        v-if="!open"
        class="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100 sm:block"
      >
        AI yordamchi
      </span>
    </button>

    <AiSettingsDrawer v-if="can('ai.settings')" v-model:show="settingsOpen" />
  </div>
</template>
