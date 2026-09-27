<script setup lang="ts">
import type { AiProvider } from '#shared/utils/constants'

const show = defineModel<boolean>('show', { required: true })
const toast = useMessage()
const { settings, loadSettings } = useAiAssistant()

const form = reactive({ provider: 'gemini' as AiProvider, model: '', baseUrl: '', apiKey: '' })
const testResult = ref<{ ok: boolean; reply: string; ms: number } | null>(null)
const saving = ref(false)
const testing = ref(false)

watch(show, (open) => {
  if (!open) return
  const s = settings.value
  Object.assign(form, { provider: s?.provider ?? 'gemini', model: s?.model ?? '', baseUrl: s?.baseUrl ?? '', apiKey: '' })
  testResult.value = null
})

watch(
  () => form.provider,
  (p, old) => {
    if (!old || p === old || !show.value) return
    const info = AI_PROVIDER_INFO[p]
    form.model = info.models[0] ?? ''
    form.baseUrl = info.baseUrl
    form.apiKey = ''
    testResult.value = null
    liveModels.value = null
  },
)

const providerInfo = computed(() => AI_PROVIDER_INFO[form.provider])
const liveModels = ref<string[] | null>(null)
const loadingModels = ref(false)
const modelOptions = computed(() => (liveModels.value ?? providerInfo.value.models).map((m) => ({ label: m, value: m })))

/** Saves the current provider/key, then asks the provider which models this key can use. */
async function loadModels() {
  if (!(await saveSettings())) return
  loadingModels.value = true
  try {
    const res = await $fetch<{ data: string[] }>('/api/ai/settings/models')
    liveModels.value = res.data
    if (!res.data.length) toast.warning("Provayder bo'sh ro'yxat qaytardi")
    else if (!res.data.includes(form.model)) toast.info(`${res.data.length} ta model topildi — ro'yxatdan tanlang`)
    else toast.success(`${res.data.length} ta model topildi`)
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    loadingModels.value = false
  }
}
const providerOptions = AI_PROVIDERS.map((p) => ({ label: `${AI_PROVIDER_INFO[p].label} — ${AI_PROVIDER_INFO[p].free}`, value: p }))

async function saveSettings(): Promise<boolean> {
  saving.value = true
  try {
    await $fetch('/api/ai/settings', {
      method: 'PUT',
      body: { provider: form.provider, model: form.model, baseUrl: form.baseUrl || '', apiKey: form.apiKey || undefined },
    })
    form.apiKey = ''
    await loadSettings()
    return true
  } catch (error) {
    toast.error(errorMessage(error))
    return false
  } finally {
    saving.value = false
  }
}

async function saveAndTest() {
  if (!(await saveSettings())) return
  testing.value = true
  testResult.value = null
  try {
    const res = await $fetch<{ data: { ok: boolean; reply: string; ms: number } }>('/api/ai/settings/test', { method: 'POST' })
    testResult.value = res.data
  } catch (error) {
    testResult.value = { ok: false, reply: errorMessage(error), ms: 0 }
  } finally {
    testing.value = false
  }
}

async function saveOnly() {
  if (await saveSettings()) toast.success('Saqlandi')
}
</script>

<template>
  <n-drawer v-model:show="show" width="min(560px, 100vw)" :auto-focus="false">
    <n-drawer-content title="AI modelini sozlash" closable :native-scrollbar="false">
      <n-form label-placement="top" @submit.prevent="saveAndTest">
        <n-form-item label="Provayder">
          <n-select v-model:value="form.provider" :options="providerOptions" />
        </n-form-item>
        <n-alert :type="form.provider === 'anthropic' ? 'warning' : 'info'" :bordered="false" class="mb-4" :title="providerInfo.free">
          {{ providerInfo.note }}
          <div v-if="providerInfo.keyUrl" class="mt-1">
            {{ form.provider === 'ollama' ? "O'rnatish:" : 'Kalit olish:' }}
            <a :href="providerInfo.keyUrl" target="_blank" rel="noopener">{{ providerInfo.keyUrl }}</a>
          </div>
        </n-alert>
        <n-form-item label="Model">
          <div class="flex w-full gap-2">
            <n-select v-model:value="form.model" :options="modelOptions" filterable tag placeholder="Model nomini tanlang yoki yozing" class="flex-1" />
            <n-button :loading="loadingModels" title="Kalitingiz bilan mavjud modellar ro'yxatini provayderdan olish" @click="loadModels">Modellarni yuklash</n-button>
          </div>
        </n-form-item>
        <p v-if="liveModels" class="-mt-3 mb-3 text-xs text-emerald-700">Provayderdan olingan {{ liveModels.length }} ta mavjud model ko'rsatilmoqda.</p>
        <n-form-item v-if="form.provider === 'ollama' || form.provider === 'custom'" label="API manzili (base URL)">
          <n-input v-model:value="form.baseUrl" placeholder="http://localhost:11434/v1" />
        </n-form-item>
        <n-form-item
          v-if="providerInfo.needsKey || form.provider === 'custom'"
          :label="settings?.keys?.[form.provider] ? `API kalit (saqlangan: ${settings.keys[form.provider]})` : 'API kalit'"
        >
          <n-input
            v-model:value="form.apiKey"
            type="password"
            show-password-on="click"
            :placeholder="settings?.keys?.[form.provider] ? 'O\'zgartirish uchun yangisini kiriting' : 'Kalitni shu yerga qo\'ying'"
          />
        </n-form-item>
        <p class="-mt-2 text-xs text-slate-500">Kalit serverda shifrlangan holda saqlanadi va brauzerga qaytarilmaydi.</p>

        <n-alert
          v-if="testResult"
          :type="testResult.ok ? 'success' : 'error'"
          :bordered="false"
          class="mb-4"
          :title="testResult.ok ? `Ishlayapti (${(testResult.ms / 1000).toFixed(1)} s)` : 'Ulanmadi'"
        >
          {{ testResult.reply }}
        </n-alert>

        <div class="flex gap-2">
          <n-button type="primary" attr-type="submit" :loading="saving || testing">Saqlash va tekshirish</n-button>
          <n-button :loading="saving" @click="saveOnly">Faqat saqlash</n-button>
        </div>
      </n-form>

      <n-divider />
      <h3 class="m-0 mb-2 text-sm font-semibold">Qaysi modelni tanlash kerak?</h3>
      <ul class="m-0 flex list-none flex-col gap-2 p-0 text-sm text-slate-600">
        <li><b>Boshlash uchun — Google Gemini (bepul).</b> O'zbek tilini yaxshi tushunadi. Bepul tarifda Google so'rovlardan foydalanishi mumkin.</li>
        <li><b>Tez va bepul — Groq.</b> Juda tez, lekin o'zbek tilida biroz sustroq.</li>
        <li><b>Maxfiylik muhim bo'lsa — Ollama.</b> Ma'lumot zavoddan tashqariga chiqmaydi, lekin kuchli kompyuter kerak.</li>
        <li><b>Eng yuqori sifat — Claude (pullik).</b> Murakkab tahlil va aniq hisobotlar uchun.</li>
      </ul>
    </n-drawer-content>
  </n-drawer>
</template>
