import { z } from 'zod'

const schema = z.object({ text: z.string().trim().min(1).max(20_000) })

/** Assistant answer (Markdown) → spoken WAV audio. */
export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ai.use')
  const { text } = await parseBody(event, schema)
  const speakable = speakableText(text)
  if (!speakable) conflict("O'qiladigan matn yo'q")
  try {
    const audio = await synthesizeSpeech(speakable)
    setHeader(event, 'Content-Type', audio.mime)
    setHeader(event, 'Cache-Control', 'private, no-store')
    return audio.data
  } catch (error) {
    conflict(errorText(error))
  }
})
