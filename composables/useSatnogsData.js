/**
 * Composable for SatNOGS API data management
 * Handles transponder data, frequencies, and satellite information
 */

export const useSatnogsData = () => {
  const isLoading = ref(false)
  const error = ref(null)
  const satellites = ref([])
  const transmitters = ref([])
  const combinedData = ref({})

  /**
   * Fetch satellite list from SatNOGS
   * @param {number} limit - Number of satellites to fetch
   * @returns {Promise<Array>} Array of satellites
   */
  const fetchSatellites = async (limit = 100) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/satnogs', {
        method: 'POST',
        body: {
          action: 'satellites',
          limit
        }
      })

      if (response.success) {
        satellites.value = response.data
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch satellites')
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch satellites'
      console.error('SatNOGS satellites fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch transmitters for a specific satellite
   * @param {number} satId - SatNOGS satellite ID
   * @returns {Promise<Array>} Array of transmitters
   */
  const fetchTransmitters = async (satId) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/satnogs', {
        method: 'POST',
        body: {
          action: 'transmitters',
          satId
        }
      })

      if (response.success) {
        transmitters.value = response.data
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch transmitters')
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch transmitters'
      console.error('SatNOGS transmitters fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch combined satellite and transponder data by NORAD ID
   * This combines orbital data (from Space-Track) with transponder data (from SatNOGS)
   * @param {number} noradId - NORAD catalog number
   * @returns {Promise<Object>} Combined satellite and transponder data
   */
  const fetchCombinedData = async (noradId) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/satnogs', {
        method: 'POST',
        body: {
          action: 'combined-data',
          noradId
        }
      })

      if (response.success) {
        combinedData.value = response.data
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch combined data')
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch combined data'
      console.error('SatNOGS combined data fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch transponder data for multiple tracked satellites
   * @param {Array} trackedSatellites - Array of satellite objects with noradId
   * @returns {Promise<Object>} Object with NORAD IDs as keys and transponder data as values
   */
  const fetchTrackedSatellitesData = async (trackedSatellites) => {
    isLoading.value = true
    error.value = null

    try {
      const results = {}
      let successCount = 0
      let errorCount = 0

      console.log(`Fetching transponder data for ${trackedSatellites.length} tracked satellites`)

      // Process satellites in parallel for better performance
      const promises = trackedSatellites.map(async (satellite) => {
        try {
          const response = await $fetch('/api/satnogs', {
            method: 'POST',
            body: {
              action: 'combined-data',
              noradId: satellite.noradId
            }
          })

          if (response.success) {
            results[satellite.noradId] = response.data
            successCount++
            console.log(`✓ Found ${response.data.transmitters.length} transmitters for ${satellite.name}`)
          } else {
            errorCount++
            console.log(`✗ No transponder data found for ${satellite.name}`)
          }
        } catch (err) {
          errorCount++
          console.log(`✗ Error fetching data for ${satellite.name}:`, err.message)
        }
      })

      await Promise.all(promises)

      combinedData.value = results

      console.log(`Transponder data fetch complete: ${successCount} success, ${errorCount} errors`)

      return {
        results,
        successCount,
        errorCount,
        totalSatellites: trackedSatellites.length
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch tracked satellites data'
      console.error('SatNOGS tracked satellites fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get transponder frequencies for radio operators
   * @param {Array} transmitters - Array of transmitter objects
   * @returns {Object} Organized frequency data
   */
  const getTransponderFrequencies = (transmitters) => {
    if (!transmitters || !Array.isArray(transmitters)) {
      return {
        uplinks: [],
        downlinks: [],
        beacons: [],
        telemetry: []
      }
    }

    const frequencies = {
      uplinks: [],
      downlinks: [],
      beacons: [],
      telemetry: []
    }

    transmitters.forEach(transmitter => {
      const freq = {
        id: transmitter.id,
        frequency: transmitter.downlink_low || transmitter.uplink_low,
        description: transmitter.description || transmitter.mode || 'Unknown',
        mode: transmitter.mode || 'Unknown',
        status: transmitter.status || 'Unknown',
        invert: transmitter.invert || false,
        baud: transmitter.baud || null,
        modulation: transmitter.modulation || null
      }

      // Categorize by frequency type
      if (transmitter.description?.toLowerCase().includes('uplink') ||
          transmitter.uplink_low) {
        frequencies.uplinks.push(freq)
      } else if (transmitter.description?.toLowerCase().includes('downlink') ||
                 transmitter.downlink_low) {
        frequencies.downlinks.push(freq)
      } else if (transmitter.description?.toLowerCase().includes('beacon')) {
        frequencies.beacons.push(freq)
      } else if (transmitter.description?.toLowerCase().includes('telemetry')) {
        frequencies.telemetry.push(freq)
      } else {
        // Default to downlink if unclear
        frequencies.downlinks.push(freq)
      }
    })

    return frequencies
  }

  /**
   * Format frequency for display
   * @param {number} frequency - Frequency in Hz
   * @returns {string} Formatted frequency
   */
  const formatFrequency = (frequency) => {
    if (!frequency) return 'Unknown'

    if (frequency >= 1000000) {
      return `${(frequency / 1000000).toFixed(3)} MHz`
    } else if (frequency >= 1000) {
      return `${(frequency / 1000).toFixed(0)} kHz`
    } else {
      return `${frequency} Hz`
    }
  }

  /**
   * Get active transponders (currently operational)
   * @param {Array} transmitters - Array of transmitter objects
   * @returns {Array} Active transmitters
   */
  const getActiveTransponders = (transmitters) => {
    if (!transmitters || !Array.isArray(transmitters)) return []

    return transmitters.filter(transmitter =>
      transmitter.status === 'active' ||
      transmitter.status === 'operational' ||
      !transmitter.status // Assume active if status not specified
    )
  }

  /**
   * Search satellites by name or NORAD ID
   * @param {string} query - Search query
   * @returns {Array} Matching satellites
   */
  const searchSatellites = (query) => {
    if (!satellites.value || !Array.isArray(satellites.value)) return []

    const searchTerm = query.toLowerCase()
    return satellites.value.filter(satellite =>
      satellite.name?.toLowerCase().includes(searchTerm) ||
      satellite.norad_cat_id?.toString().includes(searchTerm) ||
      satellite.tle?.includes(searchTerm)
    )
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    satellites: readonly(satellites),
    transmitters: readonly(transmitters),
    combinedData: readonly(combinedData),

    // Methods
    fetchSatellites,
    fetchTransmitters,
    fetchCombinedData,
    fetchTrackedSatellitesData,
    getTransponderFrequencies,
    formatFrequency,
    getActiveTransponders,
    searchSatellites
  }
}
