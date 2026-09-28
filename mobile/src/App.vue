<script setup lang="ts">
import { NConfigProvider, NDialogProvider, NMessageProvider, NSpin } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { onMounted, ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import SyncDashboard from './components/SyncDashboard.vue'
import { CallSync } from './plugins/call-sync'

// Kept in sync with the @theme tokens in style.css.
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#1d4ed8',
    primaryColorHover: '#2563eb',
    primaryColorPressed: '#1e40af',
    primaryColorSuppl: '#2563eb',
    borderRadius: '8px',
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
}

const ready = ref(false)
const signedIn = ref(false)

onMounted(async () => {
  signedIn.value = (await CallSync.getStatus()).configured
  ready.value = true
})
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <main class="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-5">
          <div v-if="!ready" class="flex flex-1 items-center justify-center"><n-spin /></div>
          <SyncDashboard v-else-if="signedIn" @signed-out="signedIn = false" />
          <LoginForm v-else @signed-in="signedIn = true" />
        </main>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
