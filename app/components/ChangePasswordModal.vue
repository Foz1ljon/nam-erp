<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'

const show = defineModel<boolean>('show', { required: true })
const { run, pending } = useApiAction()
const formRef = ref<FormInst | null>(null)
const form = reactive({ currentPassword: '', newPassword: '', repeat: '' })

const rules: FormRules = {
  currentPassword: { required: true, message: 'Joriy parolni kiriting', trigger: 'blur' },
  newPassword: { required: true, min: 6, message: 'Kamida 6 belgi', trigger: 'blur' },
  repeat: {
    required: true,
    trigger: 'blur',
    validator: (_rule, value: string) => value === form.newPassword || new Error('Parollar mos emas'),
  },
}

async function submit() {
  await formRef.value?.validate()
  const res = await run('/api/auth/password', {
    method: 'POST',
    body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
    success: "Parol o'zgartirildi",
  })
  if (res !== null) {
    Object.assign(form, { currentPassword: '', newPassword: '', repeat: '' })
    show.value = false
  }
}
</script>

<template>
  <n-modal v-model:show="show" preset="card" title="Parolni o'zgartirish" class="max-w-md" :mask-closable="false">
    <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="submit">
      <n-form-item label="Joriy parol" path="currentPassword">
        <n-input v-model:value="form.currentPassword" type="password" show-password-on="click" />
      </n-form-item>
      <n-form-item label="Yangi parol" path="newPassword">
        <n-input v-model:value="form.newPassword" type="password" show-password-on="click" />
      </n-form-item>
      <n-form-item label="Yangi parolni takrorlang" path="repeat">
        <n-input v-model:value="form.repeat" type="password" show-password-on="click" />
      </n-form-item>
      <n-button type="primary" attr-type="submit" block :loading="pending">Saqlash</n-button>
    </n-form>
  </n-modal>
</template>
