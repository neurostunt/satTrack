/**
 * Secure Storage Composable
 * Handles encrypted storage of sensitive data and TLE caching
 * Uses IndexedDB for large TLE datasets and localStorage for smaller data
 * Uses crypto-js for cross-platform encryption (works on iPhone, Android, desktop)
 */

import CryptoJS from 'crypto-js'
import { ref, readonly } from 'vue'
import { useIndexedDB } from '../storage/useIndexedDB'
import type { StorageSettings, StorageStats } from '~/types/storage'

export const useSecureStorage = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const isEncrypted = ref<boolean>(true)

  // Use IndexedDB composable
  const indexedDB = useIndexedDB()

  // Storage keys
  const storageKey = 'sattrack-secure'
  const tleCacheKey = 'sattrack-tle-cache'
  const settingsKey = 'sattrack-settings'

  /**
   * Generate encryption key from device fingerprint using crypto-js
   * This ensures the same device can decrypt its own data
   */
  const generateKey = (): string => {
    // Create a device-specific key based on user agent and screen resolution
    const deviceInfo = `${navigator.userAgent}-${screen.width}x${screen.height}`
    // Use SHA256 to create a consistent key from device info
    return CryptoJS.SHA256(deviceInfo).toString()
  }

  /**
   * Encrypt data using AES encryption (crypto-js)
   * Works on all platforms including iPhone Safari/Chrome
   */
  const encrypt = async (data: string): Promise<string> => {
    // Handle empty data
    if (!data || data.trim().length === 0) {
      return ''
    }

    try {
      const key = generateKey()
      
      // Encrypt using AES with crypto-js
      // This handles UTF-8 properly and works everywhere
      const encrypted = CryptoJS.AES.encrypt(data, key).toString()
      
      // Verify encryption worked
      if (!encrypted || encrypted.length === 0) {
        throw new Error('Encryption produced empty result')
      }
      
      return encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Decrypt data using AES decryption (crypto-js)
   * Works on all platforms including iPhone Safari/Chrome
   */
  const decrypt = async (encryptedData: string): Promise<string> => {
    // Handle empty or null data
    if (!encryptedData || encryptedData.trim().length === 0) {
      return ''
    }

    try {
      const key = generateKey()
      
      // Decrypt using AES with crypto-js
      // This handles UTF-8 properly and works everywhere
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key)
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
      
      // If decryption failed (wrong key or corrupted data), decryptedText will be empty
      if (!decryptedText || decryptedText.length === 0) {
        // Try returning as-is in case it's old unencrypted data
        console.warn('Decryption produced empty result, returning original data')
        return encryptedData
      }
      
      return decryptedText
    } catch (error) {
      console.error('Decryption failed:', error)
      // If decryption fails, return the data as-is (might be unencrypted old data)
      // This allows the app to continue working with old data
      return encryptedData
    }
  }

  /**
   * Store encrypted data in localStorage
   */
  const storeEncrypted = async (key: string, data: any): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const jsonData = JSON.stringify(data)
      const encryptedData = await encrypt(jsonData)
      localStorage.setItem(key, encryptedData)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Storage failed'
      console.error('Encrypted storage error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  const retrieveEncrypted = async (key: string): Promise<any> => {
    try {
      isLoading.value = true
      error.value = null

      const encryptedData = localStorage.getItem(key)
      if (!encryptedData) return null

      const decryptedData = await decrypt(encryptedData)
      
      // Check if decryption actually failed (returned encrypted data instead of decrypted)
      // Encrypted data typically starts with "U2FsdGVkX1" (base64 encoded "Salted__")
      if (decryptedData && decryptedData.startsWith('U2FsdGVkX1')) {
        console.warn('Decryption failed - data appears to still be encrypted. Clearing corrupted data.')
        // Clear corrupted data from storage
        localStorage.removeItem(key)
        return null
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(decryptedData)
      } catch (parseError) {
        console.error('Failed to parse decrypted data as JSON:', parseError)
        // If it's not valid JSON, it might be corrupted - clear it
        localStorage.removeItem(key)
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Retrieval failed'
      console.error('Encrypted retrieval error:', err)
      // Clear potentially corrupted data
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore clear errors
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Store TLE data in IndexedDB
   */
  const storeTLEData = async (tleData: any[]): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      await indexedDB.storeTLEData(tleData)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'TLE storage failed'
      console.error('TLE storage error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Retrieve TLE data from IndexedDB
   */
  const getTLEData = async (): Promise<any[]> => {
    try {
      isLoading.value = true
      error.value = null

      return await indexedDB.getTLEData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'TLE retrieval failed'
      console.error('TLE retrieval error:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Store settings
   */
  const storeSettings = async (settings: StorageSettings): Promise<void> => {
    try {
      await storeEncrypted(settingsKey, settings)
    } catch (err) {
      console.error('Settings storage error:', err)
      throw err
    }
  }

  /**
   * Retrieve settings
   */
  const getSettings = async (): Promise<StorageSettings | null> => {
    try {
      return await retrieveEncrypted(settingsKey)
    } catch (err) {
      console.error('Settings retrieval error:', err)
      return null
    }
  }

  /**
   * Store credentials
   */
  const storeCredentials = async (credentials: { username: string; password: string; token: string }): Promise<void> => {
    try {
      await storeEncrypted(storageKey, credentials)
    } catch (err) {
      console.error('Credentials storage error:', err)
      throw err
    }
  }

  /**
   * Retrieve credentials
   */
  const getCredentials = async (): Promise<{ username: string; password: string; token: string } | null> => {
    try {
      return await retrieveEncrypted(storageKey)
    } catch (err) {
      console.error('Credentials retrieval error:', err)
      return null
    }
  }

  /**
   * Clear all stored data
   */
  const clearAll = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      localStorage.removeItem(storageKey)
      localStorage.removeItem(tleCacheKey)
      localStorage.removeItem(settingsKey)

      await indexedDB.clearTLEData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Clear failed'
      console.error('Clear storage error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get storage statistics
   */
  const getStorageStats = async (): Promise<StorageStats> => {
    try {
      const tleData = await getTLEData()
      const settings = await getSettings()
      const credentials = await getCredentials()

      return {
        totalSatellites: tleData.length,
        totalTransmitters: 0,
        totalTLEEntries: tleData.length,
        lastUpdated: Date.now(),
        storageSize: JSON.stringify({ tleData, settings, credentials }).length
      }
    } catch (err) {
      console.error('Storage stats error:', err)
      return {
        totalSatellites: 0,
        totalTransmitters: 0,
        totalTLEEntries: 0,
        lastUpdated: Date.now(),
        storageSize: 0
      }
    }
  }

  /**
   * Clear error state
   */
  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    isEncrypted: readonly(isEncrypted),

    // Methods
    storeEncrypted,
    retrieveEncrypted,
    storeTLEData,
    getTLEData,
    storeSettings,
    getSettings,
    storeCredentials,
    getCredentials,
    clearAll,
    getStorageStats,
    clearError
  }
}
