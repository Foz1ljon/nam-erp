<script setup lang="ts">
import { AddOutline, SettingsOutline } from '@vicons/ionicons5'

definePageMeta({ permission: 'ai.use' })
useHead({ title: 'AI yordamchi — NamMotors ERP' })

const { can } = useAuth()
const { configured, activeLabel, settings, ensureLoaded, newChat } = useAiAssistant()
const settingsOpen = ref(false)

onMounted(ensureLoaded)
</script>

<template>
  <div>
    <PageHeader
      title="AI yordamchi"
      subtitle="Zavod haqida istalgan savolni oddiy tilda bering: kim nima qilyapti, ishlab chiqarish, sifat, ombor, sotuv, mijozlar, lidlar. «Excel qilib ber» desangiz — tayyor fayl yaratadi. Yordamchi har bir sahifada o'ng pastki burchakda ham turadi."
      tour="ai"
    >
      <template #actions>
        <n-tag v-if="configured" size="small" :bordered="false" type="info">{{ activeLabel }}</n-tag>
        <n-button v-if="can('ai.settings')" data-tour="ai-settings" @click="settingsOpen = true">
          <template #icon><n-icon><SettingsOutline /></n-icon></template>
          AI modelini sozlash
        </n-button>
      </template>
    </PageHeader>

    <n-alert v-if="settings && !configured" type="warning" :bordered="false" class="mb-4" title="AI modeli ulanmagan">
      Boshlash uchun «AI modelini sozlash» tugmasini bosing. Eng oson bepul variant — Google Gemini: aistudio.google.com'dan bepul kalit olib, shu yerga qo'yasiz.
    </n-alert>

    <div class="grid h-[calc(100dvh-200px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-[10px] border border-slate-200 bg-white lg:grid-cols-[260px_1fr]">
      <aside class="hidden min-h-0 flex-col border-r border-slate-200 lg:flex" data-tour="ai-chats">
        <div class="border-b border-slate-200 p-3">
          <n-button block dashed @click="newChat">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            Yangi suhbat
          </n-button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <AiChatHistory />
        </div>
      </aside>
      <ClientOnly>
        <AiChatView class="min-h-0" />
        <template #fallback>
          <div class="flex items-center justify-center"><n-spin /></div>
        </template>
      </ClientOnly>
    </div>

    <AiSettingsDrawer v-if="can('ai.settings')" v-model:show="settingsOpen" />
  </div>
</template>
