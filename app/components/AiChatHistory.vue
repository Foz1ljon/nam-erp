<script setup lang="ts">
import { TrashOutline } from '@vicons/ionicons5'
import type { AiChatSummary } from '#shared/types/models'

const emit = defineEmits<{ (e: 'selected'): void }>()
const dialog = useDialog()
const { chats, chatId, openChat, removeChat } = useAiAssistant()

async function select(c: AiChatSummary) {
  await openChat(c._id)
  emit('selected')
}

function confirmRemove(c: AiChatSummary) {
  dialog.warning({
    title: "Suhbatni o'chirish",
    content: `«${c.title}» va undagi fayllar o'chiriladi.`,
    positiveText: "O'chirish",
    negativeText: 'Bekor',
    onPositiveClick: () => removeChat(c._id),
  })
}
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <div
      v-for="c in chats"
      :key="c._id"
      class="group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm"
      :class="c._id === chatId ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50'"
    >
      <button type="button" class="min-w-0 flex-1 truncate text-left" @click="select(c)">
        {{ c.title }}
        <span class="block text-[11px] text-slate-400">{{ fmtDateTime(c.updatedAt) }}</span>
      </button>
      <n-button text size="tiny" class="opacity-60 group-hover:opacity-100" aria-label="Suhbatni o'chirish" @click="confirmRemove(c)">
        <n-icon><TrashOutline /></n-icon>
      </n-button>
    </div>
    <p v-if="!chats.length" class="m-0 px-2 py-1 text-xs text-slate-400">Suhbatlar shu yerda saqlanadi</p>
  </div>
</template>
