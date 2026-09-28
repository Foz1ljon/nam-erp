import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'uz.nammotors.calls',
  appName: "NamMotors Qo'ng'iroqlar",
  webDir: 'dist',
  plugins: {
    // Requests go through the native HTTP stack: no CORS, and self-signed/LAN servers work in development.
    CapacitorHttp: { enabled: true },
  },
}

export default config
