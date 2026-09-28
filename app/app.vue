<script setup lang="ts">
import { dateUzUZ, uzUZ } from 'naive-ui'
import { themeOverrides } from '~/utils/theme'

// On a (hard) refresh the server HTML arrives before the client applies screen size, sidebar state and
// stored preferences. The loader is part of that HTML and hides the page until the app is hydrated and
// idle, so the first thing people see is the finished page with its data.
const booting = ref(true)
onNuxtReady(() => {
  booting.value = false
})
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="uzUZ" :date-locale="dateUzUZ">
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <NuxtRouteAnnouncer />
            <NuxtLayout>
              <NuxtPage />
            </NuxtLayout>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>

  <Transition leave-active-class="transition-opacity duration-300" leave-to-class="opacity-0">
    <div v-if="booting" class="nm-boot" role="status" aria-live="polite">
      <div class="nm-boot__logo">NamMotors <span>ERP</span></div>
      <div class="nm-boot__spinner" aria-hidden="true" />
      <span class="sr-only">Yuklanmoqda…</span>
    </div>
  </Transition>
</template>

<style>
/* Plain CSS (no component styles) so the loader is visible in the very first paint of the server HTML. */
.nm-boot {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: var(--color-surface);
}
.nm-boot__logo {
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}
.nm-boot__logo span {
  color: var(--color-primary);
}
.nm-boot__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: nm-boot-spin 0.8s linear infinite;
}
@keyframes nm-boot-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nm-boot__spinner {
    animation-duration: 2.4s;
  }
}
</style>
