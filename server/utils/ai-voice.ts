// Voice for the AI assistant: speech → text (question) and text → speech (answer).
// Gemini does both with the same key; Groq (Whisper) can do speech → text only.

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Newest first; if Google retires one, the next is tried automatically. */
const GEMINI_STT_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest']
const GEMINI_TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']
const TTS_VOICE = 'Kore'

// Domain words the recogniser would otherwise mishear ("liteyka" → "Lacetti").
const GLOSSARY = [
  'NamMotors', 'liteyka', 'pishka stroy', 'CHPU', 'obmotka', "yig'uv", "bo'yoq", 'qadoqlash', 'sifat nazorati', 'quyma',
  'chugun', 'korpus', 'podshipnik', 'parrak', 'rotor', 'stator', 'nasos', 'elektr dvigatel', 'AIR80', 'sklad', 'ombor',
  'topshirish', 'brak', 'qirindi', 'lid', 'mijoz', 'qarzdor', 'buyurtma', 'Excel', 'hisobot', 'STIR',
].join(', ')

const TRANSCRIBE_PROMPT =
  "Audio — NamMotors zavodi (elektr dvigatel va suv nasoslari) rahbarining ERP yordamchisiga bergan savoli. " +
  "Uni aytilgan tilda (odatda o'zbek, lotin yozuvida; rus tilida bo'lsa kirill yozuvida) aynan aytilgandek matnga aylantiring. " +
  `Zavod atamalari: ${GLOSSARY}. Faqat aytilgan matnni qaytaring, izoh qo'shmang. Hech narsa aytilmagan bo'lsa, bo'sh javob qaytaring.`

type VoiceBackend = { stt: 'gemini' | 'groq' | null; tts: 'gemini' | null }

export async function voiceBackend(): Promise<VoiceBackend> {
  const [gemini, groq] = await Promise.all([getProviderKey('gemini'), getProviderKey('groq')])
  return { stt: gemini ? 'gemini' : groq ? 'groq' : null, tts: gemini ? 'gemini' : null }
}

interface GeminiPart {
  text?: string
  thought?: boolean
  inlineData?: { mimeType: string; data: string }
}

async function geminiGenerate(models: string[], key: string, body: Record<string, unknown>) {
  let lastError: unknown
  for (const model of models) {
    try {
      const res = await $fetch<{ candidates?: { content?: { parts?: GeminiPart[] } }[] }>(`${GEMINI}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key },
        body,
        timeout: 90_000,
      })
      return res.candidates?.[0]?.content?.parts ?? []
    } catch (error) {
      lastError = error
      // 404 = model retired/unknown: try the next one; anything else is a real error.
      if ((error as { statusCode?: number }).statusCode !== 404) break
    }
  }
  throw new Error(`Gemini: ${errorText(lastError)}`)
}

export async function transcribeAudio(audio: Buffer, mime: string): Promise<string> {
  const backend = await voiceBackend()
  if (backend.stt === 'gemini') {
    const parts = await geminiGenerate(GEMINI_STT_MODELS, await getProviderKey('gemini'), {
      contents: [{ parts: [{ inline_data: { mime_type: mime, data: audio.toString('base64') } }, { text: TRANSCRIBE_PROMPT }] }],
      generationConfig: { temperature: 0 },
    })
    return parts.filter((p) => p.text && !p.thought).map((p) => p.text).join(' ').trim()
  }
  if (backend.stt === 'groq') {
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), 'question.wav')
    form.append('model', 'whisper-large-v3')
    form.append('prompt', GLOSSARY)
    form.append('response_format', 'json')
    try {
      const res = await $fetch<{ text: string }>(`${AI_PROVIDER_INFO.groq.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await getProviderKey('groq')}` },
        body: form,
        timeout: 90_000,
      })
      return res.text.trim()
    } catch (error) {
      throw new Error(`Groq: ${errorText(error)}`)
    }
  }
  throw new Error("Ovozli so'rov uchun AI sozlamalarida Gemini (yoki Groq) kaliti kerak")
}

/** Markdown answer → plain sentences a voice can read naturally. */
export function speakableText(markdown: string, maxChars = 1200): string {
  let text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → their text
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, ' ') // table separator rows
    .replace(/\|/g, ', ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/⚠️|✅|❌|📊|📈/g, '')
    .replace(/(,\s*){2,}/g, ', ')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (text.length > maxChars) {
    const cut = text.slice(0, maxChars)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    text = `${cut.slice(0, end > maxChars * 0.5 ? end + 1 : maxChars)} Batafsil ma'lumot ekranda.`
  }
  return text
}

/** Returns a playable audio file (WAV) for the given text. */
export async function synthesizeSpeech(text: string): Promise<{ data: Buffer; mime: string }> {
  const backend = await voiceBackend()
  if (backend.tts !== 'gemini') throw new Error("Ovozli javob uchun AI sozlamalarida Gemini kaliti kerak")
  const parts = await geminiGenerate(GEMINI_TTS_MODELS, await getProviderKey('gemini'), {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
    },
  })
  const audio = parts.find((p) => p.inlineData)?.inlineData
  if (!audio) throw new Error("Gemini ovoz qaytarmadi")
  const data = Buffer.from(audio.data, 'base64')
  // Some TTS models return raw 16-bit PCM ("audio/L16;rate=24000") instead of a WAV file.
  if (/wav/i.test(audio.mimeType) || data.subarray(0, 4).toString() === 'RIFF') return { data, mime: 'audio/wav' }
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] ?? 24000)
  return { data: pcmToWav(data, rate), mime: 'audio/wav' }
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}
