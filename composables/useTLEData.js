/**
 * TLE Data Composable
 * Manages satellite TLE data fetching and caching
 */

import spaceTrackAPI from '~/utils/spaceTrackApi.js'

export const useTLEData = () => {
  const tleData = ref({})
  const isLoading = ref(false)
  const lastUpdate = ref(null)
  const error = ref(null)

  /**
   * Fetch TLE data for tracked satellites
   * @param {Array} satellites - Array of satellite objects with noradId
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   */
  const fetchTLEData = async (satellites, username, password) => {
    if (!satellites || satellites.length === 0) {
      console.warn('No satellites to fetch TLE data for')
      return
    }

    isLoading.value = true
    error.value = null

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
          
          console.log('TLE data updated successfully:', Object.keys(processedData).length, 'satellites')
          
        } catch (err) {
          console.error('TLE data fetch failed:', err.message)
          error.value = err.message
          throw err
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
   * Clear all TLE data
   */
  const clearTLEData = () => {
    tleData.value = {}
    lastUpdate.value = null
    error.value = null
  }

  /**
   * Get data freshness info
   * @returns {Object} - Freshness information
   */
  const getDataFreshness = () => {
    if (!lastUpdate.value) {
      return { isFresh: false, age: null }
    }

    const now = new Date()
    const updateTime = new Date(lastUpdate.value)
    const ageMinutes = Math.floor((now - updateTime) / (1000 * 60))
    
    return {
      isFresh: ageMinutes < 30, // Consider fresh if less than 30 minutes old
      age: ageMinutes,
      lastUpdate: lastUpdate.value
    }
  }

  return {
    // State
    tleData: readonly(tleData),
    isLoading: readonly(isLoading),
    lastUpdate: readonly(lastUpdate),
    error: readonly(error),
    
    // Methods
    fetchTLEData,
    getTLEData,
    hasTLEData,
    getAllTLEData,
    clearTLEData,
    getDataFreshness
  }
}
