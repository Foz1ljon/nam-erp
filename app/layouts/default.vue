<script setup lang="ts">
import type { MenuOption } from 'naive-ui'
import { NBadge } from 'naive-ui'
import {
  ArchiveOutline,
  BarChartOutline,
  BriefcaseOutline,
  BuildOutline,
  BusinessOutline,
  CartOutline,
  ColorPaletteOutline,
  ConstructOutline,
  CubeOutline,
  FlameOutline,
  FlashOutline,
  HammerOutline,
  KeyOutline,
  LayersOutline,
  LogOutOutline,
  MenuOutline,
  PeopleOutline,
  PricetagsOutline,
  BookOutline,
  CloseOutline,
  ShieldCheckmarkOutline,
  SpeedometerOutline,
  SwapHorizontalOutline,
} from '@vicons/ionicons5'
import type { Component, VNode } from 'vue'
import type { Stage } from '#shared/utils/stages'
import { NuxtLink } from '#components'

const route = useRoute()
const { user, can, logout } = useAuth()
const refs = useRefsStore()
await refs.load()

// Screen classes (CSS decides visibility so server and client render the same markup):
//  < md (768px)  : sidebar hidden, burger opens a drawer
//  md … < xl     : icon rail (collapsed sidebar)
//  ≥ xl (1280px) : full sidebar; the user's collapse choice is remembered
const collapsed = ref(false)
const mobileOpen = ref(false)
const passwordOpen = ref(false)
const SIDER_KEY = 'nm-sider-collapsed'

function applyScreen() {
  if (window.innerWidth < 1280) {
    collapsed.value = true
    return
  }
  try {
    collapsed.value = localStorage.getItem(SIDER_KEY) === '1'
  } catch {
    collapsed.value = false
  }
}
function setCollapsed(value: boolean) {
  collapsed.value = value
  if (window.innerWidth >= 1280) {
    try {
      localStorage.setItem(SIDER_KEY, value ? '1' : '0')
    } catch {
      // storage unavailable — the choice just isn't remembered
    }
  }
}
onMounted(applyScreen)
useEventListener('resize', useDebounceFn(() => {
  if (window.innerWidth >= 768) mobileOpen.value = false
  applyScreen()
}, 150))

// Unread client conversations (Telegram/Instagram) for the menu badge.
const unread = ref(0)
const canInbox = computed(() => can('crm.use') || can('channels.use'))
async function loadUnread() {
  if (!canInbox.value) return
  try {
    unread.value = (await $fetch<{ data: { conversations: number } }>('/api/inbox/unread')).data.conversations
  } catch {
    // ignore transient errors; the next tick retries
  }
}
onMounted(loadUnread)
useIntervalFn(loadUnread, 30_000)

const STAGE_ICONS: Record<Stage, Component> = {
  casting: FlameOutline,
  cleaning: HammerOutline,
  cnc: BuildOutline,
  winding: FlashOutline,
  assembly: ConstructOutline,
  painting: ColorPaletteOutline,
  packaging: PricetagsOutline,
}

// Short menu names so nothing is cut off in the sidebar.
const STAGE_MENU_LABELS: Record<Stage, string> = {
  casting: 'Liteyka (quyish)',
  cleaning: 'Pishka stroy',
  cnc: 'CHPU (rezba)',
  winding: 'Obmotka',
  assembly: "Yig'ish",
  painting: "Bo'yash",
  packaging: 'Birka va qadoq',
}

function link(to: string, label: string): () => VNode {
  return () => h(NuxtLink, { to }, { default: () => label })
}

const menuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [{ key: '/', label: link('/', 'Bosh sahifa'), icon: renderIcon(SpeedometerOutline) }]

  if (can('production.view')) {
    options.push({
      key: 'production',
      label: 'Ishlab chiqarish',
      icon: renderIcon(LayersOutline),
      children: [
        { key: '/production', label: link('/production', 'Jarayon oqimi') },
        ...STAGES.filter((s) => can(`stage.${s}`) || can('production.view')).map((s) => ({
          key: `/production/${s}`,
          label: link(`/production/${s}`, STAGE_MENU_LABELS[s]),
          icon: renderIcon(STAGE_ICONS[s]),
        })),
      ],
    })
  }
  if (can('qc.manage') || can('production.view')) {
    options.push({ key: '/qc', label: link('/qc', 'Sifat nazorati'), icon: renderIcon(ShieldCheckmarkOutline) })
  }
  if (can('transfers.use')) {
    options.push({ key: '/transfers', label: link('/transfers', 'Topshirish / qabul'), icon: renderIcon(SwapHorizontalOutline) })
  }
  if (can('stock.view')) {
    options.push({
      key: 'warehouse',
      label: 'Ombor',
      icon: renderIcon(ArchiveOutline),
      children: [
        { key: '/warehouse/stock', label: link('/warehouse/stock', 'Qoldiqlar') },
        { key: '/warehouse/receipts', label: link('/warehouse/receipts', 'Kirim (xarid)') },
        { key: '/warehouse/adjustments', label: link('/warehouse/adjustments', 'Inventarizatsiya') },
        { key: '/warehouse/moves', label: link('/warehouse/moves', 'Harakatlar jurnali') },
        { key: '/warehouse/serials', label: link('/warehouse/serials', 'Seriya raqamlari') },
      ],
    })
  }
  if (can('sales.view') || can('crm.use')) {
    const children: MenuOption[] = []
    if (can('crm.use')) children.push({ key: '/crm/leads', label: link('/crm/leads', 'Lidlar') })
    if (canInbox.value) {
      children.push({
        key: '/crm/inbox',
        label: () =>
          h('div', { class: 'flex items-center justify-between gap-2 pr-2' }, [
            link('/crm/inbox', 'Xabarlar')(),
            unread.value ? h(NBadge, { value: unread.value, max: 99, type: 'info' }) : null,
          ]),
      })
    }
    children.push({ key: '/crm/clients', label: link('/crm/clients', 'Mijozlar') })
    if (can('sales.view')) children.push({ key: '/sales', label: link('/sales', 'Sotuv buyurtmalari') })
    if (can('channels.use')) children.push({ key: '/crm/channels', label: link('/crm/channels', 'Telegram / Instagram') })
    options.push({ key: 'sales', label: 'Sotuv va CRM', icon: renderIcon(CartOutline), children })
  }
  options.push({
    key: 'catalog',
    label: "Ma'lumotnomalar",
    icon: renderIcon(CubeOutline),
    children: [
      { key: '/catalog/items', label: link('/catalog/items', 'Mahsulotlar') },
      { key: '/catalog/counterparties', label: link('/catalog/counterparties', 'Kontragentlar') },
      { key: '/catalog/locations', label: link('/catalog/locations', "Bo'limlar") },
    ],
  })
  if (can('reports.view')) {
    options.push({ key: '/reports', label: link('/reports', 'Hisobotlar'), icon: renderIcon(BarChartOutline) })
  }
  if (can('users.manage')) {
    options.push({ key: '/users', label: link('/users', 'Hodimlar'), icon: renderIcon(PeopleOutline) })
  }
  return options
})

const activeKey = computed(() => {
  const path = route.path
  if (path.startsWith('/sales')) return '/sales'
  if (path.startsWith('/crm/leads')) return '/crm/leads'
  if (path.startsWith('/crm/clients')) return '/crm/clients'
  return path
})

/** Group that contains the current page — only that one is expanded. */
const activeGroup = computed(() => {
  const p = route.path
  if (p.startsWith('/production')) return 'production'
  if (p.startsWith('/warehouse')) return 'warehouse'
  if (p.startsWith('/crm') || p.startsWith('/sales')) return 'sales'
  if (p.startsWith('/catalog')) return 'catalog'
  return null
})
const expandedKeys = ref<string[]>(activeGroup.value ? [activeGroup.value] : [])
watch(activeGroup, (g) => {
  // Accordion: opening the current page's group closes the others.
  if (g && !expandedKeys.value.includes(g)) expandedKeys.value = [g]
})

const userOptions = [
  { key: 'welcome', label: 'Tanishtiruv', icon: renderIcon(BookOutline) },
  { key: 'password', label: "Parolni o'zgartirish", icon: renderIcon(KeyOutline) },
  { key: 'logout', label: 'Chiqish', icon: renderIcon(LogOutOutline) },
]

function onUserSelect(key: string) {
  if (key === 'logout') logout()
  if (key === 'password') passwordOpen.value = true
  if (key === 'welcome') navigateTo('/welcome')
}

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})
</script>

<template>
  <n-layout has-sider class="nm-shell">
    <!-- Sidebar: icon rail on tablets, full on desktop, hidden on phones -->
    <n-layout-sider
      bordered
      inverted
      collapse-mode="width"
      :collapsed-width="64"
      :width="248"
      :collapsed="collapsed"
      show-trigger="bar"
      :native-scrollbar="false"
      class="no-print hidden! md:flex!"
      data-tour="sidebar"
      @collapse="setCollapsed(true)"
      @expand="setCollapsed(false)"
    >
      <NuxtLink to="/" class="flex h-14 items-center gap-2 px-5 text-white no-underline" :class="collapsed ? 'justify-center px-0!' : ''" aria-label="Bosh sahifa">
        <n-icon size="26" color="#60a5fa"><BusinessOutline /></n-icon>
        <span v-if="!collapsed" class="text-lg font-bold tracking-tight">NamMotors <span class="text-blue-400">ERP</span></span>
      </NuxtLink>
      <n-menu
        v-model:expanded-keys="expandedKeys"
        accordion
        inverted
        :value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :indent="18"
        :options="menuOptions"
      />
    </n-layout-sider>

    <!-- Phone: slide-in menu -->
    <!-- The dark background sits on the drawer itself: the scroll container inside has no fixed height,
         so a "min-h-full" child would only be as tall as the menu. -->
    <n-drawer v-model:show="mobileOpen" placement="left" width="min(300px, 86vw)" class="no-print bg-slate-900!">
      <n-drawer-content body-content-style="padding:0" :native-scrollbar="false">
        <div class="flex min-h-dvh flex-col bg-slate-900">
          <div class="flex h-14 items-center justify-between px-4">
            <NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold text-white no-underline">
              <n-icon size="24" color="#60a5fa"><BusinessOutline /></n-icon>
              NamMotors <span class="text-blue-400">ERP</span>
            </NuxtLink>
            <n-button quaternary circle aria-label="Menyuni yopish" @click="mobileOpen = false">
              <template #icon><n-icon color="#cbd5e1"><CloseOutline /></n-icon></template>
            </n-button>
          </div>
          <n-menu v-model:expanded-keys="expandedKeys" accordion inverted :value="activeKey" :options="menuOptions" :indent="18" class="flex-1" />
          <div class="border-t border-slate-700/70 p-4">
            <div class="flex items-center gap-3">
              <n-avatar round class="bg-blue-600!">{{ user?.fullName?.charAt(0) }}</n-avatar>
              <div class="min-w-0 flex-1 leading-tight">
                <div class="truncate text-sm font-medium text-white">{{ user?.fullName }}</div>
                <div class="truncate text-xs text-slate-400">{{ user ? ROLE_LABELS[user.role] : '' }}</div>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-2">
              <n-button size="small" ghost color="#cbd5e1" @click="navigateTo('/welcome')">Tanishtiruv</n-button>
              <n-button size="small" ghost color="#cbd5e1" @click="passwordOpen = true; mobileOpen = false">Parol</n-button>
              <n-button size="small" ghost color="#f87171" @click="logout">Chiqish</n-button>
            </div>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>

    <n-layout>
      <n-layout-header bordered class="no-print flex h-14 items-center justify-between gap-2 px-2 sm:px-4">
        <div class="flex min-w-0 items-center gap-1">
          <n-button quaternary circle aria-label="Menyuni ochish" class="md:hidden!" @click="mobileOpen = true">
            <template #icon><n-icon size="22"><MenuOutline /></n-icon></template>
          </n-button>
          <NuxtLink to="/" class="truncate text-base font-bold text-slate-900 no-underline md:hidden">NamMotors <span class="text-blue-600">ERP</span></NuxtLink>
          <span class="hidden truncate text-sm text-slate-500 lg:inline">Elektr dvigatel va suv nasoslari ishlab chiqarish</span>
        </div>
        <n-dropdown trigger="click" :options="userOptions" @select="onUserSelect">
          <n-button quaternary aria-label="Foydalanuvchi menyusi" data-tour="user-menu" class="px-1! sm:px-2!">
            <div class="flex items-center gap-2">
              <n-avatar round size="small" class="bg-blue-600!">{{ user?.fullName?.charAt(0) }}</n-avatar>
              <div class="hidden text-left leading-tight sm:block">
                <div class="max-w-40 truncate text-sm font-medium">{{ user?.fullName }}</div>
                <div class="max-w-40 truncate text-xs text-slate-500">{{ user ? ROLE_LABELS[user.role] : '' }}</div>
              </div>
            </div>
          </n-button>
        </n-dropdown>
      </n-layout-header>

      <n-layout-content :native-scrollbar="false" class="nm-content" content-class="p-3 sm:p-4 xl:p-6">
        <slot />
      </n-layout-content>
    </n-layout>

    <ChangePasswordModal v-model:show="passwordOpen" />

    <!-- AI assistant lives in the bottom-right corner on every page (the /ai page is its full-screen view). -->
    <ClientOnly>
      <AiAssistantWidget v-if="can('ai.use') && route.path !== '/ai'" />
    </ClientOnly>
  </n-layout>
</template>
