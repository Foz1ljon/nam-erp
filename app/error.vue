<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const title = computed(() => (props.error.statusCode === 404 ? 'Sahifa topilmadi' : props.error.statusCode === 403 ? "Ruxsat yo'q" : 'Xatolik yuz berdi'))

function home() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
    <div class="text-6xl font-bold text-slate-300">{{ error.statusCode }}</div>
    <h1 class="m-0 text-xl font-semibold text-slate-900">{{ title }}</h1>
    <p class="m-0 max-w-md text-sm text-slate-500">{{ error.statusMessage || error.message }}</p>
    <button type="button" class="mt-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600" @click="home">
      Bosh sahifaga qaytish
    </button>
  </div>
</template>
