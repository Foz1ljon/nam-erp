import type { Types } from 'mongoose'

/** Disconnects a profile: ends the Telegram session / forgets the Instagram token. Chat history is kept. */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  const channel = await loadOwnChannel(me, paramId(event))
  if (channel.type === 'telegram') await stopTelegramProfile(channel._id as Types.ObjectId, true)
  await ChannelModel.updateOne(
    { _id: channel._id },
    { active: false, status: 'disabled', lastError: null, $unset: { 'telegram.session': 1, 'instagram.accessToken': 1 } },
  )
  return ok({ _id: channel._id })
})
