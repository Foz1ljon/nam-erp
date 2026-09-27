import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Types } from 'mongoose'

// Instagram API with Instagram Login: a manager signs in with their Instagram professional
// (Business/Creator) account and the ERP receives and answers its Direct messages.
const IG_GRAPH = 'https://graph.instagram.com'
const IG_API = `${IG_GRAPH}/v23.0`
const SCOPES = ['instagram_business_basic', 'instagram_business_manage_messages']

export async function instagramRedirectUri() {
  const base = await publicBaseUrl()
  if (!base.startsWith('https://')) conflict("Instagram uchun tizimning ommaviy https manzili kerak (administrator «Kanallar» sahifasida kiritadi)")
  return `${base}/api/channels/instagram/callback`
}

export async function instagramAuthorizeUrl(user: Types.ObjectId) {
  const { instagramAppId, instagramAppSecret } = await getIntegrations()
  if (!instagramAppId || !instagramAppSecret) conflict("Instagram ilovasi sozlanmagan: administrator App ID va App Secret kiritishi kerak")
  const state = randomBytes(24).toString('hex')
  await OAuthStateModel.create({ _id: state, user, expiresAt: new Date(Date.now() + 15 * 60_000) })
  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', instagramAppId)
  url.searchParams.set('redirect_uri', await instagramRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(','))
  url.searchParams.set('state', state)
  url.searchParams.set('enable_fb_login', '0')
  url.searchParams.set('force_authentication', '1')
  return url.toString()
}

/** Exchanges the OAuth code for a long-lived token and stores the profile for this manager. */
export async function completeInstagramLogin(user: Types.ObjectId, code: string, state: string) {
  const saved = await OAuthStateModel.findOneAndDelete({ _id: state, user })
  if (!saved || saved.expiresAt < new Date()) conflict("Kirish seansi muddati o'tgan, qaytadan urinib ko'ring")
  const { instagramAppId, instagramAppSecret } = await getIntegrations()

  const short = await $fetch<{ access_token: string; user_id: string | number }>('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: instagramAppId,
      client_secret: instagramAppSecret,
      grant_type: 'authorization_code',
      redirect_uri: await instagramRedirectUri(),
      code: code.replace(/#_$/, ''),
    }),
    timeout: 15_000,
  })
  const long = await $fetch<{ access_token: string; expires_in: number }>(`${IG_GRAPH}/access_token`, {
    query: { grant_type: 'ig_exchange_token', client_secret: instagramAppSecret, access_token: short.access_token },
    timeout: 15_000,
  })
  const me = await $fetch<{ user_id: string; username: string; name?: string }>(`${IG_API}/me`, {
    query: { fields: 'user_id,username,name', access_token: long.access_token },
    timeout: 15_000,
  })
  // Ask Meta to deliver this account's Direct messages to our app webhook.
  await $fetch(`${IG_API}/me/subscribed_apps`, {
    method: 'POST',
    query: { subscribed_fields: 'messages', access_token: long.access_token },
    timeout: 15_000,
  })

  const other = await ChannelModel.findOne({ type: 'instagram', 'instagram.igUserId': String(me.user_id), owner: { $ne: user }, active: true })
    .populate('owner', 'fullName')
    .lean()
  if (other) conflict(`@${me.username} allaqachon ${(other.owner as unknown as { fullName: string }).fullName} tomonidan ulangan`)

  return ChannelModel.findOneAndUpdate(
    { type: 'instagram', owner: user, 'instagram.igUserId': String(me.user_id) },
    {
      $set: {
        name: `@${me.username}`,
        active: true,
        status: 'connected',
        lastError: null,
        'instagram.igUserId': String(me.user_id),
        'instagram.username': me.username,
        'instagram.displayName': me.name ?? '',
        'instagram.accessToken': encryptSecret(long.access_token),
        'instagram.tokenExpiresAt': new Date(Date.now() + long.expires_in * 1000),
      },
      $setOnInsert: { type: 'instagram', owner: user },
    },
    { upsert: true, returnDocument: 'after' },
  )
}

/** Long-lived tokens last 60 days; refresh the ones expiring within two weeks. */
export async function refreshInstagramTokens() {
  const soon = new Date(Date.now() + 14 * 24 * 3600_000)
  const channels = await ChannelModel.find({ type: 'instagram', active: true, 'instagram.tokenExpiresAt': { $lt: soon } }).select('+instagram.accessToken')
  for (const channel of channels) {
    try {
      const res = await $fetch<{ access_token: string; expires_in: number }>(`${IG_GRAPH}/refresh_access_token`, {
        query: { grant_type: 'ig_refresh_token', access_token: decryptSecret(channel.instagram!.accessToken) },
        timeout: 15_000,
      })
      await ChannelModel.updateOne(
        { _id: channel._id },
        { 'instagram.accessToken': encryptSecret(res.access_token), 'instagram.tokenExpiresAt': new Date(Date.now() + res.expires_in * 1000), status: 'connected', lastError: null },
      )
    } catch (error) {
      await ChannelModel.updateOne({ _id: channel._id }, { status: 'error', lastError: `Tokenni yangilab bo'lmadi, profilni qaytadan ulang: ${errorText(error)}` })
    }
  }
}

/** Meta signs webhook payloads with the app secret (X-Hub-Signature-256: sha256=<hex>). */
export function verifyInstagramSignature(rawBody: string, header: string | undefined, appSecret: string) {
  if (!header?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const given = header.slice(7)
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

interface IgMessagingEvent {
  sender: { id: string }
  recipient: { id: string }
  message?: { mid: string; text?: string; is_echo?: boolean; is_deleted?: boolean; attachments?: { type: string }[] }
}

export interface IgWebhookBody {
  object?: string
  entry?: { id: string; messaging?: IgMessagingEvent[] }[]
}

async function fetchProfile(token: string, igsid: string) {
  try {
    return await $fetch<{ name?: string; username?: string }>(`${IG_API}/${igsid}`, {
      query: { fields: 'name,username', access_token: token },
      timeout: 10_000,
    })
  } catch {
    return {}
  }
}

/** Routes each webhook entry to the connected profile it belongs to (entry.id = the professional account id). */
export async function handleInstagramWebhook(body: IgWebhookBody) {
  for (const entry of body.entry ?? []) {
    const channel = await ChannelModel.findOne({ type: 'instagram', active: true, 'instagram.igUserId': String(entry.id) }).select('+instagram.accessToken')
    if (!channel) continue
    const token = decryptSecret(channel.instagram!.accessToken)
    const ref = { _id: channel._id as Types.ObjectId, type: 'instagram' as const, owner: channel.owner, greeting: channel.greeting }
    for (const event of entry.messaging ?? []) {
      if (!event.message || event.message.is_deleted) continue
      const echo = !!event.message.is_echo
      const contactId = echo ? event.recipient.id : event.sender.id
      const known = await ConversationModel.exists({ channel: channel._id, externalChatId: contactId })
      if (echo && !known) continue
      const text = event.message.text ?? (event.message.attachments?.length ? `[${event.message.attachments[0]!.type}]` : '[xabar]')
      const profile = known ? {} : await fetchProfile(token, contactId)
      await ingestMessage(ref, {
        externalChatId: contactId,
        contactName: profile.name,
        contactUsername: profile.username,
        text,
        externalId: event.message.mid,
        direction: echo ? 'out' : 'in',
      })
    }
  }
}

export async function sendInstagramMessage(token: string, igUserId: string, recipientId: string, text: string) {
  const res = await $fetch<{ message_id: string }>(`${IG_API}/${igUserId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { recipient: { id: recipientId }, message: { text } },
    timeout: 15_000,
  })
  return res.message_id
}
