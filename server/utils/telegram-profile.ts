import { randomUUID } from 'node:crypto'
import bigInt from 'big-integer'
import type { Types } from 'mongoose'
import { Api, TelegramClient } from 'telegram'
import { NewMessage, type NewMessageEvent } from 'telegram/events'
import { computeCheck } from 'telegram/Password'
import { StringSession } from 'telegram/sessions'

// Personal Telegram accounts connected over MTProto — the same protocol the official apps use.
// The ERP appears in Telegram → Settings → Devices as "NamMotors ERP" and can be terminated there.

const DEVICE = { deviceModel: 'NamMotors ERP', systemVersion: 'Server', appVersion: '1.0', langCode: 'uz', systemLangCode: 'uz' }
const TELEGRAM_SERVICE_USER = '777000'
const LOGIN_TTL_MS = 10 * 60_000

interface ApiCredentials {
  apiId: number
  apiHash: string
}

async function credentials(): Promise<ApiCredentials> {
  const { telegramApiId, telegramApiHash } = await getIntegrations()
  if (!telegramApiId || !telegramApiHash) {
    conflict("Telegram API sozlanmagan: administrator «Kanallar» sahifasida api_id va api_hash kiritishi kerak")
  }
  return { apiId: telegramApiId, apiHash: telegramApiHash }
}

function createClient(session: string, creds: ApiCredentials) {
  const client = new TelegramClient(new StringSession(session), creds.apiId, creds.apiHash, { connectionRetries: 5, ...DEVICE })
  client.setLogLevel('error' as never)
  return client
}

/** Translates Telegram RPC errors into messages a manager understands. */
function friendlyError(error: unknown): string {
  const code = (error as { errorMessage?: string })?.errorMessage ?? ''
  const seconds = (error as { seconds?: number })?.seconds
  if (code === 'PHONE_NUMBER_INVALID') return "Telefon raqami noto'g'ri (masalan: +998901234567)"
  if (code === 'PHONE_NUMBER_BANNED') return 'Bu raqam Telegram tomonidan bloklangan'
  if (code === 'PHONE_CODE_INVALID') return "Kod noto'g'ri"
  if (code === 'PHONE_CODE_EXPIRED') return "Kodning muddati o'tgan, qaytadan kod so'rang"
  if (code === 'PASSWORD_HASH_INVALID') return "Ikki bosqichli parol noto'g'ri"
  if (code === 'API_ID_INVALID') return "Telegram api_id / api_hash noto'g'ri (administrator tekshirsin)"
  if (code.startsWith('FLOOD_WAIT') || seconds) return `Juda ko'p urinish. ${seconds ?? ''} soniyadan keyin qayta urinib ko'ring`
  return errorText(error)
}

// ---------------------------------------------------------------- login (phone → code → optional 2FA)

interface PendingLogin {
  client: TelegramClient
  owner: string
  phone: string
  phoneCodeHash: string
  needPassword: boolean
  timer: ReturnType<typeof setTimeout>
}

const g = globalThis as { __nmTgPending?: Map<string, PendingLogin>; __nmTgClients?: Map<string, TelegramClient> }
const pending = (g.__nmTgPending ??= new Map())
const clients = (g.__nmTgClients ??= new Map())

function dropPending(id: string) {
  const p = pending.get(id)
  if (!p) return
  clearTimeout(p.timer)
  pending.delete(id)
  p.client.disconnect().catch(() => undefined)
}

export async function telegramSendCode(owner: Types.ObjectId, phone: string) {
  const creds = await credentials()
  const client = createClient('', creds)
  try {
    await client.connect()
    const { phoneCodeHash, isCodeViaApp } = await client.sendCode(creds, phone)
    const loginId = randomUUID()
    pending.set(loginId, {
      client,
      owner: String(owner),
      phone,
      phoneCodeHash,
      needPassword: false,
      timer: setTimeout(() => dropPending(loginId), LOGIN_TTL_MS),
    })
    return { loginId, viaApp: isCodeViaApp }
  } catch (error) {
    await client.disconnect().catch(() => undefined)
    conflict(friendlyError(error))
  }
}

export async function telegramVerify(owner: Types.ObjectId, input: { loginId: string; code?: string; password?: string }) {
  const login = pending.get(input.loginId)
  if (!login || login.owner !== String(owner)) conflict("Kirish seansi topilmadi yoki muddati o'tgan. Qaytadan kod so'rang")

  try {
    if (!login.needPassword) {
      if (!input.code) conflict('Telegramdan kelgan kodni kiriting')
      try {
        await login.client.invoke(new Api.auth.SignIn({ phoneNumber: login.phone, phoneCodeHash: login.phoneCodeHash, phoneCode: input.code }))
      } catch (error) {
        if ((error as { errorMessage?: string }).errorMessage !== 'SESSION_PASSWORD_NEEDED') throw error
        login.needPassword = true
      }
    }
    if (login.needPassword) {
      if (!input.password) {
        const info = await login.client.invoke(new Api.account.GetPassword())
        return { status: 'password_required' as const, hint: info.hint ?? '' }
      }
      const info = await login.client.invoke(new Api.account.GetPassword())
      await login.client.invoke(new Api.auth.CheckPassword({ password: await computeCheck(info, input.password) }))
    }
  } catch (error) {
    const code = (error as { errorMessage?: string }).errorMessage
    // A wrong code or password can be retried within the same login; anything else ends it.
    if (code !== 'PHONE_CODE_INVALID' && code !== 'PASSWORD_HASH_INVALID') dropPending(input.loginId)
    if ((error as { statusCode?: number }).statusCode) throw error
    conflict(friendlyError(error))
  }

  const me = (await login.client.getMe()) as Api.User
  const session = (login.client.session as StringSession).save()
  clearTimeout(login.timer)
  pending.delete(input.loginId)

  const displayName = [me.firstName, me.lastName].filter(Boolean).join(' ')
  const channel = await ChannelModel.findOneAndUpdate(
    { type: 'telegram', owner, 'telegram.userId': String(me.id) },
    {
      $set: {
        name: me.username ? `@${me.username}` : displayName || login.phone,
        active: true,
        status: 'connected',
        lastError: null,
        'telegram.userId': String(me.id),
        'telegram.username': me.username ?? null,
        'telegram.phone': me.phone ? `+${me.phone}` : login.phone,
        'telegram.displayName': displayName,
        'telegram.session': encryptSecret(session),
      },
      $setOnInsert: { type: 'telegram', owner },
    },
    { upsert: true, returnDocument: 'after' },
  )
  await attachClient(channel!._id as Types.ObjectId, login.client)
  return { status: 'connected' as const, channelId: channel!._id }
}

// ---------------------------------------------------------------- live connections

interface ProfileRef {
  _id: Types.ObjectId
  type: 'telegram'
  owner: Types.ObjectId
  greeting?: string | null
  capture: string
}

async function loadRef(channelId: Types.ObjectId): Promise<ProfileRef | null> {
  const ch = await ChannelModel.findById(channelId).select('type owner greeting capture active').lean()
  return ch && ch.active ? { _id: ch._id, type: 'telegram', owner: ch.owner, greeting: ch.greeting, capture: ch.capture ?? 'new_contacts' } : null
}

function describe(message: Api.Message): string {
  if (message.message) return message.message
  const media = message.media
  if (media instanceof Api.MessageMediaPhoto) return '[rasm]'
  if (media instanceof Api.MessageMediaContact) return `[kontakt: ${media.phoneNumber}]`
  if (media instanceof Api.MessageMediaGeo || media instanceof Api.MessageMediaGeoLive) return '[joylashuv]'
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document instanceof Api.Document ? media.document : null
    const attrs = doc?.attributes ?? []
    if (attrs.some((a) => a instanceof Api.DocumentAttributeAudio && a.voice)) return '[ovozli xabar]'
    if (attrs.some((a) => a instanceof Api.DocumentAttributeVideo)) return '[video]'
    if (attrs.some((a) => a instanceof Api.DocumentAttributeSticker)) return '[stiker]'
    const file = attrs.find((a): a is Api.DocumentAttributeFilename => a instanceof Api.DocumentAttributeFilename)
    return `[fayl${file ? `: ${file.fileName}` : ''}]`
  }
  return '[xabar]'
}

async function onMessage(channelId: Types.ObjectId, event: NewMessageEvent) {
  const message = event.message
  if (!message.isPrivate) return
  const chat = (await message.getChat()) as Api.User | undefined
  if (!chat || chat.bot || chat.self || String(chat.id) === TELEGRAM_SERVICE_USER) return

  const ref = await loadRef(channelId)
  if (!ref) return
  const externalChatId = String(chat.id)
  const known = await ConversationModel.exists({ channel: channelId, externalChatId })
  // Chats with people saved in the phone's contacts stay private unless the profile captures "all".
  if (!known && ref.capture !== 'all' && chat.contact) return
  // Outgoing replies typed on the phone also arrive here; skip ones the CRM itself just sent.
  if (message.out && !known) return
  if (message.out) {
    await new Promise((r) => setTimeout(r, 1500))
    if (await ChatMessageModel.exists({ externalId: String(message.id), conversation: known!._id })) return
  }

  await ingestMessage(ref, {
    externalChatId,
    accessHash: chat.accessHash ? chat.accessHash.toString() : null,
    contactName: [chat.firstName, chat.lastName].filter(Boolean).join(' ') || undefined,
    contactUsername: chat.username ?? undefined,
    contactPhone: chat.phone ? `+${chat.phone}` : undefined,
    text: describe(message),
    externalId: String(message.id),
    direction: message.out ? 'out' : 'in',
  })
}

async function attachClient(channelId: Types.ObjectId, client: TelegramClient) {
  const key = String(channelId)
  const previous = clients.get(key)
  if (previous && previous !== client) await previous.disconnect().catch(() => undefined)
  clients.set(key, client)
  client.addEventHandler((event: NewMessageEvent) => {
    onMessage(channelId, event).catch((error) => console.error('[telegram] message handling failed', error))
  }, new NewMessage({}))
  // Warm the entity cache so replies to recent chats work right away.
  await client.getDialogs({ limit: 50 }).catch(() => undefined)
}

/** (Re)connects a stored profile; marks it as needing re-login if Telegram revoked the session. */
export async function startTelegramProfile(channelId: Types.ObjectId) {
  const channel = await ChannelModel.findById(channelId).select('+telegram.session')
  if (!channel || channel.type !== 'telegram' || !channel.active || !channel.telegram?.session) return
  const creds = await credentials()
  const client = createClient(decryptSecret(channel.telegram.session), creds)
  try {
    await client.connect()
    if (!(await client.checkAuthorization())) throw new Error('Sessiya tugagan — profilni qaytadan ulang')
    await attachClient(channel._id as Types.ObjectId, client)
    await ChannelModel.updateOne({ _id: channel._id }, { status: 'connected', lastError: null })
  } catch (error) {
    await client.disconnect().catch(() => undefined)
    await ChannelModel.updateOne({ _id: channel._id }, { status: 'error', lastError: friendlyError(error) })
  }
}

export async function stopTelegramProfile(channelId: Types.ObjectId, logOut = false) {
  const key = String(channelId)
  let client = clients.get(key)
  if (!client && logOut) {
    const channel = await ChannelModel.findById(channelId).select('+telegram.session').lean()
    if (channel?.telegram?.session) {
      client = createClient(decryptSecret(channel.telegram.session), await credentials())
      await client.connect().catch(() => undefined)
    }
  }
  if (!client) return
  if (logOut) await client.invoke(new Api.auth.LogOut()).catch(() => undefined)
  await client.disconnect().catch(() => undefined)
  clients.delete(key)
}

export async function stopAllTelegramProfiles() {
  await Promise.all([...clients.values()].map((c) => c.disconnect().catch(() => undefined)))
  clients.clear()
}

export async function sendTelegramProfileMessage(channelId: Types.ObjectId, userId: string, accessHash: string | null | undefined, text: string) {
  let client = clients.get(String(channelId))
  if (!client) {
    await startTelegramProfile(channelId)
    client = clients.get(String(channelId))
  }
  if (!client) throw new Error('Telegram profili ulanmagan')
  const peer = accessHash
    ? new Api.InputPeerUser({ userId: bigInt(userId), accessHash: bigInt(accessHash) })
    : await client.getInputEntity(userId)
  const sent = await client.sendMessage(peer, { message: text })
  return String(sent.id)
}
