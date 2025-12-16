/**
 * Vercel Web Analytics Plugin
 * Tracks page views and user interactions (free tier)
 * Only runs on client-side since SSR is disabled
 */

import { inject } from '@vercel/analytics'

export default defineNuxtPlugin(() => {
  // Inject Vercel Analytics script
  // This will automatically track page views
  inject({
    mode: 'auto', // Automatically detect production/development
    framework: 'nuxt'
  })
})

