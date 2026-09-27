<script setup lang="ts">
import { CopyOutline, LogoInstagram, PaperPlane } from '@vicons/ionicons5'
import type { ChannelDto, IntegrationsDto } from '#shared/types/models'

definePageMeta({ permission: 'channels.use' })
useHead({ title: 'Telegram va Instagram profillari — NamMotors ERP' })

const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const { can } = useAuth()
const { run, pending } = useApiAction()
const isAdmin = computed(() => can('users.manage'))

const { data: profiles, refresh } = await useApiData<ChannelDto[]>('/api/channels', { default: () => [] })
const { data: integrations, refresh: refreshIntegrations } = await useApiData<IntegrationsDto | null>(
  () => (isAdmin.value ? '/api/settings/integrations' : null),
  { default: () => null },
)
const { data: general, refresh: refreshGeneral } = await useApiData<{ publicBaseUrl: string }>('/api/settings/general', {
  default: () => ({ publicBaseUrl: '' }),
})

// ---- result of the Instagram login redirect
onMounted(() => {
  if (route.query.ig === 'ok') message.success(`Instagram profili ulandi: ${route.query.name ?? ''}`)
  if (route.query.ig === 'error') message.error(String(route.query.msg ?? 'Instagram ulanmadi'), { duration: 10_000 })
  if (route.query.ig) router.replace({ query: {} })
})

// ---- Telegram login wizard: phone → code → (2FA password)
const tg = reactive({
  show: false,
  step: 'phone' as 'phone' | 'code' | 'password',
  phone: '+998',
  code: '',
  password: '',
  hint: '',
  loginId: '',
  viaApp: true,
})

function openTelegram() {
  Object.assign(tg, { show: true, step: 'phone', code: '', password: '', hint: '', loginId: '' })
}

async function sendCode() {
  const res = await run<{ loginId: string; viaApp: boolean }>('/api/channels/telegram/code', { method: 'POST', body: { phone: tg.phone } })
  if (res) Object.assign(tg, { loginId: res.loginId, viaApp: res.viaApp, step: 'code' })
}

async function verify() {
  const res = await run<{ status: 'connected' | 'password_required'; hint?: string }>('/api/channels/telegram/verify', {
    method: 'POST',
    body: { loginId: tg.loginId, code: tg.step === 'code' ? tg.code : undefined, password: tg.step === 'password' ? tg.password : undefined },
  })
  if (!res) return
  if (res.status === 'password_required') {
    Object.assign(tg, { step: 'password', hint: res.hint ?? '' })
    return
  }
  message.success('Telegram profili ulandi')
  tg.show = false
  refresh()
}

// ---- Instagram: full-page redirect to Instagram's own login screen
function connectInstagram() {
  window.location.href = '/api/channels/instagram/connect'
}

// ---- profile settings / disconnect
const edit = reactive({ show: false, profile: null as ChannelDto | null, greeting: '', capture: 'new_contacts' as ChannelDto['capture'] })

function openEdit(p: ChannelDto) {
  Object.assign(edit, { show: true, profile: p, greeting: p.greeting ?? '', capture: p.capture ?? 'new_contacts' })
}

async function saveEdit() {
  if (!edit.profile) return
  const res = await run(`/api/channels/${edit.profile._id}`, { method: 'PUT', body: { greeting: edit.greeting, capture: edit.capture }, success: 'Saqlandi' })
  if (res !== null) {
    edit.show = false
    refresh()
  }
}

function disconnect(p: ChannelDto) {
  dialog.warning({
    title: 'Profilni uzish',
    content: `${p.name} CRM'dan uziladi${p.type === 'telegram' ? " (Telegram'dagi «NamMotors ERP» qurilmasi ham chiqariladi)" : ''}. Yozishmalar tarixi saqlanib qoladi.`,
    positiveText: 'Uzish',
    negativeText: 'Bekor',
    onPositiveClick: async () => {
      if ((await run(`/api/channels/${p._id}`, { method: 'DELETE', success: 'Profil uzildi' })) !== null) refresh()
    },
  })
}

// ---- admin: integration credentials
const baseUrl = ref(general.value.publicBaseUrl)
const integ = reactive({
  telegramApiId: integrations.value?.telegramApiId ?? null,
  telegramApiHash: '',
  instagramAppId: integrations.value?.instagramAppId ?? '',
  instagramAppSecret: '',
})

async function saveIntegrations() {
  const general = await run('/api/settings/general', { method: 'PUT', body: { publicBaseUrl: baseUrl.value } })
  if (general === null) return
  const res = await run('/api/settings/integrations', {
    method: 'PUT',
    body: {
      telegramApiId: integ.telegramApiId,
      telegramApiHash: integ.telegramApiHash || undefined,
      instagramAppId: integ.instagramAppId,
      instagramAppSecret: integ.instagramAppSecret || undefined,
    },
    success: 'Sozlamalar saqlandi',
  })
  if (res !== null) {
    integ.telegramApiHash = ''
    integ.instagramAppSecret = ''
    await Promise.all([refreshIntegrations(), refreshGeneral()])
  }
}

async function copy(text: string | null | undefined) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    message.success('Nusxalandi')
  } catch {
    message.error("Nusxalab bo'lmadi")
  }
}

function statusTag(p: ChannelDto): { type: 'success' | 'error' | 'default'; label: string } {
  if (!p.active || p.status === 'disabled') return { type: 'default', label: 'Uzilgan' }
  if (p.status === 'error') return { type: 'error', label: 'Xatolik' }
  return { type: 'success', label: 'Ulangan' }
}
</script>

<template>
  <div>
    <PageHeader
      title="Telegram va Instagram profillari"
      subtitle="O'zingizning shaxsiy Telegram va Instagram profilingizni ulang: mijozlar sizga yozgan xabarlar «Xabarlar» bo'limiga tushadi, yangi yozgan har bir odam avtomatik lid bo'ladi, javobni esa CRM'dan o'z nomingizdan yozasiz."
      tour="channels"
    >
      <template #actions>
        <n-button type="primary" data-tour="channels-telegram" @click="openTelegram">
          <template #icon><n-icon><PaperPlane /></n-icon></template>
          Telegram profilini ulash
        </n-button>
        <n-button data-tour="channels-instagram" @click="connectInstagram">
          <template #icon><n-icon><LogoInstagram /></n-icon></template>
          Instagram profilini ulash
        </n-button>
      </template>
    </PageHeader>

    <n-empty v-if="!profiles.length" description="Hali profil ulanmagan. Yuqoridagi tugmalardan birini bosing." class="py-10" />

    <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2" data-tour="channels-list">
      <n-card v-for="p in profiles" :key="p._id" size="small">
        <template #header>
          <div class="flex items-center gap-2">
            <n-icon size="20" :color="p.type === 'telegram' ? '#229ED9' : '#E1306C'">
              <PaperPlane v-if="p.type === 'telegram'" />
              <LogoInstagram v-else />
            </n-icon>
            <span>{{ p.name }}</span>
            <n-tag size="small" round :bordered="false" :type="statusTag(p).type">{{ statusTag(p).label }}</n-tag>
          </div>
        </template>
        <template #header-extra>
          <span class="text-xs text-slate-500">{{ p.owner.fullName }}</span>
        </template>

        <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <template v-if="p.type === 'telegram'">
            <dt class="text-slate-500">Ism</dt>
            <dd class="m-0">{{ p.telegram?.displayName || '—' }}</dd>
            <dt class="text-slate-500">Telefon</dt>
            <dd class="m-0">{{ p.telegram?.phone || '—' }}</dd>
          </template>
          <template v-else>
            <dt class="text-slate-500">Ism</dt>
            <dd class="m-0">{{ p.instagram?.displayName || '—' }}</dd>
            <dt class="text-slate-500">Token amal qiladi</dt>
            <dd class="m-0">{{ fmtDate(p.instagram?.tokenExpiresAt) }} gacha (avtomatik yangilanadi)</dd>
          </template>
          <dt class="text-slate-500">Qaysi yozishmalar</dt>
          <dd class="m-0">{{ p.capture === 'all' ? 'Barcha shaxsiy yozishmalar' : 'Faqat kontaktlarda yo\'q (yangi) odamlar' }}</dd>
          <dt class="text-slate-500">Suhbatlar</dt>
          <dd class="m-0">{{ p.conversations ?? 0 }}</dd>
        </dl>

        <n-alert v-if="p.status === 'error' && p.lastError" type="error" :bordered="false" class="mt-3">{{ p.lastError }}</n-alert>

        <template #action>
          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="{ path: '/crm/inbox', query: { channel: p._id } }"><n-button size="small" type="primary" secondary>Xabarlar</n-button></NuxtLink>
            <n-button v-if="p.active" size="small" @click="openEdit(p)">Sozlash</n-button>
            <n-button v-if="!p.active || p.status === 'error'" size="small" @click="p.type === 'telegram' ? openTelegram() : connectInstagram()">Qayta ulash</n-button>
            <n-button v-if="p.active" size="small" type="error" ghost @click="disconnect(p)">Uzish</n-button>
          </div>
        </template>
      </n-card>
    </div>

    <n-card v-if="isAdmin" size="small" title="Integratsiya sozlamalari (administrator)" data-tour="channels-admin">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <h3 class="m-0 mb-2 text-sm font-semibold">Tizimning ommaviy manzili</h3>
          <p class="m-0 mb-2 text-xs text-slate-500">ERP internetdan ochiladigan https manzil. Instagram uchun majburiy, Telegram usiz ham ishlaydi.</p>
          <n-input v-model:value="baseUrl" placeholder="https://erp.nammotors.uz" />
        </div>
        <div>
          <h3 class="m-0 mb-2 text-sm font-semibold">Telegram API</h3>
          <p class="m-0 mb-2 text-xs text-slate-500">
            Bir marta: <a href="https://my.telegram.org/apps" target="_blank" rel="noopener">my.telegram.org/apps</a> ga kiring → ilova yarating →
            <b>api_id</b> va <b>api_hash</b> ni shu yerga kiriting. Barcha menejerlar shu kalit bilan profil ulaydi.
          </p>
          <n-form-item label="api_id" :show-feedback="false" class="mb-2"><n-input-number v-model:value="integ.telegramApiId" :show-button="false" class="w-full" /></n-form-item>
          <n-form-item :label="`api_hash ${integrations?.telegramApiHash ? '(saqlangan ' + integrations.telegramApiHash + ')' : ''}`" :show-feedback="false">
            <n-input v-model:value="integ.telegramApiHash" type="password" show-password-on="click" placeholder="O'zgartirish uchun kiriting" />
          </n-form-item>
        </div>
        <div>
          <h3 class="m-0 mb-2 text-sm font-semibold">Instagram (Meta ilovasi)</h3>
          <p class="m-0 mb-2 text-xs text-slate-500">
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com</a> → ilova → «Instagram» → «API setup with Instagram login».
            Quyidagi manzillarni Meta'ga kiriting va <code>messages</code> webhookiga obuna bo'ling.
          </p>
          <n-form-item label="Instagram App ID" :show-feedback="false" class="mb-2"><n-input v-model:value="integ.instagramAppId" /></n-form-item>
          <n-form-item :label="`Instagram App Secret ${integrations?.instagramAppSecret ? '(saqlangan ' + integrations.instagramAppSecret + ')' : ''}`" :show-feedback="false">
            <n-input v-model:value="integ.instagramAppSecret" type="password" show-password-on="click" placeholder="O'zgartirish uchun kiriting" />
          </n-form-item>
        </div>
      </div>

      <div v-if="integrations" class="mt-4 grid grid-cols-1 gap-2 rounded-md bg-slate-50 p-3 text-xs md:grid-cols-3">
        <div v-for="[label, value] in [['OAuth redirect URI', integrations.instagramRedirectUri], ['Webhook callback URL', integrations.instagramWebhookUrl], ['Webhook verify token', integrations.instagramVerifyToken]]" :key="label as string">
          <div class="text-slate-500">{{ label }}</div>
          <div class="flex items-center gap-1 break-all">
            <code>{{ value || 'Avval ommaviy manzilni kiriting' }}</code>
            <n-button v-if="value" text size="tiny" aria-label="Nusxalash" @click="copy(value as string)"><n-icon><CopyOutline /></n-icon></n-button>
          </div>
        </div>
      </div>

      <n-button type="primary" class="mt-4" :loading="pending" @click="saveIntegrations">Saqlash</n-button>
    </n-card>

    <!-- Telegram login wizard -->
    <n-modal v-model:show="tg.show" preset="card" title="Telegram profilini ulash" class="max-w-lg" :mask-closable="false">
      <n-steps :current="tg.step === 'phone' ? 1 : tg.step === 'code' ? 2 : 3" size="small" class="mb-5">
        <n-step title="Telefon" />
        <n-step title="Kod" />
        <n-step title="Parol" />
      </n-steps>

      <n-form v-if="tg.step === 'phone'" @submit.prevent="sendCode">
        <p class="mt-0 text-sm text-slate-600">Telegram akkauntingiz ochilgan telefon raqamini kiriting. Telegram'ga tasdiqlash kodi keladi.</p>
        <n-form-item label="Telefon raqami"><n-input v-model:value="tg.phone" placeholder="+998901234567" :input-props="{ inputmode: 'tel', autocomplete: 'tel' }" /></n-form-item>
        <n-alert type="info" :bordered="false" class="mb-4">
          ERP Telegram'ga «NamMotors ERP» qurilmasi sifatida kiradi (Sozlamalar → Qurilmalar). Istalgan payt shu yerdan yoki «Uzish» tugmasi bilan chiqarishingiz mumkin.
          Standart holatda faqat kontaktlaringizda yo'q odamlarning xabarlari CRM'ga tushadi.
        </n-alert>
        <n-button type="primary" attr-type="submit" block :loading="pending">Kod yuborish</n-button>
      </n-form>

      <n-form v-else-if="tg.step === 'code'" @submit.prevent="verify">
        <p class="mt-0 text-sm text-slate-600">
          {{ tg.viaApp ? "Kod Telegram ilovasiga «Telegram» nomli chatga keldi." : 'Kod SMS orqali yuborildi.' }} Uni kiriting.
        </p>
        <n-form-item label="Tasdiqlash kodi"><n-input v-model:value="tg.code" placeholder="12345" :maxlength="8" :input-props="{ inputmode: 'numeric', autocomplete: 'one-time-code' }" /></n-form-item>
        <div class="flex gap-2">
          <n-button @click="tg.step = 'phone'">Orqaga</n-button>
          <n-button type="primary" attr-type="submit" class="flex-1" :loading="pending" :disabled="tg.code.length < 4">Tasdiqlash</n-button>
        </div>
      </n-form>

      <n-form v-else @submit.prevent="verify">
        <p class="mt-0 text-sm text-slate-600">Akkauntingizda ikki bosqichli himoya yoqilgan. Bulutli parolingizni kiriting.</p>
        <n-form-item :label="tg.hint ? `Parol (eslatma: ${tg.hint})` : 'Parol'">
          <n-input v-model:value="tg.password" type="password" show-password-on="click" :input-props="{ autocomplete: 'current-password' }" />
        </n-form-item>
        <n-button type="primary" attr-type="submit" block :loading="pending" :disabled="!tg.password">Kirish</n-button>
      </n-form>
    </n-modal>

    <!-- Profile settings -->
    <n-modal v-model:show="edit.show" preset="card" :title="`${edit.profile?.name ?? ''} — sozlash`" class="max-w-lg">
      <n-form label-placement="top" @submit.prevent="saveEdit">
        <n-form-item label="Qaysi yozishmalar CRM'ga tushadi">
          <n-radio-group v-model:value="edit.capture">
            <n-space vertical>
              <n-radio value="new_contacts">Faqat telefon kontaktlarimda yo'q odamlar (yangi mijozlar) — tavsiya etiladi</n-radio>
              <n-radio value="all">Barcha shaxsiy yozishmalar</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="Avtomatik salomlashish (yangi mijozning birinchi xabariga)">
          <n-input v-model:value="edit.greeting" type="textarea" :autosize="{ minRows: 2 }" placeholder="Bo'sh qoldirsangiz, avtomatik javob yuborilmaydi" />
        </n-form-item>
        <n-button type="primary" attr-type="submit" block :loading="pending">Saqlash</n-button>
      </n-form>
    </n-modal>
  </div>
</template>
