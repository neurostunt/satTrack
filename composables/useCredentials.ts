/**
 * Composable for managing API credentials
 * Handles loading from .env file and IndexedDB
 */

import { useIndexedDB } from './storage/useIndexedDB'

export interface Credentials {
  spaceTrackUsername: string
  spaceTrackPassword: string
  satnogsToken: string
  n2yoApiKey: string
}

export const useCredentials = () => {
  const { getCredentials: getStoredCredentials, storeCredentials: saveCredentials } = useIndexedDB()

  const applyEnvCredentials = async (credentials: Credentials): Promise<void> => {
    if (credentials.spaceTrackUsername || credentials.n2yoApiKey || credentials.satnogsToken) {
      console.log('💾 Storing .env credentials to IndexedDB...')
      await saveCredentials({
        username: credentials.spaceTrackUsername,
        password: credentials.spaceTrackPassword,
        satnogsToken: credentials.satnogsToken,
        n2yoApiKey: credentials.n2yoApiKey
      })
      console.log('✅ .env credentials saved to IndexedDB')
    }
  }

  /**
   * Load credentials from .env file (runtime config or /api/env-credentials) or IndexedDB
   * Priority: runtime config > /api/env-credentials > IndexedDB
   */
  const loadCredentials = async (): Promise<Credentials> => {
    try {
      // 1. Try runtime config (baked at build time)
      const config = useRuntimeConfig()
      const hasRuntimeCreds =
        config.public.n2yoApiKey ||
        config.public.spaceTrackUsername ||
        config.public.satnogsToken
      if (hasRuntimeCreds) {
        console.log('🔧 Found credentials in runtime config')
        const credentials: Credentials = {
          spaceTrackUsername: config.public.spaceTrackUsername || '',
          spaceTrackPassword: config.public.spaceTrackPassword || '',
          satnogsToken: config.public.satnogsToken || '',
          n2yoApiKey: config.public.n2yoApiKey || ''
        }
        await applyEnvCredentials(credentials)
        return credentials
      }

      // 2. Fallback: fetch from server API (reads process.env at request time)
      try {
        const apiCreds = await $fetch<Credentials>('/api/env-credentials', { method: 'POST', body: {} })
        const hasApiCreds = apiCreds?.satnogsToken || apiCreds?.n2yoApiKey || apiCreds?.spaceTrackUsername
        if (hasApiCreds) {
          console.log('🔧 Found credentials from /api/env-credentials')
          const credentials: Credentials = {
            spaceTrackUsername: apiCreds.spaceTrackUsername || '',
            spaceTrackPassword: apiCreds.spaceTrackPassword || '',
            satnogsToken: apiCreds.satnogsToken || '',
            n2yoApiKey: apiCreds.n2yoApiKey || ''
          }
          await applyEnvCredentials(credentials)
          return credentials
        }
      } catch (apiErr) {
        console.warn('API env-credentials failed:', apiErr)
      }

      // 3. Load from IndexedDB
      console.log('🔍 Loading credentials from IndexedDB...')
      const storedCredentials = await getStoredCredentials()

      if (storedCredentials) {
        console.log('✅ Credentials loaded from IndexedDB')
        return {
          spaceTrackUsername: storedCredentials.username || '',
          spaceTrackPassword: storedCredentials.password || '',
          satnogsToken: storedCredentials.satnogsToken || '',
          n2yoApiKey: storedCredentials.n2yoApiKey || ''
        }
      }

      console.log('⚠️ No credentials found in .env or IndexedDB')
      return {
        spaceTrackUsername: '',
        spaceTrackPassword: '',
        satnogsToken: '',
        n2yoApiKey: ''
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
      return {
        spaceTrackUsername: '',
        spaceTrackPassword: '',
        satnogsToken: '',
        n2yoApiKey: ''
      }
    }
  }

  /**
   * Save credentials to IndexedDB
   */
  const storeCredentials = async (credentials: Credentials): Promise<void> => {
    try {
      await saveCredentials({
        username: credentials.spaceTrackUsername,
        password: credentials.spaceTrackPassword,
        satnogsToken: credentials.satnogsToken,
        n2yoApiKey: credentials.n2yoApiKey
      })
      console.log('✅ Credentials saved to IndexedDB')
    } catch (error) {
      console.error('Failed to save credentials:', error)
      throw error
    }
  }

  return {
    loadCredentials,
    storeCredentials
  }
}
