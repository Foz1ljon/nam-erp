<script setup lang="ts">
import {
  ArchiveOutline,
  ArrowBackOutline,
  ArrowForwardOutline,
  BarcodeOutline,
  BuildOutline,
  BusinessOutline,
  CartOutline,
  ChatbubblesOutline,
  CheckmarkCircleOutline,
  ColorPaletteOutline,
  ConstructOutline,
  CubeOutline,
  FlameOutline,
  HammerOutline,
  HelpCircleOutline,
  MicOutline,
  ShieldCheckmarkOutline,
  SparklesOutline,
  SwapHorizontalOutline,
} from '@vicons/ionicons5'
import type { Component } from 'vue'

definePageMeta({ layout: 'blank' })
useHead({ title: 'Tanishtiruv — NamMotors ERP' })

const { user, can } = useAuth()
const { fetch: refreshSession } = useUserSession()
const guide = computed(() => ROLE_GUIDES[user.value?.role ?? 'director'])

const FLOW: { label: string; note: string; icon: Component }[] = [
  { label: 'Xomashyo', note: 'chugun, metall', icon: CubeOutline },
  { label: 'Liteyka', note: 'quyish', icon: FlameOutline },
  { label: 'Pishka stroy', note: 'tozalash', icon: HammerOutline },
  { label: 'Sifat nazorati', note: 'tekshiruv', icon: ShieldCheckmarkOutline },
  { label: 'CHPU', note: 'rezba', icon: BuildOutline },
  { label: 'Sklad', note: 'detallar', icon: ArchiveOutline },
  { label: "Yig'uv", note: "obmotka, yig'ish", icon: ConstructOutline },
  { label: "Bo'yoq", note: 'birka, qadoq, sinov', icon: ColorPaletteOutline },
  { label: 'Tayyor ombor', note: 'dvigatel, nasos', icon: BarcodeOutline },
  { label: 'Sotuv', note: 'mijozga', icon: CartOutline },
]

const FEATURES = computed(() => [
  { icon: SwapHorizontalOutline, title: 'Jonli topshirish', text: "Har bir bo'lim tayyorlaganini keyingisiga topshiradi, qabul qiluvchi sanab tasdiqlaydi. Mahsulot doim kimda turgani aniq." },
  { icon: ShieldCheckmarkOutline, title: 'Sifat nazorati', text: "Tozalash, yig'ish va to'liq sinovdan keyin tekshiruv. Brak sababi bilan qayd etiladi, qirindi liteykaga qaytadi." },
  { icon: BarcodeOutline, title: 'Seriya raqamlari', text: "Har bir dvigatel va nasosga birka: qachon ishlab chiqarilgani va kimga sotilgani — kafolat uchun." },
  { icon: ArchiveOutline, title: 'Ombor', text: "Barcha sex va omborlardagi qoldiq real vaqtda. Har bir harakat jurnalga yoziladi, hech narsa izsiz o'zgarmaydi." },
  ...(can('crm.use') || can('sales.view')
    ? [{ icon: ChatbubblesOutline, title: 'CRM va yozishmalar', text: "Lidlar, B2B mijozlar, buyurtmalar, to'lovlar. Telegram va Instagram xabarlari ham shu yerda." }]
    : []),
  ...(can('ai.use')
    ? [{ icon: SparklesOutline, title: 'AI yordamchi', text: "«Kecha kim nima qildi?», «qarzdorlarni Excel qil» — yozing yoki ovoz bilan ayting, u ERP'dan tekshirib javob beradi." }]
    : []),
])

const slides = ['welcome', 'flow', 'role', 'features', 'help'] as const
const index = ref(0)
const direction = ref<'next' | 'prev'>('next')
const last = computed(() => index.value === slides.length - 1)

function go(to: number) {
  if (to < 0 || to >= slides.length) return
  direction.value = to > index.value ? 'next' : 'prev'
  index.value = to
}

onKeyStroke('ArrowRight', () => (last.value ? finish() : go(index.value + 1)))
onKeyStroke('ArrowLeft', () => go(index.value - 1))

const finishing = ref(false)
async function finish(to?: string) {
  if (finishing.value) return
  finishing.value = true
  try {
    await $fetch('/api/auth/onboarded', { method: 'POST' })
    await refreshSession()
  } finally {
    finishing.value = false
  }
  await navigateTo(to ?? guide.value.home)
}
</script>

<template>
  <div class="nm-welcome relative flex min-h-dvh flex-col text-white">
    <!-- decorative background -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/30 blur-3xl" />
      <div class="absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:28px_28px]" />
    </div>

    <header class="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
      <div class="flex items-center gap-2 text-lg font-bold">
        <n-icon size="26" color="#93c5fd"><BusinessOutline /></n-icon>
        NamMotors <span class="text-blue-300">ERP</span>
      </div>
      <button type="button" class="rounded-md px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white" @click="finish()">
        O'tkazib yuborish
      </button>
    </header>

    <main class="relative z-10 flex flex-1 items-center justify-center px-4 pb-4 sm:px-8">
      <div class="w-full max-w-4xl">
        <Transition :name="direction === 'next' ? 'nm-slide-next' : 'nm-slide-prev'" mode="out-in">
          <!-- 1. Welcome -->
          <section v-if="slides[index] === 'welcome'" key="welcome" class="text-center">
            <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <n-icon size="44" color="#bfdbfe"><BusinessOutline /></n-icon>
            </div>
            <p class="m-0 text-sm font-medium tracking-wide text-blue-200 uppercase">Xush kelibsiz</p>
            <h1 class="m-0 mt-2 text-3xl leading-tight font-bold sm:text-5xl">Assalomu alaykum, {{ user?.fullName }}!</h1>
            <p class="mx-auto mt-4 mb-0 max-w-2xl text-base text-white/80 sm:text-lg">
              NamMotors ERP — elektr dvigatel va suv nasoslari zavodining yagona tizimi. Xomashyo kelishidan tayyor mahsulot sotilishigacha
              har bir qadam shu yerda qayd etiladi: kim, qachon, nima qildi va hozir nima qayerda turibdi.
            </p>
            <div class="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm ring-1 ring-white/20">
              Sizning lavozimingiz: <b>{{ user ? ROLE_LABELS[user.role] : '' }}</b>
            </div>
          </section>

          <!-- 2. How the factory flows -->
          <section v-else-if="slides[index] === 'flow'" key="flow">
            <h2 class="m-0 text-center text-2xl font-bold sm:text-4xl">Zavod qanday ishlaydi</h2>
            <p class="mx-auto mt-3 mb-8 max-w-2xl text-center text-white/75">
              Mahsulot bo'limdan bo'limga o'tadi. Har bir bo'lim o'z ishini tizimga kiritadi va keyingisiga topshiradi — keyingi bo'lim qabul qilib tasdiqlaydi.
            </p>
            <ol class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-5">
              <li
                v-for="(step, i) in FLOW"
                :key="step.label"
                class="nm-flow-step relative flex flex-col items-center rounded-2xl bg-white/10 px-2 py-4 text-center ring-1 ring-white/15 backdrop-blur"
                :style="{ animationDelay: `${i * 70}ms` }"
              >
                <span class="absolute top-2 left-3 text-xs font-semibold text-white/50">{{ i + 1 }}</span>
                <n-icon size="28" color="#bfdbfe"><component :is="step.icon" /></n-icon>
                <span class="mt-2 text-sm font-semibold">{{ step.label }}</span>
                <span class="text-xs text-white/60">{{ step.note }}</span>
              </li>
            </ol>
            <p class="mt-6 mb-0 text-center text-sm text-white/70">
              Brak va qirindilar liteykaga qaytib, qayta eritiladi. Quymalar, yarim tayyor detallar va tayyor mahsulot — hammasini sotish mumkin.
            </p>
          </section>

          <!-- 3. What this user does -->
          <section v-else-if="slides[index] === 'role'" key="role">
            <p class="m-0 text-center text-sm font-medium tracking-wide text-blue-200 uppercase">{{ user ? ROLE_LABELS[user.role] : '' }}</p>
            <h2 class="m-0 mt-2 text-center text-2xl font-bold sm:text-4xl">Sizning vazifangiz</h2>
            <p class="mx-auto mt-3 mb-8 max-w-2xl text-center text-white/80">{{ guide.headline }}</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-for="(step, i) in guide.steps" :key="step.title" class="flex gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{{ i + 1 }}</span>
                <div class="min-w-0">
                  <div class="font-semibold">{{ step.title }}</div>
                  <p class="m-0 mt-1 text-sm text-white/75">{{ step.text }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- 4. Key features -->
          <section v-else-if="slides[index] === 'features'" key="features">
            <h2 class="m-0 text-center text-2xl font-bold sm:text-4xl">Asosiy imkoniyatlar</h2>
            <p class="mx-auto mt-3 mb-8 max-w-2xl text-center text-white/75">Siz ishlaydigan qismlar — qisqacha.</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="f in FEATURES" :key="f.title" class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <n-icon size="26" color="#bfdbfe"><component :is="f.icon" /></n-icon>
                <div class="mt-2 font-semibold">{{ f.title }}</div>
                <p class="m-0 mt-1 text-sm text-white/75">{{ f.text }}</p>
              </div>
            </div>
          </section>

          <!-- 5. Where to get help -->
          <section v-else key="help" class="text-center">
            <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-400/20 ring-1 ring-emerald-300/40">
              <n-icon size="44" color="#6ee7b7"><CheckmarkCircleOutline /></n-icon>
            </div>
            <h2 class="m-0 text-2xl font-bold sm:text-4xl">Hammasi tayyor!</h2>
            <p class="mx-auto mt-3 mb-8 max-w-2xl text-white/80">Qiynalsangiz, yordam doim yoningizda:</p>
            <div class="mx-auto grid max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <n-icon size="24" color="#bfdbfe"><HelpCircleOutline /></n-icon>
                <div class="mt-2 font-semibold">«Yordam» tugmasi</div>
                <p class="m-0 mt-1 text-sm text-white/75">Har bir sahifada: tugmalar nima qilishini ketma-ket ko'rsatadi. Sahifani birinchi ochganingizda o'zi boshlanadi.</p>
              </div>
              <div v-if="can('ai.use')" class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <n-icon size="24" color="#f0abfc"><SparklesOutline /></n-icon>
                <div class="mt-2 font-semibold">AI yordamchi</div>
                <p class="m-0 mt-1 text-sm text-white/75">O'ng pastki burchakdagi jonli tugma — istalgan savolni bering.</p>
              </div>
              <div v-if="can('ai.use')" class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <n-icon size="24" color="#fda4af"><MicOutline /></n-icon>
                <div class="mt-2 font-semibold">Ovoz bilan</div>
                <p class="m-0 mt-1 text-sm text-white/75">🎤 ni bosib gapiring — javobni ovozda eshitasiz.</p>
              </div>
              <div v-if="!can('ai.use')" class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 sm:col-span-2">
                <n-icon size="24" color="#bfdbfe"><SwapHorizontalOutline /></n-icon>
                <div class="mt-2 font-semibold">Qabul kutayotgan ishlar</div>
                <p class="m-0 mt-1 text-sm text-white/75">Sizga biror narsa topshirilsa, bosh sahifada sariq raqam chiqadi — «Topshirish / qabul» dan tasdiqlang.</p>
              </div>
            </div>
            <p class="mt-6 mb-0 text-sm text-white/60">Bu tanishtiruvni keyinroq ham ko'rish mumkin: o'ng yuqoridagi ismingiz → «Tanishtiruv».</p>
          </section>
        </Transition>
      </div>
    </main>

    <footer class="sticky bottom-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:bg-none sm:px-8 sm:pt-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:invisible"
        :disabled="index === 0"
        @click="go(index - 1)"
      >
        <n-icon><ArrowBackOutline /></n-icon> Orqaga
      </button>

      <div class="flex items-center gap-2" role="tablist" aria-label="Slaydlar">
        <button
          v-for="(s, i) in slides"
          :key="s"
          type="button"
          role="tab"
          :aria-selected="i === index"
          :aria-label="`${i + 1}-slayd`"
          class="h-2 rounded-full transition-all"
          :class="i === index ? 'w-7 bg-white' : 'w-2 bg-white/35 hover:bg-white/60'"
          @click="go(i)"
        />
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-lg transition hover:bg-blue-50 disabled:opacity-60"
        data-action="next"
        :disabled="finishing"
        @click="last ? finish() : go(index + 1)"
      >
        {{ last ? 'Ishni boshlash' : 'Keyingi' }}
        <n-icon><ArrowForwardOutline /></n-icon>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.nm-welcome {
  background: radial-gradient(1200px 600px at 10% -10%, #1e40af 0%, transparent 60%), linear-gradient(160deg, #0f172a 0%, #172554 55%, #3b0764 100%);
}
.nm-slide-next-enter-active,
.nm-slide-next-leave-active,
.nm-slide-prev-enter-active,
.nm-slide-prev-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.nm-slide-next-enter-from,
.nm-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(28px);
}
.nm-slide-next-leave-to,
.nm-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}
.nm-flow-step {
  animation: nm-pop 0.4s ease both;
}
@keyframes nm-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nm-slide-next-enter-active,
  .nm-slide-next-leave-active,
  .nm-slide-prev-enter-active,
  .nm-slide-prev-leave-active,
  .nm-flow-step {
    transition: none;
    animation: none;
  }
}
</style>
