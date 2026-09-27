<script setup lang="ts">
import { dateUzUZ, uzUZ } from 'naive-ui'
import { themeOverrides } from '~/utils/theme'
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
</template>
