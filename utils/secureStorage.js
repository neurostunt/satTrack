/**
 * Secure Storage Utilities
 * Handles encrypted storage of sensitive data and TLE caching
 * Uses IndexedDB for large TLE datasets and localStorage for smaller data
 */

import indexedDBStorage from './indexedDBStorage.js'

// Simple encryption/decryption using Web Crypto API
class SecureStorage {
  constructor() {
    this.storageKey = 'sattrack-secure'
    this.tleCacheKey = 'sattrack-tle-cache'
    this.settingsKey = 'sattrack-settings'
  }

  /**
   * Generate a simple encryption key from device fingerprint
   * @returns {Promise<CryptoKey>}
   */
  async generateKey() {
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
   * @param {string} data - Data to encrypt
   * @returns {Promise<string>} - Encrypted data as base64
   */
  async encrypt(data) {
    try {
      const key = await this.generateKey()
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
      )
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      
      // Convert to base64
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption failed:', error)
      // Fallback to base64 encoding (not secure but better than plain text)
      return btoa(data)
    }
  }

  /**
   * Decrypt data using AES-GCM
   * @param {string} encryptedData - Encrypted data as base64
   * @returns {Promise<string>} - Decrypted data
   */
  async decrypt(encryptedData) {
    try {
      const key = await this.generateKey()
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      )
      
      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      // Fallback to base64 decoding
      try {
        return atob(encryptedData)
      } catch {
        return encryptedData
      }
    }
  }

  /**
   * Store encrypted credentials using IndexedDB
   * @param {Object} credentials - { username, password }
   */
  async storeCredentials(credentials) {
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
   * @returns {Promise<Object|null>} - { username, password } or null
   */
  async getCredentials() {
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
  async clearCredentials() {
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
   * @param {Object} tleData - Processed TLE data
   * @param {string} timestamp - ISO timestamp
   */
  async storeTLECache(tleData, timestamp) {
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
   * @returns {Promise<Object|null>} - Cached TLE data or null
   */
  async getTLECache() {
    try {
      // Try IndexedDB first
      const indexedDBData = await indexedDBStorage.getTLEData()
      if (indexedDBData) {
        // Check if cache is still valid (less than 6 hours old)
        const cacheTime = new Date(indexedDBData.timestamp)
        const now = new Date()
        const ageHours = (now - cacheTime) / (1000 * 60 * 60)
        
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
      const ageHours = (now - cacheTime) / (1000 * 60 * 60)
      
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
  async clearTLECache() {
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
   * @param {Object} settings - Settings object
   */
  async storeSettings(settings) {
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
   * @returns {Promise<Object>} - Settings object
   */
  async getSettings() {
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
   * @returns {Promise<boolean>}
   */
  async hasCredentials() {
    const credentials = await this.getCredentials()
    return !!(credentials && credentials.username && credentials.password)
  }

  /**
   * Get storage usage info from both IndexedDB and localStorage
   * @returns {Promise<Object>} - Storage usage statistics
   */
  async getStorageInfo() {
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
