import type { Types } from 'mongoose'
import { z } from 'zod'

const schema = z.object({
  chat: optionalObjectId,
  content: z.string().trim().min(1).max(4000),
})

const HISTORY_TURNS = 16

/** Sends a question to the assistant (creating the chat on first message) and stores both turns. */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'ai.use')
  const body = await parseBody(event, schema)

  let chat = body.chat ? await AiChatModel.findOne({ _id: body.chat, user: me.oid }) : null
  if (body.chat && !chat) notFound('Suhbat topilmadi')
  if (!chat) chat = await AiChatModel.create({ user: me.oid, title: body.content.slice(0, 70) })

  chat.messages.push({ role: 'user', content: body.content })
  await chat.save()

  const history = chat.messages
    .filter((m) => !m.error)
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  try {
    const result = await runAssistant({ user: { oid: me.oid, fullName: me.fullName, role: me.role }, chat: chat._id as Types.ObjectId, history })
    chat.provider = result.provider
    chat.aiModel = result.model
    chat.messages.push({
      role: 'assistant',
      content: result.content || "Javob bo'sh keldi. Savolni boshqacha berib ko'ring.",
      files: result.files.map((f) => ({ id: f.id, name: f.name })),
      tools: [...new Set(result.tools)],
    })
  } catch (error) {
    chat.messages.push({ role: 'assistant', content: `⚠️ ${errorText(error)}`, error: true })
  }
  await chat.save()
  return ok({ chat: chat._id, message: chat.messages[chat.messages.length - 1] })
})
