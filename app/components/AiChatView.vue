<script setup lang="ts">
import { Close, DocumentTextOutline, DownloadOutline, Mic, Send, SparklesOutline, Stop, VolumeHighOutline } from '@vicons/ionicons5'

interface Props {
  /** Narrow layout for the floating corner panel. */
  compact?: boolean
}
const props = withDefaults(defineProps<Props>(), { compact: false })

const { user } = useAuth()
const { messages, thinking, configured, ask, voice, transcribing, speakingId, speakLoading, speak, askByVoice } = useAiAssistant()
const recorder = useVoiceRecorder()
const toast = useMessage()
const canRecord = computed(() => configured.value && !!voice.value.stt && recorder.supported.value)
const busy = computed(() => thinking.value || transcribing.value)

async function toggleRecording() {
  if (recorder.recording.value) return finishRecording()
  try {
    await recorder.start(finishRecording)
  } catch {
    toast.error("Mikrofonga ruxsat berilmadi. Brauzer manzil satridagi 🔒 belgisidan mikrofonni yoqing")
  }
}

async function finishRecording() {
  const audio = recorder.stop()
  if (!audio) {
    toast.warning('Juda qisqa — tugmani bosib, savolni ayting, keyin yana bosing')
    return
  }
  await askByVoice(audio)
}

const timeLabel = computed(() => {
  const s = recorder.seconds.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
// Five bars that follow the microphone level for a "live" waveform.
const bars = computed(() => [0.55, 0.8, 1, 0.8, 0.55].map((k) => Math.max(0.15, Math.min(1, recorder.level.value * k * 1.6))))
const draft = ref('')
const scroller = ref<HTMLElement | null>(null)
const input = ref<{ focus: () => void } | null>(null)

const suggestions = computed(() => (props.compact ? AI_SUGGESTIONS.slice(0, 5) : AI_SUGGESTIONS))

async function scrollDown() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}

watch(() => [messages.value.length, thinking.value], scrollDown)
onMounted(scrollDown)

async function send(text?: string) {
  const content = (text ?? draft.value).trim()
  if (!content) return
  draft.value = ''
  await ask(content)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto" :class="compact ? 'p-3' : 'p-4 lg:p-6'">
      <div v-if="!messages.length" class="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center" :class="compact ? 'py-3' : 'py-8'">
        <n-icon :size="compact ? 30 : 40" color="#4f46e5"><SparklesOutline /></n-icon>
        <div>
          <h2 class="m-0 font-semibold" :class="compact ? 'text-base' : 'text-lg'">Assalomu alaykum, {{ user?.fullName }}!</h2>
          <p class="m-0 mt-1 text-sm text-slate-500">ERP ma'lumotlarini ko'rib javob beraman. Masalan:</p>
        </div>
        <div class="grid w-full grid-cols-1 gap-2" :class="compact ? '' : 'sm:grid-cols-2'" data-tour="ai-suggestions">
          <button
            v-for="s in suggestions"
            :key="s"
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
            :disabled="!configured"
            @click="send(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div class="mx-auto flex max-w-3xl flex-col gap-3">
        <div v-for="m in messages" :key="m._id" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
          <div v-if="m.role === 'user'" class="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white">{{ m.content }}</div>
          <div v-else class="min-w-0 max-w-full flex-1">
            <div class="rounded-2xl rounded-bl-sm px-3.5 py-2.5" :class="m.error ? 'bg-red-50 text-red-800' : 'bg-slate-100/80'">
              <!-- markdown-it with html disabled: model output cannot inject markup -->
              <div class="ai-md" v-html="renderMarkdown(m.content)" />
              <div v-if="m.files.length" class="mt-3 flex flex-wrap gap-2">
                <a
                  v-for="f in m.files"
                  :key="f.id"
                  :href="`/api/ai/files/${f.id}`"
                  download
                  class="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 no-underline hover:bg-emerald-50"
                >
                  <n-icon><DocumentTextOutline /></n-icon>{{ f.name }}<n-icon><DownloadOutline /></n-icon>
                </a>
              </div>
            </div>
            <div class="mt-1 flex items-center gap-2 px-2 text-[11px] text-slate-400">
              <button
                v-if="voice.tts && !m.error"
                type="button"
                class="inline-flex items-center gap-1 rounded px-1 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"
                :aria-label="speakingId === m._id ? 'O\'qishni to\'xtatish' : 'Javobni ovoz chiqarib o\'qish'"
                @click="speak(m)"
              >
                <n-spin v-if="speakingId === m._id && speakLoading" :size="12" />
                <n-icon v-else :size="14" :class="speakingId === m._id ? 'text-indigo-600 motion-safe:animate-pulse' : ''">
                  <Stop v-if="speakingId === m._id" />
                  <VolumeHighOutline v-else />
                </n-icon>
                {{ speakingId === m._id ? "To'xtatish" : 'Eshitish' }}
              </button>
              <span v-if="m.tools.length">Tekshirildi: {{ m.tools.map((t) => AI_TOOL_LABELS[t] ?? t).join(', ') }}</span>
            </div>
          </div>
        </div>
        <div v-if="transcribing" class="flex items-center gap-2 self-end px-1 text-sm text-slate-500" role="status">
          <n-spin :size="14" /> Ovozingizni matnga aylantiryapman…
        </div>
        <div v-if="thinking" class="flex items-center gap-2 px-1 text-sm text-slate-500" role="status">
          <span class="flex gap-1" aria-hidden="true">
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 motion-safe:animate-bounce" />
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 motion-safe:animate-bounce [animation-delay:150ms]" />
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 motion-safe:animate-bounce [animation-delay:300ms]" />
          </span>
          Ma'lumotlarni tekshiryapman…
        </div>
      </div>
    </div>

    <footer class="border-t border-slate-200" :class="compact ? 'p-2.5' : 'p-3'" data-tour="ai-input">
      <!-- recording bar: live waveform, timer, cancel / send -->
      <div v-if="recorder.recording.value" class="mx-auto flex max-w-3xl items-center gap-3 rounded-full bg-rose-50 px-3 py-1.5" role="status" aria-live="polite">
        <span class="relative flex h-3 w-3">
          <span class="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 motion-safe:animate-ping" />
          <span class="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
        </span>
        <span class="text-sm font-medium tabular-nums text-rose-700">{{ timeLabel }}</span>
        <div class="flex h-6 flex-1 items-center justify-center gap-1" aria-hidden="true">
          <span v-for="(b, i) in bars" :key="i" class="w-1.5 rounded-full bg-rose-500 transition-[height] duration-100" :style="{ height: `${b * 100}%` }" />
        </div>
        <span class="hidden text-xs text-rose-700 sm:inline">Gapiring…</span>
        <n-button circle size="small" quaternary aria-label="Bekor qilish" @click="recorder.cancel()">
          <template #icon><n-icon><Close /></n-icon></template>
        </n-button>
        <n-button circle type="error" aria-label="Yuborish" @click="finishRecording">
          <template #icon><n-icon><Send /></n-icon></template>
        </n-button>
      </div>
      <div v-else class="mx-auto flex max-w-3xl items-end gap-2">
        <n-input
          ref="input"
          v-model:value="draft"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: compact ? 4 : 6 }"
          :disabled="!configured"
          :placeholder="configured ? (canRecord ? 'Yozing yoki 🎤 bosib gapiring…' : 'Savolingizni yozing… (Enter — yuborish)') : 'Avval AI modelini sozlang'"
          @keydown="onKeydown"
        />
        <n-button
          v-if="canRecord && !draft.trim()"
          type="primary"
          color="#4f46e5"
          :loading="busy"
          :disabled="busy"
          aria-label="Ovoz bilan so'rash"
          title="Ovoz bilan so'rash: bosing, gapiring, yana bosing"
          data-tour="ai-mic"
          @click="toggleRecording"
        >
          <template #icon><n-icon><Mic /></n-icon></template>
        </n-button>
        <n-button v-else type="primary" color="#4f46e5" :loading="thinking" :disabled="!draft.trim() || !configured" aria-label="Yuborish" @click="send()">
          <template #icon><n-icon><Send /></n-icon></template>
        </n-button>
      </div>
    </footer>
  </div>
</template>
