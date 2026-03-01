import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons()
  ],
  theme: {
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49'
      },
      space: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617'
      }
    }
  },
  shortcuts: {
    'btn-primary': 'px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors',
    'btn-secondary': 'px-4 py-2 bg-space-700 text-white rounded-lg hover:bg-space-600 transition-colors',
    'card': 'bg-space-800 border border-space-700 rounded-xl p-6',
    'card-hover': 'card hover:border-primary-500 transition-colors',
    'satellite-glow': 'shadow-lg shadow-primary-500/20',
    'space-gradient': 'bg-gradient-to-br from-space-950 via-space-900 to-space-950'
  }
})
