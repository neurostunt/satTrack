/**
 * SatNOGS API Composable
 * Unified composable for SatNOGS API operations, data management, and utilities
 *
 * Handles:
 * - API calls (search, TLE, transmitters, combined data)
 * - State management (satellites, transmitters, combined data)
 * - Utility functions (frequency formatting, filtering)
 * - Batch operations (fetching multiple satellites)
 */

import { ref, readonly } from 'vue'
import { USER_AGENT, API_LIMITS } from '~/constants/api'
import type { Satellite, Transmitter } from '~/types/satellite'

export const useSatnogs = () => {
  // API State
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const token = ref<string | null>(null)
  const isConnected = ref<boolean>(false)

  // Data State
  const satellites = ref<Satellite[]>([])
  const transmitters = ref<Transmitter[]>([])
  const combinedData = ref<Record<number, any>>({})

  /**
   * Set API token (optional - not required for read operations)
   */
  const setToken = (newToken: string): void => {
    token.value = newToken
    isConnected.value = !!newToken
  }

  /**
   * Clear token and reset connection
   */
  const clearToken = (): void => {
    token.value = null
    isConnected.value = false
    error.value = null
  }

  /**
   * Clear error state
   */
  const clearError = (): void => {
    error.value = null
  }

  /**
   * Make API request to SatNOGS endpoint
   */
  const makeApiRequest = async (action: string, body: Record<string, any> = {}): Promise<any> => {
    const response = await fetch('/api/satnogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify({
        action,
        ...body
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'API request failed')
    }

    return data
  }

  /**
   * Search satellites by name or NORAD ID
   * Note: SatNOGS API does not require authentication for search operations
   */
  const searchSatellites = async (query: string, limit: number = API_LIMITS.SEARCH_RESULTS): Promise<Satellite[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Searching satellites for: "${query}"`)

      const data = await makeApiRequest('search', { query, limit })
      console.log(`Found ${data.data.length} satellites for "${query}"`)

      return data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search error'
      console.error('Satellite search error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch satellite list from SatNOGS
   */
  const fetchSatellites = async (limit: number = 100): Promise<Satellite[]> => {
    try {
      isLoading.value = true
      error.value = null

      const results = await searchSatellites('', limit)
      satellites.value = results
      return results
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch satellites'
      console.error('SatNOGS satellites fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch TLE data for a satellite
   * Note: SatNOGS API does not require authentication for TLE read operations
   */
  const fetchTLE = async (noradId: number): Promise<any[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Fetching TLE data for NORAD ID: ${noradId}`)

      const data = await makeApiRequest('tle', { noradId })
      console.log(`TLE data fetched for NORAD ID: ${noradId}`)

      return data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'TLE fetch error'
      console.error('TLE fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch transmitters for a satellite
   * Note: SatNOGS API does not require authentication for transmitters read operations
   */
  const fetchTransmitters = async (noradId: number): Promise<any[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Fetching transmitters for NORAD ID: ${noradId}`)

      const data = await makeApiRequest('transmitters', { noradId })
      console.log(`Found ${data.data.length} transmitters for NORAD ID: ${noradId}`)

      transmitters.value = data.data
      return data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Transmitter fetch error'
      console.error('Transmitter fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch combined satellite and transmitter data
   * Note: SatNOGS API does not require authentication for read operations
   */
  const fetchCombinedData = async (noradId: number): Promise<any> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Fetching combined data for NORAD ID: ${noradId}`)

      const data = await makeApiRequest('combined-data', { noradId })
      console.log(`Combined data fetched for NORAD ID: ${noradId}`)

      combinedData.value[noradId] = data.data
      return data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Combined data fetch error'
      console.error('Combined data fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch transponder data for multiple tracked satellites
   */
  const fetchTrackedSatellitesData = async (trackedSatellites: Satellite[]): Promise<{
    results: Record<number, any>
    successCount: number
    errorCount: number
    totalSatellites: number
  }> => {
    isLoading.value = true
    error.value = null

    try {
      const results: Record<number, any> = {}
      let successCount = 0
      let errorCount = 0

      console.log(`Fetching transponder data for ${trackedSatellites.length} tracked satellites`)

      // Process satellites in parallel for better performance
      const promises = trackedSatellites.map(async (satellite) => {
        try {
          const data = await fetchCombinedData(satellite.noradId)
          results[satellite.noradId] = data
          successCount++
          console.log(`✓ Found ${data.transmitters?.length || 0} transmitters for ${satellite.name}`)
        } catch (err) {
          errorCount++
          console.log(`✗ Error fetching data for ${satellite.name}:`, err instanceof Error ? err.message : 'Unknown error')
        }
      })

      await Promise.all(promises)

      combinedData.value = { ...combinedData.value, ...results }

      console.log(`Transponder data fetch complete: ${successCount} success, ${errorCount} errors`)

      return {
        results,
        successCount,
        errorCount,
        totalSatellites: trackedSatellites.length
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch tracked satellites data'
      console.error('SatNOGS tracked satellites fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Test API connection
   */
  const testConnection = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      const data = await makeApiRequest('test', {})
      isConnected.value = data.success
      return data.success
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection test failed'
      console.error('SatNOGS connection test failed:', err)
      isConnected.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get API status
   */
  const getStatus = (): { hasToken: boolean; isConnected: boolean } => {
    return {
      hasToken: !!token.value,
      isConnected: isConnected.value
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Get transponder frequencies for radio operators
   */
  const getTransponderFrequencies = (transmitters: Transmitter[]): Record<string, any[]> => {
    if (!transmitters || !Array.isArray(transmitters)) {
      return {
        uplinks: [],
        downlinks: [],
        beacons: [],
        telemetry: []
      }
    }

    const frequencies = {
      uplinks: [] as any[],
      downlinks: [] as any[],
      beacons: [] as any[],
      telemetry: [] as any[]
    }

    transmitters.forEach(transmitter => {
      const freq = {
        id: transmitter.id,
        frequency: transmitter.downlinkLow || transmitter.uplinkLow,
        description: transmitter.description || transmitter.mode || 'Unknown',
        mode: transmitter.mode || 'Unknown',
        status: transmitter.status || 'Unknown',
        invert: transmitter.invert || false,
        baud: transmitter.baud || null,
        modulation: transmitter.modulation || null
      }

      // Categorize by frequency type
      if (transmitter.description?.toLowerCase().includes('uplink') || transmitter.uplinkLow) {
        frequencies.uplinks.push(freq)
      } else if (transmitter.description?.toLowerCase().includes('downlink') || transmitter.downlinkLow) {
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
   */
  const formatFrequency = (frequency: number): string => {
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
   */
  const getActiveTransponders = (transmitters: Transmitter[]): Transmitter[] => {
    if (!transmitters || !Array.isArray(transmitters)) return []

    return transmitters.filter(transmitter =>
      transmitter.status === 'active' ||
      transmitter.status === 'operational' ||
      !transmitter.status // Assume active if status not specified
    )
  }

  /**
   * Search satellites by name or NORAD ID (from cached data)
   */
  const searchSatellitesLocal = (query: string): Satellite[] => {
    if (!satellites.value || !Array.isArray(satellites.value)) return []

    const searchTerm = query.toLowerCase()
    return satellites.value.filter(satellite =>
      satellite.name?.toLowerCase().includes(searchTerm) ||
      satellite.noradId?.toString().includes(searchTerm)
    )
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    token: readonly(token),
    isConnected: readonly(isConnected),
    satellites: readonly(satellites),
    transmitters: readonly(transmitters),
    combinedData: readonly(combinedData),

    // API Methods
    setToken,
    clearToken,
    clearError,
    searchSatellites,
    fetchSatellites,
    fetchTLE,
    fetchTransmitters,
    fetchCombinedData,
    fetchTrackedSatellitesData,
    testConnection,
    getStatus,

    // Utility Methods
    getTransponderFrequencies,
    formatFrequency,
    getActiveTransponders,
    searchSatellitesLocal
  }
}
