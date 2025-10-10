/**
 * IndexedDB Storage for Large TLE Datasets
 * Handles efficient storage and retrieval of satellite TLE data
 */

class IndexedDBStorage {
  constructor() {
    this.dbName = 'SatTrackDB'
    this.dbVersion = 1
    this.db = null
    this.tleStoreName = 'tleData'
    this.settingsStoreName = 'settings'
    this.credentialsStoreName = 'credentials'
  }

  /**
   * Initialize IndexedDB connection
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create TLE data store
        if (!db.objectStoreNames.contains(this.tleStoreName)) {
          const tleStore = db.createObjectStore(this.tleStoreName, { keyPath: 'noradId' })
          tleStore.createIndex('timestamp', 'timestamp', { unique: false })
          tleStore.createIndex('name', 'name', { unique: false })
          console.log('TLE data store created')
        }

        // Create settings store
        if (!db.objectStoreNames.contains(this.settingsStoreName)) {
          db.createObjectStore(this.settingsStoreName, { keyPath: 'id' })
          console.log('Settings store created')
        }

        // Create credentials store
        if (!db.objectStoreNames.contains(this.credentialsStoreName)) {
          db.createObjectStore(this.credentialsStoreName, { keyPath: 'id' })
          console.log('Credentials store created')
        }
      }
    })
  }

  /**
   * Ensure database is initialized
   * @returns {Promise<void>}
   */
  async ensureDB() {
    if (!this.db) {
      await this.init()
    }
  }

  /**
   * Store TLE data for multiple satellites
   * @param {Object} tleData - TLE data object keyed by NORAD ID
   * @param {string} timestamp - ISO timestamp
   * @returns {Promise<void>}
   */
  async storeTLEData(tleData, timestamp) {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tleStoreName], 'readwrite')
      const store = transaction.objectStore(this.tleStoreName)

      // Clear existing data first
      store.clear()

      // Store each satellite's TLE data
      const promises = Object.entries(tleData).map(([noradId, data]) => {
        return new Promise((resolveEntry, rejectEntry) => {
          const request = store.add({
            noradId: parseInt(noradId),
            name: data.name,
            tle1: data.tle1,
            tle2: data.tle2,
            epoch: data.epoch,
            lastUpdated: data.lastUpdated,
            timestamp: timestamp
          })

          request.onsuccess = () => resolveEntry()
          request.onerror = () => rejectEntry(request.error)
        })
      })

      Promise.all(promises)
        .then(() => {
          console.log(`Stored TLE data for ${Object.keys(tleData).length} satellites`)
          resolve()
        })
        .catch(reject)
    })
  }

  /**
   * Retrieve TLE data for all satellites
   * @returns {Promise<Object|null>} - TLE data object or null
   */
  async getTLEData() {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tleStoreName], 'readonly')
      const store = transaction.objectStore(this.tleStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result
        if (results.length === 0) {
          resolve(null)
          return
        }

        // Convert array back to object keyed by NORAD ID
        const tleData = {}
        let latestTimestamp = null

        results.forEach(item => {
          tleData[item.noradId] = {
            noradId: item.noradId,
            name: item.name,
            tle1: item.tle1,
            tle2: item.tle2,
            epoch: item.epoch,
            lastUpdated: item.lastUpdated
          }

          if (!latestTimestamp || item.timestamp > latestTimestamp) {
            latestTimestamp = item.timestamp
          }
        })

        resolve({
          data: tleData,
          timestamp: latestTimestamp
        })
      }

      request.onerror = () => {
        console.error('Failed to retrieve TLE data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get TLE data for a specific satellite
   * @param {number} noradId - NORAD catalog ID
   * @returns {Promise<Object|null>} - TLE data or null
   */
  async getSatelliteTLEData(noradId) {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tleStoreName], 'readonly')
      const store = transaction.objectStore(this.tleStoreName)
      const request = store.get(noradId)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          resolve({
            noradId: result.noradId,
            name: result.name,
            tle1: result.tle1,
            tle2: result.tle2,
            epoch: result.epoch,
            lastUpdated: result.lastUpdated
          })
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('Failed to retrieve satellite TLE data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store encrypted credentials
   * @param {Object} credentials - { username, password }
   * @returns {Promise<void>}
   */
  async storeCredentials(credentials) {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.credentialsStoreName], 'readwrite')
      const store = transaction.objectStore(this.credentialsStoreName)
      
      const request = store.put({
        id: 'credentials',
        username: credentials.username,
        password: credentials.password,
        timestamp: new Date().toISOString()
      })

      request.onsuccess = () => {
        console.log('Credentials stored in IndexedDB')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to store credentials:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Retrieve encrypted credentials
   * @returns {Promise<Object|null>} - Credentials or null
   */
  async getCredentials() {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.credentialsStoreName], 'readonly')
      const store = transaction.objectStore(this.credentialsStoreName)
      const request = store.get('credentials')

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          resolve({
            username: result.username,
            password: result.password
          })
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('Failed to retrieve credentials:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store general settings
   * @param {Object} settings - Settings object
   * @returns {Promise<void>}
   */
  async storeSettings(settings) {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.settingsStoreName], 'readwrite')
      const store = transaction.objectStore(this.settingsStoreName)
      
      const request = store.put({
        id: 'settings',
        ...settings,
        timestamp: new Date().toISOString()
      })

      request.onsuccess = () => {
        console.log('Settings stored in IndexedDB')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to store settings:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Retrieve general settings
   * @returns {Promise<Object>} - Settings object
   */
  async getSettings() {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.settingsStoreName], 'readonly')
      const store = transaction.objectStore(this.settingsStoreName)
      const request = store.get('settings')

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // Remove metadata fields
          const { id, timestamp, ...settings } = result
          resolve(settings)
        } else {
          resolve({})
        }
      }

      request.onerror = () => {
        console.error('Failed to retrieve settings:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all TLE data
   * @returns {Promise<void>}
   */
  async clearTLEData() {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tleStoreName], 'readwrite')
      const store = transaction.objectStore(this.tleStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('TLE data cleared from IndexedDB')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear TLE data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all credentials
   * @returns {Promise<void>}
   */
  async clearCredentials() {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.credentialsStoreName], 'readwrite')
      const store = transaction.objectStore(this.credentialsStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('Credentials cleared from IndexedDB')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear credentials:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} - Storage usage stats
   */
  async getStorageInfo() {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      // Get actual data sizes from our stores
      const getStoreSize = (storeName) => {
        return new Promise((resolveStore, rejectStore) => {
          const transaction = this.db.transaction([storeName], 'readonly')
          const store = transaction.objectStore(storeName)
          const request = store.getAll()

          request.onsuccess = () => {
            const data = request.result
            const jsonString = JSON.stringify(data)
            const sizeBytes = new Blob([jsonString]).size
            resolveStore(sizeBytes)
          }

          request.onerror = () => {
            rejectStore(request.error)
          }
        })
      }

      // Get sizes for all stores
      Promise.all([
        getStoreSize(this.tleStoreName),
        getStoreSize(this.settingsStoreName),
        getStoreSize(this.credentialsStoreName)
      ]).then(([tleSize, settingsSize, credentialsSize]) => {
        const totalBytes = tleSize + settingsSize + credentialsSize
        const totalMB = Math.round(totalBytes / 1024 / 1024 * 100) / 100

        // Also get browser storage quota info
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(estimate => {
            const quotaMB = Math.round(estimate.quota / 1024 / 1024)
            const usedMB = Math.round(estimate.usage / 1024 / 1024)
            
            // Format our data sizes appropriately
            const formatSize = (bytes) => {
              if (bytes < 1024) return bytes + ' B'
              if (bytes < 1024 * 1024) return Math.round(bytes / 1024 * 100) / 100 + ' KB'
              return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB'
            }

            resolve({
              available: quotaMB + ' MB',
              used: usedMB + ' MB',
              percentage: Math.round((estimate.usage / estimate.quota) * 100) + '%',
              ourData: {
                total: formatSize(totalBytes),
                tle: formatSize(tleSize),
                settings: formatSize(settingsSize),
                credentials: formatSize(credentialsSize)
              }
            })
          }).catch(() => {
            // Fallback if quota estimation fails
            const formatSize = (bytes) => {
              if (bytes < 1024) return bytes + ' B'
              if (bytes < 1024 * 1024) return Math.round(bytes / 1024 * 100) / 100 + ' KB'
              return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB'
            }

            resolve({
              available: 'Unknown',
              used: 'Unknown',
              percentage: 'Unknown',
              ourData: {
                total: formatSize(totalBytes),
                tle: formatSize(tleSize),
                settings: formatSize(settingsSize),
                credentials: formatSize(credentialsSize)
              }
            })
          })
        } else {
          // Fallback if storage API not available
          const formatSize = (bytes) => {
            if (bytes < 1024) return bytes + ' B'
            if (bytes < 1024 * 1024) return Math.round(bytes / 1024 * 100) / 100 + ' KB'
            return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB'
          }

          resolve({
            available: 'Unknown',
            used: 'Unknown',
            percentage: 'Unknown',
            ourData: {
              total: formatSize(totalBytes),
              tle: formatSize(tleSize),
              settings: formatSize(settingsSize),
              credentials: formatSize(credentialsSize)
            }
          })
        }
      }).catch(error => {
        console.error('Failed to calculate storage sizes:', error)
        reject(error)
      })
    })
  }

  /**
   * Check if TLE data exists and is fresh
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {Promise<Object>} - Cache status info
   */
  async getCacheStatus(maxAgeHours = 6) {
    try {
      const tleData = await this.getTLEData()
      if (!tleData) {
        return { exists: false, age: null, status: 'none' }
      }

      const cacheTime = new Date(tleData.timestamp)
      const now = new Date()
      const ageHours = (now - cacheTime) / (1000 * 60 * 60)

      let status = 'stale'
      if (ageHours < 0.5) {
        status = 'fresh'
      } else if (ageHours > maxAgeHours) {
        status = 'expired'
      }

      return {
        exists: true,
        age: Math.round(ageHours * 60), // age in minutes
        status: status,
        timestamp: tleData.timestamp
      }
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return { exists: false, age: null, status: 'error' }
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('IndexedDB connection closed')
    }
  }
}

// Create singleton instance
const indexedDBStorage = new IndexedDBStorage()

export default indexedDBStorage
