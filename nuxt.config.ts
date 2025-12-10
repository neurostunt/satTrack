export default defineNuxtConfig({
  compatibilityDate: '2025-10-10',
  devtools: { enabled: true },
  ssr: false, // Disable SSR globally to prevent hydration issues
  devServer: {
    host: '0.0.0.0', // Listen on all network interfaces for phone testing
    port: 3000
  },

  // Runtime configuration - accessible via useRuntimeConfig()
  runtimeConfig: {
    // Public keys (exposed to client-side)
    // Note: These are from .env file which is gitignored, so it's safe to expose
    public: {
      // API Keys
      n2yoApiKey: process.env.N2YO_API_KEY || '',
      satnogsToken: process.env.SATNOGS_API_TOKEN || '',

      // Space-Track credentials (from gitignored .env file)
      spaceTrackUsername: process.env.SPACE_TRACK_USERNAME || '',
      spaceTrackPassword: process.env.SPACE_TRACK_PASSWORD || '',

      // API Base URLs
      n2yoBaseUrl: process.env.N2YO_BASE_URL || 'https://api.n2yo.com/rest/v1/satellite',
      spaceTrackBaseUrl: process.env.SPACE_TRACK_BASE_URL || 'https://www.space-track.org',
      satnogsBaseUrl: process.env.SATNOGS_BASE_URL || 'https://db.satnogs.org/api'
    }
  },
  imports: {
    dirs: [
      'composables/**'
    ]
  },
  modules: [
    '@vite-pwa/nuxt',
    '@unocss/nuxt'
  ],
  vite: {
    server: {
      watch: {
        usePolling: true, // Use polling to avoid EMFILE error on macOS
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**', '**/.output/**']
      }
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: undefined, // Disable navigate fallback to prevent route blocking
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: false, // Disable PWA in dev to avoid service worker issues
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/.*/],
      type: 'module'
    },
    manifest: {
      name: 'SatTrack - Satellite Tracker',
      short_name: 'SatTrack',
      description: 'Track satellites in real-time',
      theme_color: '#1a1a1a',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: []
    }
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'SatTrack - Satellite Tracker',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Track satellites in real-time' },
        { name: 'theme-color', content: '#1a1a1a' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'SatTrack' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'msapplication-TileColor', content: '#1a1a1a' },
        { name: 'msapplication-config', content: '/browserconfig.xml' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ]
    }
  },
  unocss: {
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
  }
})
