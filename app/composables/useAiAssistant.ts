import type { AiChatDto, AiChatSummary, AiMessageDto, AiSettingsDto } from '#shared/types/models'

export const AI_SUGGESTIONS = [
  "Bugun zavodda nima bo'ldi? Qisqa hisobot ber",
  "Shu oy qaysi hodim eng ko'p mahsulot ishlab chiqardi?",
  'Liteyka quyuvchilar kecha nima qildi?',
  'Pishka stroyda brak foizi qancha va asosiy sabablari nima?',
  'Qaysi mijozlarda qarz bor? Excel qilib ber',
  'Sotuv menejerlari bu hafta mijozlarga javob beryaptimi?',
  "Kam qolgan xomashyo va materiallar ro'yxatini Excel qil",
  "Shu oyning sotuvlarini mahsulot va menejer bo'yicha Excel hujjat qilib ber",
]

export const AI_TOOL_LABELS: Record<string, string> = {
  get_overview: 'umumiy holat',
  list_employees: 'hodimlar',
  employee_activity: 'hodim faoliyati',
  search_operations: 'ishlab chiqarish',
  get_stock: 'ombor qoldiqlari',
  search_transfers: 'topshirishlar',
  quality_report: 'sifat nazorati',
  search_sales: 'sotuvlar',
  search_clients: 'mijozlar',
  search_leads: 'lidlar',
  messaging_summary: 'yozishmalar',
  stock_movements: 'ombor harakatlari',
  create_excel: 'Excel fayl',
}

/**
 * Shared state for the AI assistant: the floating corner widget and the full /ai page show the same
 * conversation, so switching between them never loses context.
 */
export function useAiAssistant() {
  const chats = useState<AiChatSummary[]>('ai:chats', () => [])
  const chatId = useState<string | null>('ai:chatId', () => null)
  const messages = useState<AiMessageDto[]>('ai:messages', () => [])
  const settings = useState<AiSettingsDto | null>('ai:settings', () => null)
  const thinking = useState<boolean>('ai:thinking', () => false)
  const loaded = useState<boolean>('ai:loaded', () => false)
  const voice = useState<{ stt: string | null; tts: string | null }>('ai:voice', () => ({ stt: null, tts: null }))
  const transcribing = useState<boolean>('ai:transcribing', () => false)
  /** Id of the message currently being read aloud (or loading audio). */
  const speakingId = useState<string | null>('ai:speakingId', () => null)
  const speakLoading = useState<boolean>('ai:speakLoading', () => false)
  const toast = useMessage()

  async function loadChats() {
    chats.value = (await $fetch<{ data: AiChatSummary[] }>('/api/ai/chats')).data
  }

  async function loadSettings() {
    const [s, v] = await Promise.all([
      $fetch<{ data: AiSettingsDto }>('/api/ai/settings'),
      $fetch<{ data: { stt: string | null; tts: string | null } }>('/api/ai/voice/status'),
    ])
    settings.value = s.data
    voice.value = v.data
  }

  /** Lazy: nothing is fetched until the assistant is first opened. */
  async function ensureLoaded() {
    if (loaded.value) return
    try {
      await Promise.all([loadChats(), loadSettings()])
      loaded.value = true
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function openChat(id: string) {
    try {
      const res = await $fetch<{ data: AiChatDto }>(`/api/ai/chats/${id}`)
      chatId.value = id
      messages.value = res.data.messages
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  function newChat() {
    chatId.value = null
    messages.value = []
  }

  async function ask(text: string) {
    const content = text.trim()
    if (!content || thinking.value) return
    messages.value = [
      ...messages.value,
      { _id: `local-${Date.now()}`, role: 'user', content, files: [], tools: [], createdAt: new Date().toISOString() },
    ]
    thinking.value = true
    try {
      const res = await $fetch<{ data: { chat: string; message: AiMessageDto } }>('/api/ai/chats/messages', {
        method: 'POST',
        body: { chat: chatId.value, content },
      })
      messages.value = [...messages.value, res.data.message]
      if (!chatId.value) {
        chatId.value = res.data.chat
        loadChats()
      }
    } catch (error) {
      messages.value = [
        ...messages.value,
        { _id: `err-${Date.now()}`, role: 'assistant', content: `⚠️ ${errorMessage(error)}`, files: [], tools: [], error: true, createdAt: new Date().toISOString() },
      ]
    } finally {
      thinking.value = false
    }
  }

  // ---------------------------------------------------------------- voice

  let player: HTMLAudioElement | null = null
  let playerUrl: string | null = null

  function stopSpeaking() {
    player?.pause()
    if (playerUrl) URL.revokeObjectURL(playerUrl)
    player = null
    playerUrl = null
    speakingId.value = null
    speakLoading.value = false
  }

  /** Reads an assistant message aloud (toggle: calling it again for the same message stops it). */
  async function speak(message: AiMessageDto) {
    if (speakingId.value === message._id) return stopSpeaking()
    stopSpeaking()
    speakingId.value = message._id
    speakLoading.value = true
    try {
      const blob = await $fetch<Blob>('/api/ai/voice/speak', { method: 'POST', body: { text: message.content }, responseType: 'blob' })
      if (speakingId.value !== message._id) return
      playerUrl = URL.createObjectURL(blob)
      player = new Audio(playerUrl)
      player.onended = stopSpeaking
      speakLoading.value = false
      await player.play()
    } catch (error) {
      stopSpeaking()
      toast.error(errorMessage(error))
    }
  }

  /** Voice question: transcribe, show it as the user's message, answer, and read the answer aloud. */
  async function askByVoice(audio: Blob) {
    transcribing.value = true
    let text = ''
    try {
      const form = new FormData()
      form.append('audio', audio, 'savol.wav')
      text = (await $fetch<{ data: { text: string } }>('/api/ai/voice/transcribe', { method: 'POST', body: form })).data.text
    } catch (error) {
      toast.error(errorMessage(error))
      return
    } finally {
      transcribing.value = false
    }
    if (!text) {
      toast.warning("Ovoz tanilmadi, qaytadan aniqroq gapiring")
      return
    }
    await ask(text)
    const answer = messages.value.at(-1)
    if (answer?.role === 'assistant' && !answer.error && voice.value.tts) await speak(answer)
  }

  async function removeChat(id: string) {
    try {
      await $fetch(`/api/ai/chats/${id}`, { method: 'DELETE' })
      if (chatId.value === id) newChat()
      await loadChats()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const configured = computed(() => !!settings.value?.configured)
  const activeLabel = computed(() => (settings.value ? `${AI_PROVIDER_INFO[settings.value.provider].label} · ${settings.value.model}` : ''))

  return {
    chats, chatId, messages, settings, thinking, configured, activeLabel,
    voice, transcribing, speakingId, speakLoading,
    ensureLoaded, loadChats, loadSettings, openChat, newChat, ask, removeChat, speak, stopSpeaking, askByVoice,
  }
}
