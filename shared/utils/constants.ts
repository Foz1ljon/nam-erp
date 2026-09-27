// Domain constants shared between the Nuxt app and the Nitro server.

export const ROLES = [
  'admin',
  'director',
  'warehouse',
  'supply',
  'foundry',
  'fettling',
  'cnc',
  'assembly',
  'painter',
  'qc',
  'sales',
] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  director: 'Rahbar',
  warehouse: 'Omborchi',
  supply: "Ta'minotchi",
  foundry: 'Liteyka quyuvchi',
  fettling: 'Pishka stroy ishchisi',
  cnc: 'CHPU operatori',
  assembly: "Yig'uvchi (obmotka / yig'ish)",
  painter: "Bo'yoqchi / qadoqchi",
  qc: 'Sifat nazorati',
  sales: 'Sotuv menejeri',
}

export const ITEM_TYPES = ['raw', 'casting', 'semi', 'component', 'material', 'finished', 'scrap'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  raw: 'Xomashyo',
  casting: 'Quyma',
  semi: 'Yarim tayyor mahsulot',
  component: 'Sotib olinadigan detal',
  material: 'Material (sim, jeleza, bo\'yoq, qadoq)',
  finished: 'Tayyor mahsulot',
  scrap: 'Qirindi / brak (qayta eritish)',
}

export const UNITS = ['kg', 'dona', 'm', 'l', 'komplekt'] as const
export type Unit = (typeof UNITS)[number]

export const PRODUCT_KINDS = ['motor', 'pump'] as const
export type ProductKind = (typeof PRODUCT_KINDS)[number]

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  motor: 'Elektr dvigatel',
  pump: 'Suv nasosi',
}

export const LOCATION_TYPES = ['warehouse', 'production', 'qc', 'defect'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  warehouse: 'Ombor',
  production: 'Ishlab chiqarish sexi',
  qc: 'Sifat nazorati zonasi',
  defect: 'Brak izolyatori',
}

/** Codes of system locations created by the seed and referenced by stage defaults. */
export const LOC = {
  RAW: 'XOMASHYO',
  FOUNDRY: 'LITEYKA',
  FETTLING: 'PISHKA',
  CNC: 'CHPU',
  STORE: 'SKLAD',
  ASSEMBLY: 'YIGUV',
  PAINT: 'BOYOQ',
  QC: 'SIFAT',
  FINISHED: 'TAYYOR',
  DEFECT: 'BRAK',
} as const
export type LocationCode = (typeof LOC)[keyof typeof LOC]

export const TRANSFER_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'] as const
export type TransferStatus = (typeof TRANSFER_STATUSES)[number]
export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  pending: 'Qabul kutilmoqda',
  accepted: 'Qabul qilindi',
  rejected: 'Rad etildi',
  cancelled: 'Bekor qilindi',
}

export const QC_STATUSES = ['none', 'pending', 'done'] as const
export type QcStatus = (typeof QC_STATUSES)[number]
export const QC_STATUS_LABELS: Record<QcStatus, string> = {
  none: 'Talab qilinmaydi',
  pending: 'Tekshiruv kutilmoqda',
  done: 'Tekshirildi',
}

export const REJECT_ACTIONS = ['scrap', 'rework'] as const
export type RejectAction = (typeof REJECT_ACTIONS)[number]
export const REJECT_ACTION_LABELS: Record<RejectAction, string> = {
  scrap: 'Liteykaga qayta eritishga (qirindi)',
  rework: "Brak izolyatoriga (qayta ishlash)",
}

export const SALES_STATUSES = ['draft', 'confirmed', 'shipped', 'completed', 'cancelled'] as const
export type SalesStatus = (typeof SALES_STATUSES)[number]
export const SALES_STATUS_LABELS: Record<SalesStatus, string> = {
  draft: 'Qoralama',
  confirmed: 'Tasdiqlangan',
  shipped: 'Jo\'natilgan',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
}

export const PAYMENT_METHODS = ['cash', 'card', 'transfer'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Naqd',
  card: 'Karta',
  transfer: "Bank o'tkazmasi",
}

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Yangi',
  contacted: "Bog'lanildi",
  qualified: 'Ehtiyoj aniqlandi',
  proposal: 'Taklif yuborildi',
  won: 'Sotildi',
  lost: "Yo'qotildi",
}

export const LEAD_SOURCES = ['phone', 'website', 'telegram', 'instagram', 'referral', 'exhibition', 'other'] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  phone: "Qo'ng'iroq",
  website: 'Veb-sayt',
  telegram: 'Telegram',
  instagram: 'Instagram',
  referral: 'Tavsiya',
  exhibition: "Ko'rgazma",
  other: 'Boshqa',
}

export const ACTIVITY_TYPES = ['call', 'meeting', 'message', 'note', 'task'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Qo'ng'iroq",
  meeting: 'Uchrashuv',
  message: 'Xabar',
  note: 'Izoh',
  task: 'Vazifa',
}

export const COUNTERPARTY_TYPES = ['supplier', 'customer', 'both'] as const
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number]
export const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  supplier: "Yetkazib beruvchi",
  customer: 'Mijoz',
  both: 'Mijoz va yetkazib beruvchi',
}

export const DOC_TYPES = ['receipt', 'transfer', 'operation', 'qc', 'adjustment', 'sale'] as const
export type DocType = (typeof DOC_TYPES)[number]
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  receipt: 'Kirim',
  transfer: 'Topshirish',
  operation: 'Ishlab chiqarish',
  qc: 'Sifat nazorati',
  adjustment: 'Inventarizatsiya',
  sale: 'Sotuv',
}

export const PRODUCT_UNIT_STATUSES = ['in_stock', 'sold'] as const
export type ProductUnitStatus = (typeof PRODUCT_UNIT_STATUSES)[number]

// ---------------------------------------------------------------- B2B clients

export const CLIENT_KINDS = ['b2b', 'b2c'] as const
export type ClientKind = (typeof CLIENT_KINDS)[number]
export const CLIENT_KIND_LABELS: Record<ClientKind, string> = {
  b2b: 'Yuridik shaxs (B2B)',
  b2c: 'Jismoniy shaxs',
}

export const CLIENT_SEGMENTS = ['dealer', 'factory', 'construction', 'agro', 'utility', 'retail', 'other'] as const
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number]
export const CLIENT_SEGMENT_LABELS: Record<ClientSegment, string> = {
  dealer: 'Diler / ulgurji savdo',
  factory: 'Ishlab chiqarish korxonasi',
  construction: 'Qurilish',
  agro: "Qishloq xo'jaligi / fermer",
  utility: 'Kommunal / suv xo\'jaligi',
  retail: 'Chakana do\'kon',
  other: 'Boshqa',
}

// ---------------------------------------------------------------- Messaging channels

export const CHANNEL_TYPES = ['telegram', 'instagram'] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]
export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  telegram: 'Telegram',
  instagram: 'Instagram',
}

export const CHANNEL_STATUSES = ['connected', 'error', 'disabled'] as const
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number]

export const MESSAGE_DIRECTIONS = ['in', 'out'] as const
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number]

// ---------------------------------------------------------------- AI assistant

export const AI_PROVIDERS = ['gemini', 'groq', 'openrouter', 'ollama', 'anthropic', 'custom'] as const
export type AiProvider = (typeof AI_PROVIDERS)[number]

export interface AiProviderInfo {
  label: string
  free: string
  baseUrl: string
  models: string[]
  needsKey: boolean
  keyUrl?: string
  note: string
}

/** Catalog shown in the settings UI. Model lists are suggestions; any model id can be typed in. */
export const AI_PROVIDER_INFO: Record<AiProvider, AiProviderInfo> = {
  gemini: {
    label: 'Google Gemini',
    free: 'Bepul (kunlik limit bilan)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // "-latest" aliases always point to Google's current model, so they don't break when versions retire.
    models: ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-pro-latest'],
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    note: "O'zbek tilini yaxshi tushunadi. Bepul tarifda Google so'rovlardan modelni yaxshilash uchun foydalanishi mumkin.",
  },
  groq: {
    label: 'Groq (Llama, Qwen, GPT-OSS)',
    free: 'Bepul (daqiqa/kunlik limit bilan)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3-32b'],
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys',
    note: "Juda tez javob beradi. O'zbek tilida Gemini'dan biroz sustroq.",
  },
  openrouter: {
    label: 'OpenRouter (bepul modellar)',
    free: "«:free» modellar bepul (kunlik so'rov limiti bor)",
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen3-235b-a22b:free'],
    needsKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    note: "Bir kalit bilan ko'p modellar. Bepul modellar ro'yxati tez-tez o'zgaradi.",
  },
  ollama: {
    label: 'Ollama (o\'z serveringizda)',
    free: 'To\'liq bepul, ma\'lumot tashqariga chiqmaydi',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen2.5:14b', 'qwen2.5:7b', 'llama3.1:8b'],
    needsKey: false,
    keyUrl: 'https://ollama.com/download',
    note: "Kuchli kompyuter (16+ GB RAM, yaxshisi GPU) kerak. Maxfiylik uchun eng yaxshi variant.",
  },
  anthropic: {
    label: 'Anthropic Claude',
    free: 'Pullik (eng yuqori sifat)',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
    needsKey: true,
    keyUrl: 'https://platform.claude.com/settings/keys',
    note: "Murakkab tahlil va o'zbek tilida eng aniq javoblar. Har bir so'rov uchun to'lov olinadi.",
  },
  custom: {
    label: 'Boshqa (OpenAI-mos API)',
    free: '—',
    baseUrl: '',
    models: [],
    needsKey: false,
    note: "OpenAI formatidagi istalgan API (masalan, LM Studio, vLLM, DeepSeek).",
  },
}
