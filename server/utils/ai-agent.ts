import Anthropic from '@anthropic-ai/sdk'
import type { Types } from 'mongoose'
import { AI_PROVIDER_INFO, ROLE_LABELS, type AiProvider, type Role } from '../../shared/utils/constants'
import { STAGE_CONFIG, STAGES } from '../../shared/utils/stages'

// ---------------------------------------------------------------- settings

interface StoredAiSettings {
  provider?: AiProvider
  model?: string
  baseUrl?: string
  keys?: Partial<Record<AiProvider, string>> // encrypted
}

export interface AiSettings {
  provider: AiProvider
  model: string
  baseUrl: string
  apiKey: string
}

async function storedAi(): Promise<StoredAiSettings> {
  const doc = await SettingModel.findById('ai').lean()
  return (doc?.value as StoredAiSettings | undefined) ?? {}
}

/** Decrypted settings of the active provider. Server-side only. */
export async function getAiSettings(): Promise<AiSettings> {
  const s = await storedAi()
  const provider = s.provider ?? 'gemini'
  const info = AI_PROVIDER_INFO[provider]
  return {
    provider,
    model: s.model || info.models[0] || '',
    baseUrl: (s.baseUrl || info.baseUrl).replace(/\/+$/, ''),
    apiKey: decryptSecret(s.keys?.[provider]),
  }
}

/** Stored (decrypted) key of any provider, independent of which one is active for chat. */
export async function getProviderKey(provider: AiProvider): Promise<string> {
  const s = await storedAi()
  return decryptSecret(s.keys?.[provider])
}

/** Safe view for the UI: which providers have a key, never the key itself. */
export async function getAiSettingsPublic() {
  const s = await storedAi()
  const active = await getAiSettings()
  const keys: Partial<Record<AiProvider, string>> = {}
  for (const [provider, value] of Object.entries(s.keys ?? {})) {
    if (value) keys[provider as AiProvider] = maskSecret(decryptSecret(value))
  }
  const info = AI_PROVIDER_INFO[active.provider]
  return {
    provider: active.provider,
    model: active.model,
    baseUrl: active.baseUrl,
    keys,
    configured: !!active.model && !!active.baseUrl && (!info.needsKey || !!active.apiKey),
  }
}

export async function saveAiSettings(input: { provider: AiProvider; model: string; baseUrl?: string; apiKey?: string }) {
  const set: Record<string, unknown> = {
    'value.provider': input.provider,
    'value.model': input.model,
    'value.baseUrl': input.baseUrl ?? '',
  }
  if (input.apiKey) set[`value.keys.${input.provider}`] = encryptSecret(input.apiKey)
  await SettingModel.updateOne({ _id: 'ai' }, { $set: set }, { upsert: true })
}

// ---------------------------------------------------------------- prompt

function systemPrompt(user: { fullName: string; role: Role }) {
  const now = new Date()
  const today = new Date(now.getTime() + 5 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')
  const stages = STAGES.map((s) => `- ${s}: ${STAGE_CONFIG[s].department} — ${STAGE_CONFIG[s].label}. ${STAGE_CONFIG[s].description}`).join('\n')
  return `You are the analytics assistant inside NamMotors ERP, used by the management of NamMotors — a factory in Uzbekistan that makes electric motors and water pumps.

Current time in Tashkent: ${today}. You are talking to ${user.fullName} (${ROLE_LABELS[user.role]}).

How the factory works:
- Raw materials (cast iron, metals) arrive at the raw-material warehouse (XOMASHYO) and are handed to the foundry.
- Production stages, in order:
${stages}
- Semi-finished parts, winding wire, electrical steel and purchased parts (impellers, bearings, rotors) are kept in the store (SKLAD).
- Departments hand goods to each other with transfers that the receiving side must accept ("topshirish/qabul").
- Quality control (SIFAT) inspects after fettling, after assembly and gives motors a full test after packaging; rejects go back to the foundry as scrap or to the defect area (BRAK).
- Castings, semi-finished parts and finished products can all be sold. Sales managers work leads (CRM), B2B clients, sales orders and payments, and chat with clients on Telegram/Instagram.

Rules:
- Always answer in Uzbek (Latin script), clearly and concisely, the way a capable deputy would brief a factory director.
- Every number, name and fact must come from a tool result in this conversation. Never guess or invent data. If a tool returns nothing, say so plainly.
- Tool results already contain totals (fields named total_*). Quote those totals exactly instead of adding numbers yourself.
- Never show tool names, JSON field names or technical identifiers (like total_operations, get_stock) to the user — describe things in plain Uzbek.
- The question may come from speech recognition and contain small recognition mistakes; interpret it sensibly using the factory context.
- Call tools as many times as needed (for example, list_employees first, then employee_activity for each person). Prefer specific tools over get_overview when the question is specific.
- Dates: convert relative periods ("bugun", "kecha", "shu hafta", "o'tgan oy") to YYYY-MM-DD using the current Tashkent date above, and state the period in the answer.
- Money is in so'm; format large numbers with spaces (1 250 000 so'm). Quantities keep their units (kg, dona).
- Use short Markdown: headings, bullet lists and tables where they help. Highlight problems (high reject rate, overdue debts, unanswered clients, low stock) and suggest concrete next steps.
- When the user asks for Excel, a spreadsheet, a file or a document ("excel", "jadval", "hujjat", "fayl"): first collect the data with the other tools, then call create_excel with complete columns and rows (numbers as plain digits, no thousands separators), then reply with a one-line summary and the Markdown link exactly as returned, e.g. [Faylni yuklab olish](download_url).
- You can only read data and create files. If asked to change data (create orders, edit stock, message clients), explain that this must be done in the relevant ERP page.`
}

// ---------------------------------------------------------------- providers

export interface AssistantTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantResult {
  content: string
  tools: string[]
}

const MAX_TOOL_ROUNDS = 10

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
  name?: string
}

interface OpenAiResponse {
  choices: { message: OpenAiMessage; finish_reason: string }[]
  error?: { message?: string }
}

function providerError(error: unknown, provider: string): Error {
  const e = error as { data?: { error?: { message?: string } | string; message?: string }; statusCode?: number; message?: string }
  const detail = typeof e.data?.error === 'string' ? e.data.error : e.data?.error?.message || e.data?.message || e.message
  const status = e.statusCode ? ` (${e.statusCode})` : ''
  if (e.statusCode === 401 || e.statusCode === 403) return new Error(`${provider}: API kalit noto'g'ri yoki ruxsat yo'q${status}`)
  if (e.statusCode === 404) return new Error(`${provider}: model topilmadi${status}. Sozlamalarda «Modellarni yuklash» tugmasi bilan mavjud modelni tanlang`)
  if (e.statusCode === 429) return new Error(`${provider}: limitga yetildi${status}. Birozdan so'ng qayta urinib ko'ring yoki boshqa model tanlang`)
  return new Error(`${provider}${status}: ${detail ?? "noma'lum xato"}`)
}

/** Models available to the configured key: OpenAI-compatible `GET /models`, or the Anthropic Models API. */
export async function listProviderModels(settings: AiSettings): Promise<string[]> {
  const label = AI_PROVIDER_INFO[settings.provider].label
  if (settings.provider === 'anthropic') {
    if (!settings.apiKey) throw new Error('Claude uchun API kalit kiritilmagan')
    const client = new Anthropic({ apiKey: settings.apiKey })
    const ids: string[] = []
    for await (const model of client.models.list()) ids.push(model.id)
    return ids
  }
  try {
    const res = await $fetch<{ data?: { id: string }[] }>(`${settings.baseUrl}/models`, {
      headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {},
      timeout: 20_000,
    })
    // Gemini returns ids like "models/gemini-2.5-flash"; the chat endpoint expects the bare name.
    const ids = (res.data ?? []).map((m) => m.id.replace(/^models\//, ''))
    const chatLike = ids.filter((id) => !/embed|embedding|aqa|imagen|veo|tts|whisper|guard|moderation|audio|image-generation/i.test(id))
    return [...new Set(chatLike)].sort()
  } catch (error) {
    throw providerError(error, label)
  }
}

/** Gemini, Groq, OpenRouter, Ollama and any OpenAI-compatible server. */
async function runOpenAiCompatible(settings: AiSettings, system: string, history: AssistantTurn[], ctx: ToolContext): Promise<AssistantResult> {
  const label = AI_PROVIDER_INFO[settings.provider].label
  const tools = AI_TOOLS.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } }))
  const messages: OpenAiMessage[] = [{ role: 'system', content: system }, ...history.map((h) => ({ role: h.role, content: h.content }))]
  const used: string[] = []
  const headers: Record<string, string> = {}
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://nammotors.uz'
    headers['X-Title'] = 'NamMotors ERP'
  }

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const finalRound = round === MAX_TOOL_ROUNDS
    let res: OpenAiResponse
    try {
      res = await $fetch<OpenAiResponse>(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: {
          model: settings.model,
          messages,
          temperature: 0.2,
          ...(finalRound ? {} : { tools, tool_choice: 'auto' }),
        },
        timeout: 180_000,
      })
    } catch (error) {
      throw providerError(error, label)
    }
    const message = res.choices?.[0]?.message
    if (!message) throw new Error(`${label}: bo'sh javob${res.error?.message ? ` — ${res.error.message}` : ''}`)

    const calls = message.tool_calls ?? []
    if (!calls.length || finalRound) return { content: message.content?.trim() || '', tools: used }

    messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: calls })
    const results = await Promise.all(
      calls.map(async (call) => {
        let args: Record<string, unknown> = {}
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
        } catch {
          return { id: call.id, name: call.function.name, content: JSON.stringify({ error: "Argumentlar JSON emas, qaytadan urinib ko'ring" }) }
        }
        used.push(call.function.name)
        return { id: call.id, name: call.function.name, content: await runAiTool(call.function.name, args, ctx) }
      }),
    )
    for (const r of results) messages.push({ role: 'tool', tool_call_id: r.id, name: r.name, content: r.content })
  }
  return { content: '', tools: used }
}

/** Claude via the official Anthropic SDK, with a manual tool loop over the same tools. */
async function runClaude(settings: AiSettings, system: string, history: AssistantTurn[], ctx: ToolContext): Promise<AssistantResult> {
  const client = new Anthropic({ apiKey: settings.apiKey })
  const tools: Anthropic.Beta.BetaTool[] = AI_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Beta.BetaTool['input_schema'],
  }))
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((h) => ({ role: h.role, content: h.content }))
  const used: string[] = []
  // Adaptive thinking on current models; Haiku 4.5 does not support it. Opus 5 / Fable 5.1 get
  // server-side refusal fallbacks so a declined request is retried on another model automatically.
  const isHaiku = settings.model.startsWith('claude-haiku')
  const useFallbacks = settings.model === 'claude-opus-5' || settings.model === 'claude-fable-5-1'

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    let response: Anthropic.Beta.BetaMessage
    try {
      response = await client.beta.messages.create({
        model: settings.model,
        max_tokens: 16000,
        system,
        tools,
        messages,
        ...(isHaiku ? {} : { thinking: { type: 'adaptive' as const } }),
        ...(useFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      })
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) throw new Error("Claude: API kalit noto'g'ri")
      if (error instanceof Anthropic.RateLimitError) throw new Error("Claude: limitga yetildi, birozdan so'ng qayta urinib ko'ring")
      if (error instanceof Anthropic.APIError) throw new Error(`Claude (${error.status}): ${error.message}`)
      throw error
    }

    if (response.stop_reason === 'refusal') {
      return { content: "Kechirasiz, bu so'rovga javob bera olmayman. Savolni boshqacha shakllantirib ko'ring.", tools: used }
    }

    messages.push({ role: 'assistant', content: response.content })
    if (response.stop_reason === 'pause_turn') continue

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (!toolUses.length || round === MAX_TOOL_ROUNDS) {
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      return { content: text, tools: used }
    }

    // All tool results go back in a single user message.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (block) => {
        used.push(block.name)
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await runAiTool(block.name, (block.input ?? {}) as Record<string, unknown>, ctx),
        }
      }),
    )
    messages.push({ role: 'user', content: results })
  }
  return { content: '', tools: used }
}

export async function runAssistant(input: {
  user: { oid: Types.ObjectId; fullName: string; role: Role }
  chat: Types.ObjectId
  history: AssistantTurn[]
  settings?: AiSettings
}) {
  const settings = input.settings ?? (await getAiSettings())
  const info = AI_PROVIDER_INFO[settings.provider]
  if (!settings.model || !settings.baseUrl) throw new Error("AI sozlanmagan: provayder va modelni tanlang")
  if (info.needsKey && !settings.apiKey) throw new Error(`${info.label} uchun API kalit kiritilmagan`)

  const ctx: ToolContext = { user: input.user.oid, chat: input.chat, files: [] }
  const system = systemPrompt(input.user)
  const result =
    settings.provider === 'anthropic'
      ? await runClaude(settings, system, input.history, ctx)
      : await runOpenAiCompatible(settings, system, input.history, ctx)
  return { ...result, files: ctx.files, provider: settings.provider, model: settings.model }
}
