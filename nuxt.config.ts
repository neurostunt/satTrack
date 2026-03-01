export default defineNuxtConfig({
  compatibilityDate: '2025-10-10',
  devtools: { enabled: true },
  ssr: false,
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  runtimeConfig: {
    public: {
      n2yoApiKey: process.env.N2YO_API_KEY || '',
      satnogsToken: process.env.SATNOGS_API_TOKEN || '',
      spaceTrackUsername: process.env.SPACE_TRACK_USERNAME || '',
      spaceTrackPassword: process.env.SPACE_TRACK_PASSWORD || '',
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
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**', '**/.output/**']
      }
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    strategies: 'generateSW',
    workbox: {
      navigateFallback: undefined,
      navigateFallbackDenylist: [/^\/__nuxt_devtools__/, /^\/__nuxt\//],
      mode: 'production',
      globPatterns: ['**/*.{html,js,css,png,svg,ico,woff,woff2}'],
      globIgnores: [
        '**/node_modules/**/*',
        '**/_nuxt/**/*',
        '**/@vite/**/*',
        '**/entry.*.js',
        '**/client.*.js',
        'sw.js',
        'workbox-*.js'
      ],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      dontCacheBustURLsMatching: /\.\w{8}\./,
      skipWaiting: true,
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => {
            const pathname = url.pathname
            return (
              pathname.startsWith('/_nuxt/') ||
              pathname.startsWith('/__nuxt_devtools__/') ||
              pathname.startsWith('/__nuxt/') ||
              pathname.includes('node_modules') ||
              pathname.includes('/Users/') ||
              pathname.startsWith('/@vite/') ||
              pathname.includes('entry.async.js')
            )
          },
          handler: 'NetworkOnly',
          options: {
            cacheName: 'bypass-cache'
          }
        },
        {
          urlPattern: /^https:\/\/api\.n2yo\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'n2yo-api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 // 1 hour
            }
          }
        }
      ]
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/(?!(__nuxt_devtools__|__nuxt|api|_nuxt|@vite|@fs)).*/],
      type: 'module'
    },
    manifest: {
      name: 'SatTrack - Satellite Tracker',
      short_name: 'SatTrack',
      description: 'Track satellites in real-time',
      theme_color: '#1a1a1a',
      background_color: '#1a1a1a',
      display: 'standalone',
      orientation: 'any',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        }
      ]
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
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '192x192', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  },
})
