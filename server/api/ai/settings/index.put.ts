import { z } from 'zod'
import { AI_PROVIDERS } from '../../../../shared/utils/constants'

const schema = z.object({
  provider: z.enum(AI_PROVIDERS),
  model: z.string().trim().min(1, 'Modelni kiriting').max(120),
  baseUrl: z.string().trim().url("Manzil noto'g'ri").optional().or(z.literal('')),
  apiKey: z.string().trim().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ai.settings')
  const body = await parseBody(event, schema)
  await saveAiSettings({ ...body, baseUrl: body.baseUrl || undefined })
  return ok(await getAiSettingsPublic())
})
