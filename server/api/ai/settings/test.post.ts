/** Sends a tiny prompt to the configured provider to prove the key/model work (no tools touched). */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'ai.settings')
  const settings = await getAiSettings()
  const started = Date.now()
  try {
    const res = await runAssistant({
      user: { oid: me.oid, fullName: me.fullName, role: me.role },
      chat: me.oid,
      history: [{ role: 'user', content: "Ulanishni tekshirish: vositalarni chaqirmasdan, bitta qisqa jumlada o'zbek tilida salom bering." }],
      settings,
    })
    return ok({ ok: true, reply: res.content.slice(0, 300), ms: Date.now() - started, provider: settings.provider, model: settings.model })
  } catch (error) {
    return ok({ ok: false, reply: errorText(error), ms: Date.now() - started, provider: settings.provider, model: settings.model })
  }
})
