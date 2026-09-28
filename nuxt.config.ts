import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['nuxtjs-naive-ui', 'nuxt-auth-utils', '@pinia/nuxt', '@vueuse/nuxt'],

  css: ['~/assets/css/main.css', 'driver.js/dist/driver.css'],

  app: {
    // Smooth page changes (styles in main.css; turned off for prefers-reduced-motion).
    pageTransition: { name: 'page', mode: 'out-in' },
    // Switching between the app shell and full-screen pages (login, introduction).
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      title: 'NamMotors ERP',
      htmlAttrs: { lang: 'uz' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    /** Local fallback; the real connection string lives in .env as NUXT_MONGO_URI. */
    mongoUri: 'mongodb://127.0.0.1:27017/nammotors',
    seedDemo: true,
    /** Show demo accounts (login + password) on the login page. Set NUXT_DEMO_LOGINS=false in production. */
    demoLogins: true,
    /** Public HTTPS address of the ERP (for Telegram/Instagram webhooks). Can also be set in the UI. */
    publicBaseUrl: '',
    /** Call recordings storage (NUXT_CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET; CLOUDINARY_KEY is read as the secret). */
    cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
  },

  imports: {
    presets: [{ from: 'naive-ui', imports: ['useMessage', 'useDialog', 'useNotification', 'useLoadingBar'] }],
  },

  vite: {
    plugins: [
      tailwindcss(),
      Components({ dts: 'app/naive-components.d.ts', resolvers: [NaiveUiResolver()] }),
    ],
    optimizeDeps: {
      include: ['naive-ui', '@vicons/ionicons5'],
    },
  },

  typescript: { strict: true },
})
