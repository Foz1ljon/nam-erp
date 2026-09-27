import type { Types } from 'mongoose'
import type { ChannelType, MessageDirection } from '../../shared/utils/constants'
import { CHANNEL_TYPE_LABELS } from '../../shared/utils/constants'

export const CONVERSATION_POPULATE = [
  { path: 'channel', select: 'name type' },
  { path: 'manager', select: USER_REF },
  { path: 'lead', select: 'title status' },
  { path: 'customer', select: 'name' },
]

/** Roles that see every manager's conversations and channels. */
export const INBOX_SUPERVISORS = ['admin', 'director']

export function canAccessConversation(me: { oid: Types.ObjectId; role: string }, conv: { manager: Types.ObjectId }) {
  return INBOX_SUPERVISORS.includes(me.role) || conv.manager.equals(me.oid)
}

interface ChannelRef {
  _id: Types.ObjectId
  type: ChannelType
  owner: Types.ObjectId
  greeting?: string | null
}

export interface IncomingMessage {
  externalChatId: string
  businessConnectionId?: string | null
  accessHash?: string | null
  contactName?: string
  contactUsername?: string
  contactPhone?: string
  text: string
  externalId?: string
  direction: MessageDirection
}

function isDuplicateKey(error: unknown) {
  return (error as { code?: number })?.code === 11000
}

/**
 * Stores a message from Telegram/Instagram. A contact writing for the first time becomes a new lead
 * assigned to the channel owner, so no enquiry is lost.
 */
export async function ingestMessage(channel: ChannelRef, msg: IncomingMessage) {
  let conversation = await ConversationModel.findOne({ channel: channel._id, externalChatId: msg.externalChatId })
  let isNew = false

  if (!conversation) {
    const label = CHANNEL_TYPE_LABELS[channel.type]
    const displayName = msg.contactName || (msg.contactUsername ? `@${msg.contactUsername}` : "Noma'lum mijoz")
    const lead = await LeadModel.create({
      title: `${label}: ${displayName}`,
      contactName: displayName,
      phone: msg.contactPhone,
      source: channel.type,
      status: 'new',
      manager: channel.owner,
      note: msg.contactUsername ? `${label}: @${msg.contactUsername}` : undefined,
      activities: [{ type: 'message', text: `${label} orqali yozdi: ${msg.text.slice(0, 500)}`, user: channel.owner, done: true }],
    })
    try {
      conversation = await ConversationModel.create({
        channel: channel._id,
        channelType: channel.type,
        externalChatId: msg.externalChatId,
        businessConnectionId: msg.businessConnectionId ?? null,
        accessHash: msg.accessHash ?? null,
        contactName: displayName,
        contactUsername: msg.contactUsername,
        contactPhone: msg.contactPhone,
        manager: channel.owner,
        lead: lead._id,
      })
      isNew = true
    } catch (error) {
      // Two first messages raced: keep the conversation that won and drop our duplicate lead.
      if (!isDuplicateKey(error)) throw error
      await LeadModel.deleteOne({ _id: lead._id })
      conversation = await ConversationModel.findOne({ channel: channel._id, externalChatId: msg.externalChatId })
      if (!conversation) throw error
    }
  } else {
    let changed = false
    if (msg.contactPhone && !conversation.contactPhone) {
      conversation.contactPhone = msg.contactPhone
      changed = true
      if (conversation.lead) await LeadModel.updateOne({ _id: conversation.lead, phone: { $in: [null, ''] } }, { phone: msg.contactPhone })
    }
    if (msg.accessHash && conversation.accessHash !== msg.accessHash) {
      conversation.accessHash = msg.accessHash
      changed = true
    }
    if (changed) await conversation.save()
  }

  if (msg.externalId && (await ChatMessageModel.exists({ conversation: conversation._id, externalId: msg.externalId }))) {
    return { conversation, isNew: false, duplicate: true }
  }

  await ChatMessageModel.create({
    conversation: conversation._id,
    direction: msg.direction,
    text: msg.text,
    externalId: msg.externalId,
    status: msg.direction === 'in' ? 'received' : 'sent',
  })
  await ConversationModel.updateOne(
    { _id: conversation._id },
    {
      lastMessageAt: new Date(),
      lastMessageText: msg.text.slice(0, 200),
      ...(msg.direction === 'in' ? { $inc: { unread: 1 } } : {}),
    },
  )

  if (isNew && msg.direction === 'in' && channel.greeting) {
    await sendToConversation(conversation._id as Types.ObjectId, channel.greeting, null).catch((e) => console.error('[inbox] greeting failed', e))
  }
  return { conversation, isNew, duplicate: false }
}

/** Sends a reply through the conversation's channel and records it (also on failure, with the error). */
export async function sendToConversation(conversationId: Types.ObjectId, text: string, user: Types.ObjectId | null) {
  const conversation = await ConversationModel.findById(conversationId)
  if (!conversation) notFound('Suhbat topilmadi')
  const channel = await ChannelModel.findById(conversation.channel).select('+instagram.accessToken')
  if (!channel || !channel.active) conflict("Profil uzilgan yoki topilmadi")

  let externalId: string | undefined
  let error: string | undefined
  try {
    externalId =
      channel.type === 'telegram'
        ? await sendTelegramProfileMessage(channel._id, conversation.externalChatId, conversation.accessHash, text)
        : await sendInstagramMessage(decryptSecret(channel.instagram!.accessToken), channel.instagram!.igUserId!, conversation.externalChatId, text)
  } catch (e) {
    error = errorText(e)
  }

  const message = await ChatMessageModel.create({
    conversation: conversation._id,
    direction: 'out',
    text,
    externalId,
    user,
    status: error ? 'failed' : 'sent',
    error,
  })
  await ConversationModel.updateOne({ _id: conversation._id }, { lastMessageAt: new Date(), lastMessageText: text.slice(0, 200), unread: 0 })
  if (conversation.lead && !error) {
    await LeadModel.updateOne({ _id: conversation.lead, status: 'new' }, { status: 'contacted' })
  }
  return { message, error }
}

export async function publicBaseUrl(): Promise<string> {
  const doc = await SettingModel.findById('general').lean()
  const fromDb = (doc?.value as { publicBaseUrl?: string } | undefined)?.publicBaseUrl
  return (fromDb || useRuntimeConfig().publicBaseUrl || '').replace(/\/+$/, '')
}
