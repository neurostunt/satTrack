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
   * Fetch TLE data for tracked satellites with caching
   * @param {Array} satellites - Array of satellite objects with noradId
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   * @param {boolean} forceRefresh - Force refresh even if cache is fresh
   */
  const fetchTLEData = async (satellites, username, password, forceRefresh = false) => {
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
      // Require credentials
      if (!username || !password) {
        throw new Error('Space-Track.org credentials are required')
      }

      // Login if not already logged in
      if (!spaceTrackAPI.getSessionStatus()) {
        const loginSuccess = await spaceTrackAPI.login(username, password)
        if (!loginSuccess) {
          throw new Error('Failed to login to Space-Track.org')
        }
      }

      // Extract NORAD IDs
      const noradIds = satellites.map(sat => sat.noradId)
      
      // Fetch TLE data
      const rawTLEData = await spaceTrackAPI.fetchTLEData(noradIds, username, password)
      
      // Process and store TLE data
      const processedData = {}
      rawTLEData.forEach(tle => {
        processedData[tle.NORAD_CAT_ID] = {
          noradId: tle.NORAD_CAT_ID,
          name: tle.OBJECT_NAME,
          tle1: tle.TLE_LINE1,
          tle2: tle.TLE_LINE2,
          epoch: tle.EPOCH,
          lastUpdated: new Date().toISOString()
        }
      })

      tleData.value = processedData
      lastUpdate.value = new Date().toISOString()
      cacheStatus.value = 'fresh'
      
      // Save to cache
      await saveToCache(processedData)
      
      console.log('TLE data updated successfully:', Object.keys(processedData).length, 'satellites')
      
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
   */
  const refreshTLEData = async (satellites, username, password) => {
    await fetchTLEData(satellites, username, password, true)
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
