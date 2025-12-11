/**
 * IndexedDB Storage for Large TLE Datasets
 * Handles efficient storage and retrieval of satellite TLE data
 */

class IndexedDBStorage {
  private dbName: string
  private dbVersion: number
  private db: IDBDatabase | null
  private tleStoreName: string
  private settingsStoreName: string
  private credentialsStoreName: string
  private transponderStoreName: string
  private passPredictionStoreName: string
  private satcatStoreName: string
  private satnogsInfoStoreName: string

  constructor() {
    this.dbName = 'SatTrackDB'
    this.dbVersion = 5
    this.db = null
    this.tleStoreName = 'tleData'
    this.settingsStoreName = 'settings'
    this.credentialsStoreName = 'credentials'
    this.transponderStoreName = 'transponderData'
    this.passPredictionStoreName = 'passPredictions'
    this.satcatStoreName = 'satcatData'
    this.satnogsInfoStoreName = 'satnogsInfo'
  }

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
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
        const db = (event.target as IDBOpenDBRequest).result

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

        // Create transponder data store
        if (!db.objectStoreNames.contains(this.transponderStoreName)) {
          const transponderStore = db.createObjectStore(this.transponderStoreName, { keyPath: 'noradId' })
          transponderStore.createIndex('timestamp', 'timestamp', { unique: false })
          console.log('Transponder data store created')
        }

        // Create pass prediction store
        if (!db.objectStoreNames.contains(this.passPredictionStoreName)) {
          const passStore = db.createObjectStore(this.passPredictionStoreName, { keyPath: 'id' })
          passStore.createIndex('noradId', 'noradId', { unique: false })
          passStore.createIndex('nextPassTime', 'nextPassTime', { unique: false })
          passStore.createIndex('timestamp', 'timestamp', { unique: false })
          console.log('Pass prediction store created')
        }

        // Create SATCAT data store
        if (!db.objectStoreNames.contains(this.satcatStoreName)) {
          const satcatStore = db.createObjectStore(this.satcatStoreName, { keyPath: 'noradId' })
          satcatStore.createIndex('timestamp', 'timestamp', { unique: false })
          console.log('SATCAT data store created')
        }

        // Create SatNOGS info store (launchDate/operator/countries/etc.)
        if (!db.objectStoreNames.contains(this.satnogsInfoStoreName)) {
          const satnogsStore = db.createObjectStore(this.satnogsInfoStoreName, { keyPath: 'noradId' })
          satnogsStore.createIndex('timestamp', 'timestamp', { unique: false })
          console.log('SatNOGS info store created')
        }
      }
    })
  }

  /**
   * Ensure database is initialized
   */
  async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }

  /**
   * Store TLE data for multiple satellites
   */
  async storeTLEData(tleData: Record<string, any>, timestamp: string): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.tleStoreName], 'readwrite')
      const store = transaction.objectStore(this.tleStoreName)

      // Clear existing data first
      store.clear()

      // Store each satellite's TLE data
      const promises = Object.entries(tleData).map(([noradId, data]) => {
        return new Promise<void>((resolveEntry, rejectEntry) => {
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
   */
  async getTLEData(): Promise<{ data: Record<number, any>; timestamp: string } | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.tleStoreName], 'readonly')
      const store = transaction.objectStore(this.tleStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result
        if (results.length === 0) {
          resolve(null)
          return
        }

        // Convert array back to object keyed by NORAD ID
        const tleData: Record<number, any> = {}
        let latestTimestamp: string | null = null

        results.forEach((item: any) => {
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
          timestamp: latestTimestamp || ''
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
   */
  async getSatelliteTLEData(noradId: number): Promise<any | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.tleStoreName], 'readonly')
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
   */
  async storeCredentials(credentials: { username: string; password: string; satnogsToken?: string; n2yoApiKey?: string }): Promise<void> {
    await this.ensureDB()

    try {
      // Import secure storage utility
      const secureStorage = (await import('./secureStorage')).default

      // Encrypt sensitive data
      const encryptedUsername = credentials.username ? await secureStorage.encrypt(credentials.username) : ''
      const encryptedPassword = credentials.password ? await secureStorage.encrypt(credentials.password) : ''
      const encryptedSatnogsToken = credentials.satnogsToken ? await secureStorage.encrypt(credentials.satnogsToken) : ''
      const encryptedN2yoApiKey = credentials.n2yoApiKey ? await secureStorage.encrypt(credentials.n2yoApiKey) : ''

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.credentialsStoreName], 'readwrite')
        const store = transaction.objectStore(this.credentialsStoreName)

        const request = store.put({
          id: 'credentials',
          username: encryptedUsername,
          password: encryptedPassword,
          satnogsToken: encryptedSatnogsToken,
          n2yoApiKey: encryptedN2yoApiKey,
          timestamp: new Date().toISOString()
        })

        request.onsuccess = () => {
          console.log('🔐 Encrypted credentials stored in IndexedDB')
          resolve()
        }

        request.onerror = () => {
          console.error('Failed to store credentials:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Failed to encrypt credentials:', error)
      throw new Error('Failed to encrypt credentials')
    }
  }

  /**
   * Clear all credentials
   */
  async clearCredentials(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.credentialsStoreName], 'readwrite')
      const store = transaction.objectStore(this.credentialsStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('All credentials cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear credentials:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Retrieve encrypted credentials
   */
  async getCredentials(): Promise<{ username: string; password: string; satnogsToken: string; n2yoApiKey: string } | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.credentialsStoreName], 'readonly')
      const store = transaction.objectStore(this.credentialsStoreName)
      const request = store.get('credentials')

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          ;(async () => {
            // Import secure storage utility
            const secureStorage = (await import('./secureStorage')).default

            // Decrypt sensitive data (handles empty strings and unencrypted data gracefully)
            const decryptedUsername = result.username ? await secureStorage.decrypt(result.username) : ''
            const decryptedPassword = result.password ? await secureStorage.decrypt(result.password) : ''
            const decryptedSatnogsToken = result.satnogsToken ? await secureStorage.decrypt(result.satnogsToken) : ''
            const decryptedN2yoApiKey = result.n2yoApiKey ? await secureStorage.decrypt(result.n2yoApiKey) : ''

            console.log('🔓 Decrypted credentials retrieved from IndexedDB')
            resolve({
              username: decryptedUsername,
              password: decryptedPassword,
              satnogsToken: decryptedSatnogsToken,
              n2yoApiKey: decryptedN2yoApiKey
            })
          })().catch(error => {
            console.error('Failed to decrypt credentials:', error)
            // If decryption fails completely, return empty credentials
            // User will need to re-enter them
            console.log('⚠️ Decryption failed, returning empty credentials')
            resolve({
              username: '',
              password: '',
              satnogsToken: '',
              n2yoApiKey: ''
            })
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
   */
  async storeSettings(settings: Record<string, any>): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.settingsStoreName], 'readwrite')
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
   */
  async getSettings(): Promise<Record<string, any>> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.settingsStoreName], 'readonly')
      const store = transaction.objectStore(this.settingsStoreName)
      const request = store.get('settings')

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // Remove metadata fields
          const { id: _id, timestamp: _timestamp, ...settings } = result
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
   */
  async clearTLEData(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.tleStoreName], 'readwrite')
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
   * Clear TLE data for specific satellite
   */
  async clearTLEDataForSatellite(noradId: number): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.tleStoreName], 'readwrite')
      const store = transaction.objectStore(this.tleStoreName)
      const request = store.delete(noradId)

      request.onsuccess = () => {
        console.log(`TLE data cleared for satellite ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to clear TLE data for satellite ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<any> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      // Get actual data sizes from our stores
      const getStoreSize = (storeName: string): Promise<number> => {
        return new Promise((resolveStore, rejectStore) => {
          const transaction = this.db!.transaction([storeName], 'readonly')
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
      ]).then(([tleSize, settingsSize, credentialsSize]: [number, number, number]) => {
        const totalBytes = tleSize + settingsSize + credentialsSize

        // Also get browser storage quota info
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(estimate => {
            const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024)
            const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024)

            // Format our data sizes appropriately
            const formatSize = (bytes: number): string => {
              if (bytes < 1024) return bytes + ' B'
              if (bytes < 1024 * 1024) return Math.round(bytes / 1024 * 100) / 100 + ' KB'
              return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB'
            }

            resolve({
              available: quotaMB + ' MB',
              used: usedMB + ' MB',
              percentage: Math.round(((estimate.usage || 0) / (estimate.quota || 1)) * 100) + '%',
              ourData: {
                total: formatSize(totalBytes),
                tle: formatSize(tleSize),
                settings: formatSize(settingsSize),
                credentials: formatSize(credentialsSize)
              }
            })
          }).catch(() => {
            // Fallback if quota estimation fails
            const formatSize = (bytes: number): string => {
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
          const formatSize = (bytes: number): string => {
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
   */
  async getCacheStatus(maxAgeHours = 6): Promise<any> {
    try {
      const tleData = await this.getTLEData()
      if (!tleData) {
        return { exists: false, age: null, status: 'none' }
      }

      const cacheTime = new Date(tleData.timestamp)
      const now = new Date()
      const ageHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60)

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
   * Store transponder data for a specific satellite
   */
  async storeTransponderData(noradId: string, data: any): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.transponderStoreName], 'readwrite')
      const store = transaction.objectStore(this.transponderStoreName)

      const transponderRecord = {
        noradId: noradId,
        data: data,
        timestamp: new Date().toISOString()
      }

      const request = store.put(transponderRecord)

      request.onsuccess = () => {
        console.log(`Transponder data stored for NORAD ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to store transponder data for NORAD ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store transponder data for multiple satellites
   */
  async storeAllTransponderData(transponderData: Record<string, any>): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.transponderStoreName], 'readwrite')
      const store = transaction.objectStore(this.transponderStoreName)

      const timestamp = new Date().toISOString()
      let completed = 0
      const total = Object.keys(transponderData).length

      if (total === 0) {
        resolve()
        return
      }

      Object.entries(transponderData).forEach(([noradId, data]) => {
        const transponderRecord = {
          noradId: noradId,
          data: data,
          timestamp: timestamp
        }

        const request = store.put(transponderRecord)

        request.onsuccess = () => {
          completed++
          if (completed === total) {
            console.log(`All transponder data stored for ${total} satellites`)
            resolve()
          }
        }

        request.onerror = () => {
          console.error(`Failed to store transponder data for NORAD ${noradId}:`, request.error)
          reject(request.error)
        }
      })
    })
  }

  /**
   * Store all transmitter data for multiple satellites
   */
  async storeAllTransmitterData(transmitterData: Record<string, any>): Promise<void> {
    console.log('=== IndexedDB storeAllTransmitterData START ===')
    console.log('DB version:', this.dbVersion)
    console.log('Transponder store name:', this.transponderStoreName)
    console.log('Transmitter data keys:', Object.keys(transmitterData))

    await this.ensureDB()

    return new Promise((resolve, reject) => {
      console.log('Creating transaction for store:', this.transponderStoreName)
      const transaction = this.db!.transaction([this.transponderStoreName], 'readwrite')
      const store = transaction.objectStore(this.transponderStoreName)

      const timestamp = new Date().toISOString()
      let completed = 0
      const total = Object.keys(transmitterData).length

      console.log(`Storing ${total} transmitter records`)

      if (total === 0) {
        console.log('No transmitter data to store')
        resolve()
        return
      }

      Object.entries(transmitterData).forEach(([noradId, data]) => {
        const transmitterRecord = {
          noradId: noradId,
          data: data,
          timestamp: timestamp,
          type: 'transmitter' // Mark as transmitter data
        }

        console.log(`Storing transmitter record for NORAD ${noradId}:`, transmitterRecord)
        const request = store.put(transmitterRecord)

        request.onsuccess = () => {
          completed++
          console.log(`✓ Stored transmitter data for NORAD ${noradId} (${completed}/${total})`)
          if (completed === total) {
            console.log(`✓ All transmitter data stored for ${total} satellites`)
            console.log('=== IndexedDB storeAllTransmitterData END ===')
            resolve()
          }
        }

        request.onerror = () => {
          console.error(`✗ Failed to store transmitter data for NORAD ${noradId}:`, request.error)
          reject(request.error)
        }
      })
    })
  }

  /**
   * Get transponder data for a specific satellite
   */
  async getTransponderData(noradId: string): Promise<any | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.transponderStoreName], 'readonly')
      const store = transaction.objectStore(this.transponderStoreName)
      const request = store.get(noradId)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error(`Failed to get transponder data for NORAD ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all stored transponder data
   */
  async getAllTransponderData(): Promise<any[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.transponderStoreName], 'readonly')
      const store = transaction.objectStore(this.transponderStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('Failed to get all transponder data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all transponder data
   */
  async clearTransponderData(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.transponderStoreName], 'readwrite')
      const store = transaction.objectStore(this.transponderStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('All transponder data cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear transponder data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear transponder data for specific satellite
   */
  async clearTransponderDataForSatellite(noradId: number): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.transponderStoreName], 'readwrite')
      const store = transaction.objectStore(this.transponderStoreName)
      const request = store.delete(noradId)

      request.onsuccess = () => {
        console.log(`Transponder data cleared for satellite ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to clear transponder data for satellite ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store pass prediction data
   */
  async storePassPredictions(noradId: number, passes: any[], observerLocation: any): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.passPredictionStoreName], 'readwrite')
      const store = transaction.objectStore(this.passPredictionStoreName)

      const passData = {
        id: `${noradId}-${observerLocation.lat}-${observerLocation.lng}`,
        noradId,
        observerLocation,
        passes,
        nextPassTime: passes.length > 0 ? passes[0].startTime : null,
        timestamp: Date.now()
      }

      const request = store.put(passData)

      request.onsuccess = () => {
        console.log(`Stored pass predictions for NORAD ID: ${noradId}`)
        console.log(`📊 Stored ${passes.length} passes in database`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to store pass predictions for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Retrieve pass prediction data
   */
  async getPassPredictions(noradId: number, observerLocation: any): Promise<any | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.passPredictionStoreName], 'readonly')
      const store = transaction.objectStore(this.passPredictionStoreName)
      const id = `${noradId}-${observerLocation.lat}-${observerLocation.lng}`
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error(`Failed to get pass predictions for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all pass predictions sorted by next pass time
   */
  async getAllPassPredictions(): Promise<any[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.passPredictionStoreName], 'readonly')
      const store = transaction.objectStore(this.passPredictionStoreName)
      const index = store.index('nextPassTime')
      const request = index.getAll()

      request.onsuccess = () => {
        const result = request.result || []
        console.log('📊 getAllPassPredictions raw result:', result)
        console.log('📊 getAllPassPredictions result length:', result.length)

        // Filter out expired passes and sort by next pass time
        const validPasses = result
          .filter(pass => {
            console.log(`📊 Filtering pass for NORAD ${pass.noradId}:`, {
              hasNextPassTime: !!pass.nextPassTime,
              nextPassTime: pass.nextPassTime,
              timestamp: pass.timestamp,
              ageInHours: pass.timestamp ? (Date.now() - pass.timestamp) / (1000 * 60 * 60) : 'no timestamp'
            })

            // Keep passes that haven't ended yet (more lenient filtering)
            if (!pass.nextPassTime) {
              console.log(`📊 Filtering out pass for NORAD ${pass.noradId}: no nextPassTime`)
              return false
            }

            // For now, just check if the pass data exists and is recent
            const isValid = pass.timestamp && (Date.now() - pass.timestamp) < (24 * 60 * 60 * 1000) // Within 24 hours
            console.log(`📊 Pass for NORAD ${pass.noradId} is valid:`, isValid)
            return isValid
          })
          .sort((a, b) => a.nextPassTime - b.nextPassTime)

        console.log('📊 getAllPassPredictions filtered result:', validPasses)
        console.log('📊 getAllPassPredictions valid passes count:', validPasses.length)

        resolve(validPasses)
      }

      request.onerror = () => {
        console.error('Failed to get all pass predictions:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear pass prediction data
   */
  async clearPassPredictions(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.passPredictionStoreName], 'readwrite')
      const store = transaction.objectStore(this.passPredictionStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('Pass prediction data cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear pass prediction data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear pass prediction data for a specific satellite
   */
  async clearPassPredictionsForSatellite(noradId: number): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.passPredictionStoreName], 'readwrite')
      const store = transaction.objectStore(this.passPredictionStoreName)
      const index = store.index('noradId')
      const request = index.openCursor(IDBKeyRange.only(noradId))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          console.log(`Pass prediction data cleared for NORAD ID: ${noradId}`)
          resolve()
        }
      }

      request.onerror = () => {
        console.error(`Failed to clear pass prediction data for NORAD ID: ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store SATCAT data for a satellite
   */
  async storeSatcatData(noradId: number, satcatData: any): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satcatStoreName], 'readwrite')
      const store = transaction.objectStore(this.satcatStoreName)

      const data = {
        noradId,
        data: satcatData,
        timestamp: Date.now()
      }

      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`Stored SATCAT data for NORAD ID: ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to store SATCAT data for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Retrieve SATCAT data for a satellite
   */
  async getSatcatData(noradId: number): Promise<any | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satcatStoreName], 'readonly')
      const store = transaction.objectStore(this.satcatStoreName)
      const request = store.get(noradId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error(`Failed to get SATCAT data for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all SATCAT data
   */
  async getAllSatcatData(): Promise<any[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satcatStoreName], 'readonly')
      const store = transaction.objectStore(this.satcatStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('Failed to get all SATCAT data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear SATCAT data for a specific satellite
   */
  async clearSatcatData(noradId: number): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satcatStoreName], 'readwrite')
      const store = transaction.objectStore(this.satcatStoreName)
      const request = store.delete(noradId)

      request.onsuccess = () => {
        console.log(`SATCAT data cleared for NORAD ID: ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to clear SATCAT data for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all SATCAT data
   */
  async clearAllSatcatData(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satcatStoreName], 'readwrite')
      const store = transaction.objectStore(this.satcatStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('All SATCAT data cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear all SATCAT data:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store SatNOGS satellite info (launchDate/operator/countries/etc.)
   */
  async storeSatnogsInfo(noradId: number, satnogsData: any): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satnogsInfoStoreName], 'readwrite')
      const store = transaction.objectStore(this.satnogsInfoStoreName)

      const data = {
        noradId,
        data: satnogsData,
        timestamp: Date.now()
      }

      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`Stored SatNOGS info for NORAD ID: ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to store SatNOGS info for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Retrieve SatNOGS satellite info
   */
  async getSatnogsInfo(noradId: number): Promise<any | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satnogsInfoStoreName], 'readonly')
      const store = transaction.objectStore(this.satnogsInfoStoreName)
      const request = store.get(noradId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error(`Failed to get SatNOGS info for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear SatNOGS info for a specific satellite
   */
  async clearSatnogsInfo(noradId: number): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satnogsInfoStoreName], 'readwrite')
      const store = transaction.objectStore(this.satnogsInfoStoreName)
      const request = store.delete(noradId)

      request.onsuccess = () => {
        console.log(`SatNOGS info cleared for NORAD ID: ${noradId}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to clear SatNOGS info for NORAD ID ${noradId}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all SatNOGS info
   */
  async clearAllSatnogsInfo(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.satnogsInfoStoreName], 'readwrite')
      const store = transaction.objectStore(this.satnogsInfoStoreName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('All SatNOGS info cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear all SatNOGS info:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Close database connection
   */
  close(): void {
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
