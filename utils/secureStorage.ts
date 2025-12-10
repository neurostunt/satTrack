/**
 * Secure Storage Utilities
 * Handles encrypted storage of sensitive data and TLE caching
 * Uses IndexedDB for large TLE datasets and localStorage for smaller data
 * Uses crypto-js for cross-platform encryption (works on iPhone, Android, desktop)
 */

import CryptoJS from 'crypto-js'
import indexedDBStorage from './indexedDBStorage.js'

// Encryption using crypto-js (works everywhere including iPhone)
class SecureStorage {
  private storageKey: string
  private tleCacheKey: string
  private settingsKey: string

  constructor() {
    this.storageKey = 'sattrack-secure'
    this.tleCacheKey = 'sattrack-tle-cache'
    this.settingsKey = 'sattrack-settings'
  }

  /**
   * Generate encryption key from device fingerprint using crypto-js
   * This ensures the same device can decrypt its own data
   */
  private generateKey(): string {
    // Create a device-specific key based on user agent and screen resolution
    const deviceInfo = `${navigator.userAgent}-${screen.width}x${screen.height}`
    // Use SHA256 to create a consistent key from device info
    return CryptoJS.SHA256(deviceInfo).toString()
  }

  /**
   * Encrypt data using AES encryption (crypto-js)
   * Works on all platforms including iPhone Safari/Chrome
   */
  async encrypt(data: string): Promise<string> {
    // Handle empty data
    if (!data || data.trim().length === 0) {
      return ''
    }

    try {
      const key = this.generateKey()
      
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
      // If encryption fails, throw error so caller knows it failed
      // Don't silently fallback to insecure encoding
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Check if a string looks like crypto-js encrypted data
   */
  private isEncrypted(data: string): boolean {
    if (!data || data.length === 0) return false
    // crypto-js encrypted data is base64-like and typically longer
    // It usually starts with U2FsdGVkX1... or similar base64 pattern
    return /^[A-Za-z0-9+/=]+$/.test(data) && data.length > 20
  }

  /**
   * Decrypt data using AES decryption (crypto-js)
   * Works on all platforms including iPhone Safari/Chrome
   */
  async decrypt(encryptedData: string): Promise<string> {
    // Handle empty or null data
    if (!encryptedData || encryptedData.trim().length === 0) {
      return ''
    }

    try {
      // Check if data looks encrypted - if not, return as-is (might be old unencrypted data)
      if (!this.isEncrypted(encryptedData)) {
        console.log('Data does not appear encrypted, returning as-is')
        return encryptedData
      }

      const key = this.generateKey()
      
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
   * Store encrypted credentials using IndexedDB
   */
  async storeCredentials(credentials: { username: string; password: string; satnogsToken?: string }): Promise<void> {
    try {
      // Use IndexedDB for credentials (more secure than localStorage)
      await indexedDBStorage.storeCredentials(credentials)
      console.log('Credentials stored securely in IndexedDB')
    } catch (error) {
      console.error('Failed to store credentials in IndexedDB:', error)
      // Fallback to encrypted localStorage
      try {
        const encrypted = await this.encrypt(JSON.stringify(credentials))
        localStorage.setItem(this.storageKey, encrypted)
        console.log('Credentials stored securely in localStorage (fallback)')
      } catch (fallbackError) {
        console.error('Failed to store credentials:', fallbackError)
        throw fallbackError
      }
    }
  }

  /**
   * Retrieve and decrypt credentials from IndexedDB or localStorage fallback
   */
  async getCredentials(): Promise<{ username: string; password: string; satnogsToken: string } | null> {
    try {
      // Try IndexedDB first
      const indexedDBCredentials = await indexedDBStorage.getCredentials()
      if (indexedDBCredentials) {
        return indexedDBCredentials
      }

      // Fallback to localStorage
      const encrypted = localStorage.getItem(this.storageKey)
      if (!encrypted) return null

      const decrypted = await this.decrypt(encrypted)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Failed to retrieve credentials:', error)
      return null
    }
  }

  /**
   * Clear stored credentials from both IndexedDB and localStorage
   */
  async clearCredentials(): Promise<void> {
    try {
      // Clear from IndexedDB
      await indexedDBStorage.clearCredentials()
    } catch (error) {
      console.error('Failed to clear IndexedDB credentials:', error)
    }

    // Clear from localStorage fallback
    localStorage.removeItem(this.storageKey)
    console.log('Credentials cleared from all storage')
  }

  /**
   * Store TLE data with metadata using IndexedDB
   */
  async storeTLECache(tleData: Record<string, any>, timestamp: string): Promise<void> {
    try {
      // Use IndexedDB for large TLE datasets
      await indexedDBStorage.storeTLEData(tleData, timestamp)
      console.log('TLE data cached in IndexedDB')
    } catch (error) {
      console.error('Failed to cache TLE data:', error)
      // Fallback to localStorage for smaller datasets
      try {
        const cacheData = {
          data: tleData,
          timestamp: timestamp,
          version: '1.0'
        }

        const encrypted = await this.encrypt(JSON.stringify(cacheData))
        localStorage.setItem(this.tleCacheKey, encrypted)
        console.log('TLE data cached in localStorage (fallback)')
      } catch (fallbackError) {
        console.error('Fallback caching also failed:', fallbackError)
      }
    }
  }

  /**
   * Retrieve cached TLE data from IndexedDB or localStorage fallback
   */
  async getTLECache(): Promise<any | null> {
    try {
      // Try IndexedDB first
      const indexedDBData = await indexedDBStorage.getTLEData()
      if (indexedDBData) {
        // Check if cache is still valid (less than 6 hours old)
        const cacheTime = new Date(indexedDBData.timestamp)
        const now = new Date()
        const ageHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60)

        if (ageHours > 6) {
          console.log('IndexedDB TLE cache expired, clearing...')
          await this.clearTLECache()
          return null
        }

        console.log(`TLE cache retrieved from IndexedDB (${Math.round(ageHours * 60)} minutes old)`)
        return indexedDBData
      }

      // Fallback to localStorage
      const encrypted = localStorage.getItem(this.tleCacheKey)
      if (!encrypted) return null

      const decrypted = await this.decrypt(encrypted)
      const cacheData = JSON.parse(decrypted)

      // Check if cache is still valid (less than 6 hours old)
      const cacheTime = new Date(cacheData.timestamp)
      const now = new Date()
      const ageHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60)

      if (ageHours > 6) {
        console.log('localStorage TLE cache expired, clearing...')
        this.clearTLECache()
        return null
      }

      console.log(`TLE cache retrieved from localStorage (${Math.round(ageHours * 60)} minutes old)`)
      return cacheData
    } catch (error) {
      console.error('Failed to retrieve TLE cache:', error)
      return null
    }
  }

  /**
   * Clear TLE cache from both IndexedDB and localStorage
   */
  async clearTLECache(): Promise<void> {
    try {
      // Clear from IndexedDB
      await indexedDBStorage.clearTLEData()
    } catch (error) {
      console.error('Failed to clear IndexedDB TLE cache:', error)
    }

    // Clear from localStorage fallback
    localStorage.removeItem(this.tleCacheKey)
    console.log('TLE cache cleared from all storage')
  }

  /**
   * Store general settings using IndexedDB
   */
  async storeSettings(settings: Record<string, any>): Promise<void> {
    try {
      // Use IndexedDB for settings
      await indexedDBStorage.storeSettings(settings)
      console.log('Settings stored in IndexedDB')
    } catch (error) {
      console.error('Failed to store settings in IndexedDB:', error)
      // Fallback to localStorage
      try {
        // Remove sensitive data before storing
        const safeSettings = { ...settings }
        delete safeSettings.spaceTrackUsername
        delete safeSettings.spaceTrackPassword

        localStorage.setItem(this.settingsKey, JSON.stringify(safeSettings))
        console.log('Settings stored in localStorage (fallback)')
      } catch (fallbackError) {
        console.error('Failed to store settings:', fallbackError)
      }
    }
  }

  /**
   * Retrieve general settings from IndexedDB or localStorage fallback
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      // Try IndexedDB first
      const indexedDBSettings = await indexedDBStorage.getSettings()
      if (indexedDBSettings && Object.keys(indexedDBSettings).length > 0) {
        return indexedDBSettings
      }

      // Fallback to localStorage
      const settings = localStorage.getItem(this.settingsKey)
      return settings ? JSON.parse(settings) : {}
    } catch (error) {
      console.error('Failed to retrieve settings:', error)
      return {}
    }
  }

  /**
   * Check if credentials are stored
   */
  async hasCredentials(): Promise<boolean> {
    const credentials = await this.getCredentials()
    return !!(credentials && credentials.username && credentials.password)
  }

  /**
   * Get storage usage info from both IndexedDB and localStorage
   */
  async getStorageInfo(): Promise<any> {
    try {
      // Get IndexedDB storage info
      const indexedDBInfo = await indexedDBStorage.getStorageInfo()

      // Get localStorage usage
      const credentials = localStorage.getItem(this.storageKey)
      const tleCache = localStorage.getItem(this.tleCacheKey)
      const settings = localStorage.getItem(this.settingsKey)

      const localStorageUsage = (credentials?.length || 0) + (tleCache?.length || 0) + (settings?.length || 0)

      return {
        indexedDB: indexedDBInfo,
        localStorage: {
          credentials: credentials ? credentials.length : 0,
          tleCache: tleCache ? tleCache.length : 0,
          settings: settings ? settings.length : 0,
          total: localStorageUsage
        },
        total: localStorageUsage
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return { error: 'Failed to get storage info' }
    }
  }
}

// Create singleton instance
const secureStorage = new SecureStorage()

export default secureStorage
