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

  /**
   * Load credentials from .env file (via runtime config) or IndexedDB
   * Priority: .env file > IndexedDB
   */
  const loadCredentials = async (): Promise<Credentials> => {
    try {
      // Get runtime config from .env file (if available)
      const config = useRuntimeConfig()

      // Check if .env file has credentials
      const hasEnvCredentials =
        config.public.n2yoApiKey ||
        config.public.spaceTrackUsername ||
        config.public.satnogsToken

      if (hasEnvCredentials) {
        console.log('🔧 Found credentials in .env file')

        const credentials: Credentials = {
          spaceTrackUsername: config.public.spaceTrackUsername || '',
          spaceTrackPassword: config.public.spaceTrackPassword || '',
          satnogsToken: config.public.satnogsToken || '',
          n2yoApiKey: config.public.n2yoApiKey || ''
        }

        // Store .env credentials in IndexedDB for future use
        if (credentials.spaceTrackUsername || credentials.n2yoApiKey) {
          console.log('💾 Storing .env credentials to IndexedDB...')
          await saveCredentials({
            username: credentials.spaceTrackUsername,
            password: credentials.spaceTrackPassword,
            satnogsToken: credentials.satnogsToken,
            n2yoApiKey: credentials.n2yoApiKey
          })
          console.log('✅ .env credentials saved to IndexedDB')
        }

        return credentials
      }

      // Load from IndexedDB if no .env credentials
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

