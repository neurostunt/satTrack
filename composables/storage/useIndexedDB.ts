/**
 * IndexedDB Composable
 * Handles efficient storage and retrieval of satellite TLE data
 */

import { ref, readonly } from 'vue'

export const useIndexedDB = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const isConnected = ref<boolean>(false)

  // Database configuration
  const dbName = 'SatTrackDB'
  const dbVersion = 2
  const db = ref<IDBDatabase | null>(null)
  const tleStoreName = 'tleData'
  const settingsStoreName = 'settings'
  const credentialsStoreName = 'credentials'
  const transponderStoreName = 'transponderData'

  /**
   * Initialize IndexedDB connection
   */
  const init = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const request = indexedDB.open(dbName, dbVersion)

        request.onerror = () => {
          error.value = request.error?.message || 'IndexedDB failed to open'
          console.error('IndexedDB failed to open:', request.error)
          isLoading.value = false
          reject(request.error)
        }

        request.onsuccess = () => {
          db.value = request.result
          isConnected.value = true
          console.log('IndexedDB opened successfully')
          isLoading.value = false
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result

          // Create TLE data store
          if (!database.objectStoreNames.contains(tleStoreName)) {
            const tleStore = database.createObjectStore(tleStoreName, { keyPath: 'noradId' })
            tleStore.createIndex('timestamp', 'timestamp', { unique: false })
            tleStore.createIndex('name', 'name', { unique: false })
            console.log('TLE data store created')
          }

          // Create settings store
          if (!database.objectStoreNames.contains(settingsStoreName)) {
            database.createObjectStore(settingsStoreName, { keyPath: 'id' })
            console.log('Settings store created')
          }

          // Create credentials store
          if (!database.objectStoreNames.contains(credentialsStoreName)) {
            database.createObjectStore(credentialsStoreName, { keyPath: 'id' })
            console.log('Credentials store created')
          }

          // Create transponder data store
          if (!database.objectStoreNames.contains(transponderStoreName)) {
            const transponderStore = database.createObjectStore(transponderStoreName, { keyPath: 'noradId' })
            transponderStore.createIndex('timestamp', 'timestamp', { unique: false })
            console.log('Transponder data store created')
          }
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'IndexedDB initialization failed'
        console.error('IndexedDB initialization error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Store TLE data
   */
  const storeTLEData = async (tleData: any[]): Promise<void> => {
    if (!db.value) {
      await init()
    }

    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const transaction = db.value!.transaction([tleStoreName], 'readwrite')
        const store = transaction.objectStore(tleStoreName)

        // Clear existing data
        store.clear()

        // Add new data
        tleData.forEach((tle) => {
          store.add({
            ...tle,
            timestamp: Date.now()
          })
        })

        transaction.oncomplete = () => {
          console.log(`Stored ${tleData.length} TLE entries`)
          isLoading.value = false
          resolve()
        }

        transaction.onerror = () => {
          error.value = transaction.error?.message || 'TLE storage failed'
          console.error('TLE storage error:', transaction.error)
          isLoading.value = false
          reject(transaction.error)
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'TLE storage failed'
        console.error('TLE storage error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Retrieve TLE data
   */
  const getTLEData = async (): Promise<any[]> => {
    if (!db.value) {
      await init()
    }

    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const transaction = db.value!.transaction([tleStoreName], 'readonly')
        const store = transaction.objectStore(tleStoreName)
        const request = store.getAll()

        request.onsuccess = () => {
          const data = request.result || []
          console.log(`Retrieved ${data.length} TLE entries`)
          isLoading.value = false
          resolve(data)
        }

        request.onerror = () => {
          error.value = request.error?.message || 'TLE retrieval failed'
          console.error('TLE retrieval error:', request.error)
          isLoading.value = false
          reject(request.error)
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'TLE retrieval failed'
        console.error('TLE retrieval error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Store transponder data
   */
  const storeTransponderData = async (noradId: number, data: any): Promise<void> => {
    if (!db.value) {
      await init()
    }

    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const transaction = db.value!.transaction([transponderStoreName], 'readwrite')
        const store = transaction.objectStore(transponderStoreName)

        store.put({
          noradId,
          data,
          timestamp: Date.now()
        })

        transaction.oncomplete = () => {
          console.log(`Stored transponder data for NORAD ID: ${noradId}`)
          isLoading.value = false
          resolve()
        }

        transaction.onerror = () => {
          error.value = transaction.error?.message || 'Transponder storage failed'
          console.error('Transponder storage error:', transaction.error)
          isLoading.value = false
          reject(transaction.error)
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Transponder storage failed'
        console.error('Transponder storage error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Retrieve transponder data
   */
  const getTransponderData = async (noradId: number): Promise<any | null> => {
    if (!db.value) {
      await init()
    }

    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const transaction = db.value!.transaction([transponderStoreName], 'readonly')
        const store = transaction.objectStore(transponderStoreName)
        const request = store.get(noradId)

        request.onsuccess = () => {
          const result = request.result
          isLoading.value = false
          resolve(result ? result.data : null)
        }

        request.onerror = () => {
          error.value = request.error?.message || 'Transponder retrieval failed'
          console.error('Transponder retrieval error:', request.error)
          isLoading.value = false
          reject(request.error)
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Transponder retrieval failed'
        console.error('Transponder retrieval error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Get all transponder data
   */
  const getAllTransponderData = async (): Promise<any[]> => {
    if (!db.value) {
      await init()
    }

    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const transaction = db.value!.transaction([transponderStoreName], 'readonly')
        const store = transaction.objectStore(transponderStoreName)
        const request = store.getAll()

        request.onsuccess = () => {
          const result = request.result || []
          isLoading.value = false
          resolve(result)
        }

        request.onerror = () => {
          error.value = request.error?.message || 'All transponder retrieval failed'
          console.error('All transponder retrieval error:', request.error)
          isLoading.value = false
          reject(request.error)
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'All transponder retrieval failed'
        console.error('All transponder retrieval error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Clear TLE data
   */
  const clearTLEData = async (): Promise<void> => {
    if (!db.value) {
      await init()
    }

    return new Promise((resolve, reject) => {
      try {
        isLoading.value = true
        error.value = null

        const transaction = db.value!.transaction([tleStoreName], 'readwrite')
        const store = transaction.objectStore(tleStoreName)

        store.clear()

        transaction.oncomplete = () => {
          console.log('TLE data cleared')
          isLoading.value = false
          resolve()
        }

        transaction.onerror = () => {
          error.value = transaction.error?.message || 'TLE clear failed'
          console.error('TLE clear error:', transaction.error)
          isLoading.value = false
          reject(transaction.error)
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'TLE clear failed'
        console.error('TLE clear error:', err)
        isLoading.value = false
        reject(err)
      }
    })
  }

  /**
   * Get detailed storage information
   */
  const getStorageInfo = async (): Promise<any> => {
    if (!db.value) {
      await init()
    }

    try {
      const stats = await getStats()
      const tleData = await getTLEData()
      const transponderData = await getAllTransponderData()

      // Calculate storage size (approximate)
      const tleSize = JSON.stringify(tleData).length
      const transponderSize = JSON.stringify(transponderData).length
      const totalSize = tleSize + transponderSize

      return {
        ...stats,
        totalSatellites: stats.tleCount,
        totalTransmitters: stats.transponderCount,
        totalTLEEntries: stats.tleCount,
        lastUpdated: new Date().toISOString(),
        storageSize: totalSize,
        tleSize,
        transponderSize
      }
    } catch (err) {
      console.error('Storage info error:', err)
      return {
        totalSatellites: 0,
        totalTransmitters: 0,
        totalTLEEntries: 0,
        lastUpdated: new Date().toISOString(),
        storageSize: 0,
        tleSize: 0,
        transponderSize: 0
      }
    }
  }

  /**
   * Clear transponder data only
   */
  const clearTransmitterData = async (): Promise<void> => {
    if (!db.value) {
      await init()
    }

    try {
      isLoading.value = true
      error.value = null

      const transaction = db.value!.transaction([transponderStoreName], 'readwrite')
      const store = transaction.objectStore(transponderStoreName)
      store.clear()

      console.log('Transponder data cleared')
      isLoading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Clear transponder data failed'
      console.error('Clear transponder data error:', err)
      isLoading.value = false
      throw err
    }
  }

  /**
   * Clear all data
   */
  const clearAll = async (): Promise<void> => {
    if (!db.value) {
      await init()
    }

    try {
      isLoading.value = true
      error.value = null

      const storeNames = [tleStoreName, settingsStoreName, credentialsStoreName, transponderStoreName]

      for (const storeName of storeNames) {
        const transaction = db.value!.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        store.clear()
      }

      console.log('All IndexedDB data cleared')
      isLoading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Clear all failed'
      console.error('Clear all error:', err)
      isLoading.value = false
      throw err
    }
  }

  /**
   * Get database statistics
   */
  const getStats = async (): Promise<{ tleCount: number; transponderCount: number }> => {
    if (!db.value) {
      await init()
    }

    try {
      const tleData = await getTLEData()

      // Count transponder data
      const transaction = db.value!.transaction([transponderStoreName], 'readonly')
      const store = transaction.objectStore(transponderStoreName)
      const countRequest = store.count()

      return new Promise((resolve, reject) => {
        countRequest.onsuccess = () => {
          resolve({
            tleCount: tleData.length,
            transponderCount: countRequest.result
          })
        }

        countRequest.onerror = () => {
          reject(countRequest.error)
        }
      })
    } catch (err) {
      console.error('Stats error:', err)
      return { tleCount: 0, transponderCount: 0 }
    }
  }

  /**
   * Close database connection
   */
  const close = (): void => {
    if (db.value) {
      db.value.close()
      db.value = null
      isConnected.value = false
      console.log('IndexedDB connection closed')
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
    isConnected: readonly(isConnected),

    // Methods
    init,
    storeTLEData,
    getTLEData,
    storeTransponderData,
    getTransponderData,
    getAllTransponderData,
    getStorageInfo,
    clearTLEData,
    clearTransmitterData,
    clearAll,
    getStats,
    close,
    clearError
  }
}
