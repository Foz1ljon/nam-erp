<script setup lang="ts">
import { NButton, NTag, type DataTableColumns, type FormInst, type FormRules } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { UserDto } from '#shared/types/models'
import type { Role } from '#shared/utils/constants'

definePageMeta({ permission: 'users.manage' })
useHead({ title: 'Hodimlar — NamMotors ERP' })

const refs = useRefsStore()
const { run, pending: saving } = useApiAction()
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

const { data, pending, refresh } = await useApiData<UserDto[]>('/api/users', { default: () => [] })

const empty = () => ({ fullName: '', username: '', role: 'foundry' as Role, location: null as string | null, phone: '', active: true, password: '' })
const form = ref(empty())

const rules = computed<FormRules>(() => ({
  fullName: { required: true, message: 'F.I.Sh. kiriting', trigger: 'blur' },
  username: { required: true, message: 'Login kiriting', trigger: 'blur' },
  password: editingId.value ? [] : { required: true, min: 6, message: 'Kamida 6 belgi', trigger: 'blur' },
}))

function open(row: UserDto | null) {
  editingId.value = row?._id ?? null
  form.value = row
    ? { fullName: row.fullName, username: row.username, role: row.role, location: row.location?._id ?? null, phone: row.phone ?? '', active: row.active, password: '' }
    : empty()
  modalOpen.value = true
}

async function submit() {
  await formRef.value?.validate()
  const url = editingId.value ? `/api/users/${editingId.value}` : '/api/users'
  const res = await run(url, { method: editingId.value ? 'PUT' : 'POST', body: form.value, success: 'Saqlandi' })
  if (res !== null) {
    modalOpen.value = false
    await Promise.all([refresh(), refs.load(true)])
  }
}

const columns: DataTableColumns<UserDto> = [
  { title: 'F.I.Sh.', key: 'fullName', minWidth: 200 },
  { title: 'Login', key: 'username', width: 130 },
  { title: 'Lavozim (rol)', key: 'role', width: 220, render: (r) => ROLE_LABELS[r.role] },
  { title: "Bo'lim", key: 'location', minWidth: 180, render: (r) => r.location?.name ?? '—' },
  { title: 'Telefon', key: 'phone', width: 150 },
  {
    title: 'Holat',
    key: 'active',
    width: 100,
    render: (r) => h(NTag, { size: 'small', bordered: false, type: r.active ? 'success' : 'error' }, () => (r.active ? 'Faol' : 'Bloklangan')),
  },
  { title: '', key: 'actions', width: 110, render: (r) => h(NButton, { size: 'small', onClick: () => open(r) }, () => 'Tahrirlash') },
]
const roleOptions = ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r }))
</script>

<template>
  <div>
    <PageHeader title="Hodimlar" subtitle="Quyuvchilar, pishka stroy, CHPU, yig'uvchilar, sifat nazorati, omborchi va sotuv menejerlari. Rol hodim qaysi bo'limda ishlashi va nimalarga ruxsati borligini belgilaydi." tour="users">
      <template #actions>
        <n-button type="primary" data-tour="users-new" @click="open(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Yangi hodim
        </n-button>
      </template>
    </PageHeader>
    <n-card size="small" data-tour="users-table">
      <n-data-table :columns="columns" :data="data" :loading="pending" :pagination="{ pageSize: 30 }" :scroll-x="1000" :row-key="(r: UserDto) => r._id" size="small" />
    </n-card>

    <n-modal v-model:show="modalOpen" preset="card" :title="editingId ? 'Hodimni tahrirlash' : 'Yangi hodim'" class="max-w-xl" :mask-closable="false">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" @submit.prevent="submit">
        <n-form-item label="F.I.Sh." path="fullName"><n-input v-model:value="form.fullName" /></n-form-item>
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <n-form-item label="Login" path="username"><n-input v-model:value="form.username" :input-props="{ autocomplete: 'off' }" /></n-form-item>
          <n-form-item :label="editingId ? 'Yangi parol (ixtiyoriy)' : 'Parol'" path="password">
            <n-input v-model:value="form.password" type="password" show-password-on="click" :input-props="{ autocomplete: 'new-password' }" />
          </n-form-item>
          <n-form-item label="Rol"><n-select v-model:value="form.role" :options="roleOptions" /></n-form-item>
          <n-form-item label="Bo'lim (ish joyi)"><LocationSelect v-model="form.location" clearable /></n-form-item>
          <n-form-item label="Telefon"><n-input v-model:value="form.phone" /></n-form-item>
          <n-form-item label="Holat"><n-checkbox v-model:checked="form.active">Faol</n-checkbox></n-form-item>
        </div>
        <n-button type="primary" attr-type="submit" block :loading="saving">Saqlash</n-button>
      </n-form>
    </n-modal>
  </div>
</template>
