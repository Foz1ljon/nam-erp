/**
 * Lists models the configured provider actually offers for the stored key (model names change over time,
 * so the UI should not rely only on the built-in suggestions).
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ai.settings')
  const settings = await getAiSettings()
  try {
    return ok(await listProviderModels(settings))
  } catch (error) {
    conflict(errorText(error))
  }
})
