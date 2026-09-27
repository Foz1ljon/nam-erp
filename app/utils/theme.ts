import type { GlobalThemeOverrides } from 'naive-ui'

/** Mirrors the Tailwind @theme tokens in assets/css/main.css. */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#1d4ed8',
    primaryColorHover: '#2563eb',
    primaryColorPressed: '#1e40af',
    primaryColorSuppl: '#2563eb',
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    borderRadius: '6px',
  },
  Card: { borderRadius: '10px' },
  Layout: { siderColor: '#0f172a', headerColor: '#ffffff' },
}
