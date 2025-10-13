/**
 * TLE Data Composable
 * Manages satellite TLE data fetching and caching with secure storage
 */

import spaceTrackAPI from '~/utils/spaceTrackApi.js'
import secureStorage from '~/utils/secureStorage.js'

export const useTLEData = () => {
  const tleData = ref({})
  const isLoading = ref(false)
  const lastUpdate = ref(null)
  const error = ref(null)
  const isOffline = ref(false)
  const cacheStatus = ref('none') // 'none', 'fresh', 'stale', 'offline'

  /**
   * Load TLE data from cache
   * @returns {Promise<boolean>} - Success status
   */
  const loadFromCache = async () => {
    try {
      const cacheData = await secureStorage.getTLECache()
      if (cacheData && cacheData.data) {
        tleData.value = cacheData.data
        lastUpdate.value = cacheData.timestamp

        // Determine cache status
        const cacheTime = new Date(cacheData.timestamp)
        const now = new Date()
        const ageMinutes = (now - cacheTime) / (1000 * 60)

        if (ageMinutes < 30) {
          cacheStatus.value = 'fresh'
        } else if (ageMinutes < 360) { // 6 hours
          cacheStatus.value = 'stale'
        } else {
          cacheStatus.value = 'none'
          return false
        }

        console.log(`TLE data loaded from cache (${Math.round(ageMinutes)} minutes old)`)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to load from cache:', error)
      return false
    }
  }

  /**
   * Save TLE data to cache
   * @param {Object} data - TLE data to cache
   */
  const saveToCache = async (data) => {
    try {
      const timestamp = new Date().toISOString()
      await secureStorage.storeTLECache(data, timestamp)
      console.log('TLE data saved to cache')
    } catch (error) {
      console.error('Failed to save to cache:', error)
    }
  }

  /**
   * Check if TLE data needs refresh
   * @returns {boolean} - Whether refresh is needed
   */
  const needsRefresh = () => {
    if (!lastUpdate.value) return true

    const updateTime = new Date(lastUpdate.value)
    const now = new Date()
    const ageMinutes = (now - updateTime) / (1000 * 60)

    // Refresh if older than 2 hours
    return ageMinutes > 120
  }
  /**
   * Fetch TLE data from SatNOGS as backup
   * @param {Array} satellites - Array of satellite objects with noradId
   * @param {string} satnogsToken - SatNOGS API token
   * @returns {Promise<Array>} - TLE data array
   */
  const fetchTLEDataFromSatNOGS = async (satellites, satnogsToken) => {
    if (!satnogsToken) {
      throw new Error('SatNOGS API token is required for backup TLE data')
    }

    const tleData = {}
    const noradIds = satellites.map(sat => sat.noradId)

    console.log('Fetching TLE data from SatNOGS backup for NORAD IDs:', noradIds)

    // Fetch TLE data for each satellite from SatNOGS
    for (const noradId of noradIds) {
      try {
        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            token: satnogsToken,
            action: 'tle',
            noradId: noradId
          }
        })

        if (response.success && response.data && response.data.length > 0) {
          const tleRecord = response.data[0]
          tleData[noradId] = {
            tle0: tleRecord.tle0,
            tle1: tleRecord.tle1,
            tle2: tleRecord.tle2,
            norad_cat_id: tleRecord.norad_cat_id,
            updated: tleRecord.updated,
            source: 'satnogs'
          }
          console.log(`✓ SatNOGS TLE data fetched for NORAD ${noradId}`)
        } else {
          console.warn(`✗ No SatNOGS TLE data found for NORAD ${noradId}`)
        }
      } catch (error) {
        console.error(`✗ Error fetching SatNOGS TLE data for NORAD ${noradId}:`, error)
      }
    }

    return Object.values(tleData)
  }

  /**
   * Fetch TLE data for tracked satellites with hybrid approach (Space-Track primary, SatNOGS backup)
   * @param {Array} satellites - Array of satellite objects with noradId
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   * @param {string} satnogsToken - SatNOGS API token for backup
   * @param {boolean} forceRefresh - Force refresh even if cache is fresh
   */
  const fetchTLEData = async (satellites, username, password, satnogsToken = null, forceRefresh = false) => {
    if (!satellites || satellites.length === 0) {
      console.warn('No satellites to fetch TLE data for')
      return
    }

    // Try to load from cache first if not forcing refresh
    if (!forceRefresh && !needsRefresh()) {
      const cacheLoaded = await loadFromCache()
      if (cacheLoaded) {
        console.log('Using cached TLE data')
        return
      }
    }

    isLoading.value = true
    error.value = null
    isOffline.value = false

    try {
      let rawTLEData = []
      let dataSource = 'unknown'

      // Try Space-Track.org first (primary source)
      if (username && password) {
        try {
          console.log('Attempting to fetch TLE data from Space-Track.org (primary source)...')

          // Login if not already logged in
          if (!spaceTrackAPI.getSessionStatus()) {
            const loginSuccess = await spaceTrackAPI.login(username, password)
            if (!loginSuccess) {
              throw new Error('Failed to login to Space-Track.org')
            }
          }

          // Extract NORAD IDs
          const noradIds = satellites.map(sat => sat.noradId)

          // Fetch TLE data from Space-Track.org
          rawTLEData = await spaceTrackAPI.fetchTLEData(noradIds, username, password)
          dataSource = 'space-track'
          console.log('✓ TLE data successfully fetched from Space-Track.org')
        } catch (spaceTrackError) {
          console.warn('Space-Track.org failed, trying SatNOGS backup:', spaceTrackError.message)

          // Fallback to SatNOGS if Space-Track fails
          if (satnogsToken) {
            try {
              rawTLEData = await fetchTLEDataFromSatNOGS(satellites, satnogsToken)
              dataSource = 'satnogs'
              console.log('✓ TLE data successfully fetched from SatNOGS backup')
            } catch (satnogsError) {
              console.error('Both Space-Track.org and SatNOGS failed:', satnogsError.message)
              throw new Error(`TLE data fetch failed from both sources. Space-Track: ${spaceTrackError.message}, SatNOGS: ${satnogsError.message}`)
            }
          } else {
            throw new Error(`Space-Track.org failed and no SatNOGS token provided for backup: ${spaceTrackError.message}`)
          }
        }
      } else if (satnogsToken) {
        // If no Space-Track credentials, try SatNOGS directly
        console.log('No Space-Track credentials, fetching TLE data from SatNOGS...')
        rawTLEData = await fetchTLEDataFromSatNOGS(satellites, satnogsToken)
        dataSource = 'satnogs'
        console.log('✓ TLE data successfully fetched from SatNOGS')
      } else {
        throw new Error('Either Space-Track.org credentials or SatNOGS token is required')
      }

      // Process and store TLE data
      const processedData = {}
      rawTLEData.forEach(tle => {
        // Handle different data formats from Space-Track vs SatNOGS
        const noradId = tle.NORAD_CAT_ID || tle.norad_cat_id
        const name = tle.OBJECT_NAME || tle.tle0 || `Satellite ${noradId}`
        const tle1 = tle.TLE_LINE1 || tle.tle1
        const tle2 = tle.TLE_LINE2 || tle.tle2
        const epoch = tle.EPOCH || tle.updated

        processedData[noradId] = {
          noradId: noradId,
          name: name,
          tle1: tle1,
          tle2: tle2,
          epoch: epoch,
          lastUpdated: new Date().toISOString(),
          source: dataSource
        }
      })

      tleData.value = processedData
      lastUpdate.value = new Date().toISOString()
      cacheStatus.value = 'fresh'

      // Save to cache
      await saveToCache(processedData)

      console.log(`TLE data updated successfully from ${dataSource}:`, Object.keys(processedData).length, 'satellites')

    } catch (err) {
      console.error('TLE data fetch failed:', err.message)
      error.value = err.message

      // Try to load from cache as fallback
      const cacheLoaded = await loadFromCache()
      if (cacheLoaded) {
        console.log('Using cached data as fallback')
        isOffline.value = true
        cacheStatus.value = 'offline'
        error.value = `Network error: ${err.message}. Using cached data.`
      } else {
        throw err
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get TLE data for a specific satellite
   * @param {number} noradId - NORAD catalog ID
   * @returns {Object|null} - TLE data or null
   */
  const getTLEData = (noradId) => {
    return tleData.value[noradId] || null
  }

  /**
   * Check if TLE data is available for a satellite
   * @param {number} noradId - NORAD catalog ID
   * @returns {boolean} - Data availability
   */
  const hasTLEData = (noradId) => {
    return !!tleData.value[noradId]
  }

  /**
   * Get all available TLE data
   * @returns {Object} - All TLE data
   */
  const getAllTLEData = () => {
    return tleData.value
  }

  /**
   * Clear all TLE data and cache
   */
  const clearTLEData = () => {
    tleData.value = {}
    lastUpdate.value = null
    error.value = null
    isOffline.value = false
    cacheStatus.value = 'none'
    secureStorage.clearTLECache()
  }

  /**
   * Initialize TLE data (load from cache or fetch)
   * @param {Array} satellites - Array of satellite objects
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   */
  const initializeTLEData = async (satellites, username, password) => {
    // Try to load from cache first
    const cacheLoaded = await loadFromCache()
    if (cacheLoaded) {
      console.log('TLE data initialized from cache')
      return
    }

    // If no cache or cache is stale, fetch fresh data
    if (username && password) {
      try {
        await fetchTLEData(satellites, username, password)
      } catch (error) {
        console.error('Failed to initialize TLE data:', error)
      }
    }
  }

  /**
   * Get data freshness info
   * @returns {Object} - Freshness information
   */
  const getDataFreshness = () => {
    if (!lastUpdate.value) {
      return {
        isFresh: false,
        age: null,
        status: cacheStatus.value,
        isOffline: isOffline.value
      }
    }

    const now = new Date()
    const updateTime = new Date(lastUpdate.value)
    const ageMinutes = Math.floor((now - updateTime) / (1000 * 60))

    return {
      isFresh: ageMinutes < 30, // Consider fresh if less than 30 minutes old
      age: ageMinutes,
      lastUpdate: lastUpdate.value,
      status: cacheStatus.value,
      isOffline: isOffline.value,
      needsRefresh: ageMinutes > 120 // Refresh if older than 2 hours
    }
  }

  /**
   * Force refresh TLE data
   * @param {Array} satellites - Array of satellite objects
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   * @param {string} satnogsToken - SatNOGS API token for backup
   */
  const refreshTLEData = async (satellites, username, password, satnogsToken = null) => {
    await fetchTLEData(satellites, username, password, satnogsToken, true)
  }

  return {
    // State
    tleData: readonly(tleData),
    isLoading: readonly(isLoading),
    lastUpdate: readonly(lastUpdate),
    error: readonly(error),
    isOffline: readonly(isOffline),
    cacheStatus: readonly(cacheStatus),

    // Methods
    fetchTLEData,
    getTLEData,
    hasTLEData,
    getAllTLEData,
    clearTLEData,
    getDataFreshness,
    initializeTLEData,
    refreshTLEData,
    loadFromCache,
    saveToCache,
    needsRefresh
  }
}
