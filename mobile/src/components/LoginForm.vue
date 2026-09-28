<script setup lang="ts">
import { Device } from '@capacitor/device'
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { reactive, ref } from 'vue'
import { mobileApi } from '../api'
import type { MobileUser } from '../api'
import { CallSync } from '../plugins/call-sync'
import { normalizeBaseUrl } from '../utils/format'

const emit = defineEmits<{
  (e: 'signed-in'): void
}>()

const message = useMessage()
const loading = ref(false)
const form = reactive({ baseUrl: '', username: '', password: '' })

async function submit() {
  if (!form.baseUrl.trim() || !form.username.trim() || !form.password) {
    message.warning("Barcha maydonlarni to'ldiring")
    return
  }
  loading.value = true
  try {
    const baseUrl = normalizeBaseUrl(form.baseUrl)
    const info = await Device.getInfo()
    const { token, user } = await mobileApi<{ token: string; user: MobileUser }>(baseUrl, '/login', {
      method: 'POST',
      body: { username: form.username, password: form.password, deviceName: `${info.manufacturer} ${info.model}`.trim() },
    })
    await CallSync.configure({ baseUrl, token, userName: user.fullName, capture: 'new_contacts' })
    emit('signed-in')
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-6">
    <header class="text-center">
      <h1 class="m-0 text-2xl font-semibold">NamMotors</h1>
      <p class="m-0 mt-1 text-sm text-muted">Qo'ng'iroqlar va yozuvlar CRM lidlariga tushadi</p>
    </header>
    <n-card size="small">
      <n-form @submit.prevent="submit">
        <n-form-item label="ERP manzili" path="baseUrl">
          <n-input v-model:value="form.baseUrl" placeholder="erp.nammotors.uz" :input-props="{ inputmode: 'url', autocapitalize: 'off' }" />
        </n-form-item>
        <n-form-item label="Login" path="username">
          <n-input v-model:value="form.username" :input-props="{ autocomplete: 'username', autocapitalize: 'off' }" />
        </n-form-item>
        <n-form-item label="Parol" path="password">
          <n-input v-model:value="form.password" type="password" show-password-on="click" :input-props="{ autocomplete: 'current-password' }" />
        </n-form-item>
        <n-button type="primary" attr-type="submit" block :loading="loading">Kirish</n-button>
      </n-form>
    </n-card>
  </div>
</template>
