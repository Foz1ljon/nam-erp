<script setup lang="ts">
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { NAlert, NButton, NCard, NEmpty, NRadio, NRadioGroup, NTag, useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { mobileApi } from '../api'
import type { CallSyncPermissions, CaptureMode, SyncedCall, SyncStatus } from '../plugins/call-sync'
import { CallSync } from '../plugins/call-sync'
import { DIRECTION_LABELS, fmtDateTime, fmtDuration } from '../utils/format'

const emit = defineEmits<{
  (e: 'signed-out'): void
}>()

const message = useMessage()
const dialog = useDialog()
const status = shallowRef<SyncStatus | null>(null)
const permissions = shallowRef<CallSyncPermissions | null>(null)
const visibility = useDocumentVisibility()

const PERMISSION_LABELS: Record<keyof CallSyncPermissions, string> = {
  callLog: "Qo'ng'iroqlar jurnali",
  phone: 'Telefon holati',
  contacts: 'Kontaktlar',
  audio: 'Audio fayllar (yozuvlar)',
}

const missingPermissions = computed(() =>
  permissions.value ? (Object.keys(PERMISSION_LABELS) as (keyof CallSyncPermissions)[]).filter((k) => permissions.value?.[k] !== 'granted') : [],
)

async function refresh() {
  const [s, p] = await Promise.all([CallSync.getStatus(), CallSync.checkPermissions()])
  status.value = s
  permissions.value = p
  if (!s.configured) emit('signed-out')
}

const { pause, resume } = useIntervalFn(refresh, 3000)
watch(visibility, (v) => {
  if (v === 'visible') {
    refresh()
    resume()
  } else {
    pause()
  }
})
onMounted(refresh)

async function grantPermissions() {
  permissions.value = await CallSync.requestPermissions()
  if (!missingPermissions.value.length) await syncNow()
}

async function syncNow() {
  await CallSync.syncNow()
  message.info('Sinxronlash boshlandi')
  await refresh()
}

async function setCapture(capture: CaptureMode) {
  await CallSync.setCapture({ capture })
  await refresh()
}

function signOut() {
  dialog.warning({
    title: 'Chiqish',
    content: "Qo'ng'iroqlar CRM'ga yuborilishi to'xtaydi. Davom etasizmi?",
    positiveText: 'Chiqish',
    negativeText: 'Bekor qilish',
    onPositiveClick: async () => {
      const { token } = await CallSync.getToken()
      if (status.value?.baseUrl && token) {
        // The token is dropped locally even if the server is unreachable.
        await mobileApi(status.value.baseUrl, '/logout', { method: 'POST', token }).catch(() => undefined)
      }
      await CallSync.clearConfig()
      emit('signed-out')
    },
  })
}

function resultTag(call: SyncedCall): { type: 'success' | 'default' | 'error'; text: string } {
  if (call.result === 'error') return { type: 'error', text: 'Xato' }
  if (call.result === 'private') return { type: 'default', text: 'Shaxsiy' }
  return { type: 'success', text: call.recording === 'uploaded' ? 'Lid + yozuv' : 'Lid' }
}
</script>

<template>
  <div v-if="status" class="flex flex-col gap-4">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="m-0 truncate text-xl font-semibold">{{ status.userName }}</h1>
        <p class="m-0 truncate text-xs text-muted">{{ status.baseUrl }}</p>
      </div>
      <n-button size="small" quaternary @click="signOut">Chiqish</n-button>
    </header>

    <n-alert v-if="missingPermissions.length" type="warning" title="Ruxsat kerak">
      <p class="m-0 mb-2 text-sm">Ilova ishlashi uchun ruxsat bering: {{ missingPermissions.map((k) => PERMISSION_LABELS[k]).join(', ') }}.</p>
      <n-button size="small" type="warning" @click="grantPermissions">Ruxsat berish</n-button>
    </n-alert>

    <n-card size="small">
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm">
          <div class="font-medium">{{ status.running ? 'Sinxronlanmoqda…' : 'Oxirgi sinxronlash' }}</div>
          <div class="text-muted">{{ fmtDateTime(status.lastSyncAt) }}</div>
        </div>
        <n-button type="primary" :loading="status.running" :disabled="missingPermissions.includes('callLog')" @click="syncNow">Hozir yuborish</n-button>
      </div>
      <p v-if="status.lastError" class="m-0 mt-2 text-sm text-red-600" role="alert">{{ status.lastError }}</p>
    </n-card>

    <n-card size="small" title="Qaysi qo'ng'iroqlar CRM'ga tushadi">
      <n-radio-group :value="status.capture" name="capture" class="flex flex-col gap-2" @update:value="setCapture">
        <n-radio value="new_contacts">Kontaktlarda yo'q raqamlar (yangi mijozlar) va mavjud lidlar</n-radio>
        <n-radio value="all">Barcha kiruvchi qo'ng'iroqlar</n-radio>
      </n-radio-group>
      <p class="m-0 mt-3 text-xs text-muted">
        Yozuvlar telefonning o'z qo'ng'iroq yozish funksiyasidan olinadi — sozlamalarda avtomatik yozishni yoqing.
      </p>
      <n-button class="mt-3" size="small" secondary @click="CallSync.openBatterySettings()">Fonda ishlashga ruxsat</n-button>
    </n-card>

    <n-card size="small" title="So'nggi qo'ng'iroqlar">
      <n-empty v-if="!status.recent.length" size="small" description="Hali qo'ng'iroq yuborilmadi" />
      <ul class="m-0 flex list-none flex-col p-0">
        <li v-for="c in status.recent" :key="`${c.startedAt}-${c.phone}`" class="flex items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0">
          <div class="min-w-0 text-sm">
            <div class="truncate font-medium">{{ c.name || c.phone }}</div>
            <div class="text-xs text-muted">
              {{ DIRECTION_LABELS[c.direction] }} · {{ fmtDateTime(c.startedAt) }}<template v-if="c.duration"> · {{ fmtDuration(c.duration) }}</template>
            </div>
            <div v-if="c.error" class="truncate text-xs text-red-600">{{ c.error }}</div>
          </div>
          <n-tag size="small" :type="resultTag(c).type" :bordered="false">{{ resultTag(c).text }}</n-tag>
        </li>
      </ul>
    </n-card>
  </div>
</template>
