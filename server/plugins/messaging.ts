import mongoose from 'mongoose'
import type { Types } from 'mongoose'

/** Reconnects saved Telegram profiles on startup and keeps Instagram tokens fresh. */
export default defineNitroPlugin((nitroApp) => {
  let stopped = false
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  nitroApp.hooks.hook('close', async () => {
    stopped = true
    if (refreshTimer) clearInterval(refreshTimer)
    await stopAllTelegramProfiles()
  })

  ;(async () => {
    while (!stopped && mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 1000))
    if (stopped) return
    try {
      const { telegramApiId, telegramApiHash } = await getIntegrations()
      if (telegramApiId && telegramApiHash) {
        const profiles = await ChannelModel.find({ type: 'telegram', active: true }).select('_id').lean()
        for (const p of profiles) await startTelegramProfile(p._id as Types.ObjectId)
        if (profiles.length) console.info(`[telegram] ${profiles.length} profile(s) connected`)
      }
      await refreshInstagramTokens()
    } catch (error) {
      console.error('[messaging] startup failed', error)
    }
    refreshTimer = setInterval(() => refreshInstagramTokens().catch((e) => console.error('[instagram] refresh', e)), 12 * 3600_000)
  })()
})
