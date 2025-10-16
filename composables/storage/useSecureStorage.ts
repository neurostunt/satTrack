/**
 * Secure Storage Composable
 * Handles encrypted storage of sensitive data and TLE caching
 * Uses IndexedDB for large TLE datasets and localStorage for smaller data
 */

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
   * Generate a simple encryption key from device fingerprint
   */
  const generateKey = async (): Promise<CryptoKey> => {
    // Create a device-specific key based on user agent and screen resolution
    const deviceInfo = `${navigator.userAgent}-${screen.width}x${screen.height}`
    const encoder = new TextEncoder()
    const data = encoder.encode(deviceInfo)

    // Create a hash and use it as key material
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt data using AES-GCM
   */
  const encrypt = async (data: string): Promise<string> => {
    try {
      const key = await generateKey()
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12))

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)

      // Convert to base64
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  const decrypt = async (encryptedData: string): Promise<string> => {
    try {
      const key = await generateKey()

      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encryptedBuffer = combined.slice(12)

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
      )

      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
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
      return JSON.parse(decryptedData)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Retrieval failed'
      console.error('Encrypted retrieval error:', err)
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
