<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import { BusinessOutline, LogInOutline } from '@vicons/ionicons5'
import type { Role } from '#shared/utils/constants'

definePageMeta({ layout: 'blank', public: true })
useHead({ title: 'Kirish — NamMotors ERP' })

interface DemoAccount {
  username: string
  fullName: string
  role: Role
  password: string
}

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const loggingInAs = ref<string | null>(null)
const form = reactive({ username: '', password: '' })
const rules: FormRules = {
  username: { required: true, message: 'Loginni kiriting', trigger: 'blur' },
  password: { required: true, message: 'Parolni kiriting', trigger: 'blur' },
}

const { data: demo } = await useApiData<DemoAccount[]>('/api/auth/demo-accounts', { default: () => [] })

const GROUPS: { title: string; roles: Role[] }[] = [
  { title: 'Boshqaruv', roles: ['admin', 'director'] },
  { title: 'Ishlab chiqarish', roles: ['foundry', 'fettling', 'cnc', 'assembly', 'painter'] },
  { title: 'Ombor, ta\'minot va sifat', roles: ['warehouse', 'supply', 'qc'] },
  { title: 'Sotuv va CRM', roles: ['sales'] },
]
const groups = computed(() =>
  GROUPS.map((g) => ({ ...g, accounts: demo.value.filter((a) => g.roles.includes(a.role)) })).filter((g) => g.accounts.length),
)

const AVATAR_COLORS: Record<Role, string> = {
  admin: 'bg-slate-700',
  director: 'bg-indigo-600',
  warehouse: 'bg-amber-600',
  supply: 'bg-orange-600',
  foundry: 'bg-red-600',
  fettling: 'bg-stone-600',
  cnc: 'bg-cyan-700',
  assembly: 'bg-blue-600',
  painter: 'bg-fuchsia-600',
  qc: 'bg-emerald-600',
  sales: 'bg-violet-600',
}

async function signIn(username: string, password: string) {
  await $fetch('/api/auth/login', { method: 'POST', body: { username, password } })
  // A new sign-in shows the introduction again.
  useIntroDismissed().value = false
  await refreshSession()
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
  await navigateTo(redirect)
}

async function submit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await signIn(form.username, form.password)
  } catch (error) {
    message.error(errorMessage(error))
  } finally {
    loading.value = false
  }
}

/** One click on a demo card signs in as that employee. */
async function loginAs(account: DemoAccount) {
  if (loggingInAs.value) return
  loggingInAs.value = account.username
  form.username = account.username
  form.password = account.password
  try {
    await signIn(account.username, account.password)
  } catch (error) {
    message.error(errorMessage(error))
    loggingInAs.value = null
  }
}
</script>

<template>
  <div class="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4 py-8 sm:py-12">
    <div class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6" :class="demo.length ? 'lg:grid-cols-[380px_1fr]' : 'max-w-sm'">
      <n-card class="shadow-2xl lg:sticky lg:top-12" :bordered="false">
        <div class="mb-6 flex flex-col items-center gap-2 text-center">
          <n-icon size="44" color="#1d4ed8"><BusinessOutline /></n-icon>
          <h1 class="m-0 text-2xl font-bold">NamMotors ERP</h1>
          <p class="m-0 text-sm text-slate-500">Ishlab chiqarish, ombor, sotuv va CRM tizimi</p>
        </div>
        <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="submit">
          <n-form-item label="Login" path="username">
            <n-input v-model:value="form.username" placeholder="admin" :input-props="{ autocomplete: 'username' }" />
          </n-form-item>
          <n-form-item label="Parol" path="password">
            <n-input
              v-model:value="form.password"
              type="password"
              show-password-on="click"
              :input-props="{ autocomplete: 'current-password' }"
            />
          </n-form-item>
          <n-button type="primary" attr-type="submit" block size="large" :loading="loading">Kirish</n-button>
        </n-form>
      </n-card>

      <section v-if="demo.length" aria-labelledby="demo-title" class="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur sm:p-6">
        <div class="mb-4">
          <h2 id="demo-title" class="m-0 text-lg font-semibold text-white">Demo hodimlar</h2>
          <p class="m-0 mt-1 text-sm text-slate-300">
            Istalgan hodimni bosing — tizimga o'sha hodim bo'lib kirasiz. Har bir lavozim o'z bo'limini va ruxsatlarini ko'radi.
          </p>
        </div>

        <div class="flex flex-col gap-5">
          <div v-for="g in groups" :key="g.title">
            <h3 class="m-0 mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">{{ g.title }}</h3>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="a in g.accounts"
                :key="a.username"
                type="button"
                class="group flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-400 focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:outline-none disabled:opacity-60"
                :disabled="!!loggingInAs"
                :aria-label="`${a.fullName} (${ROLE_LABELS[a.role]}) sifatida kirish`"
                @click="loginAs(a)"
              >
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" :class="AVATAR_COLORS[a.role]">
                  {{ a.fullName.charAt(0) }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-slate-900">{{ ROLE_LABELS[a.role] }}</span>
                  <span class="mt-0.5 block truncate font-mono text-xs text-slate-500">
                    {{ a.username }} <span class="text-slate-300">/</span> {{ a.password }}
                  </span>
                </span>
                <n-spin v-if="loggingInAs === a.username" :size="16" />
                <n-icon v-else size="18" class="text-slate-300 transition group-hover:text-blue-600"><LogInOutline /></n-icon>
              </button>
            </div>
          </div>
        </div>

        <p class="m-0 mt-5 text-xs text-slate-400">
          Hodim parolini o'zgartirsa, u bu ro'yxatdan avtomatik yo'qoladi. Haqiqiy ishga tushirishda <code class="text-slate-300">NUXT_DEMO_LOGINS=false</code> bilan panel o'chiriladi.
        </p>
      </section>
    </div>
  </div>
</template>
