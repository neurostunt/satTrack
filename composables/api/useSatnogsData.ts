/**
 * Composable for SatNOGS API data management
 * Handles transponder data, frequencies, and satellite information
 */

import { ref, readonly } from 'vue'
import { useSatnogs } from './useSatnogs'
import { useSecureStorage } from '../storage/useSecureStorage'
import type { Satellite, Transmitter } from '~/types/satellite'

export const useSatnogsData = () => {
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const satellites = ref<Satellite[]>([])
  const transmitters = ref<Transmitter[]>([])
  const combinedData = ref<Record<number, any>>({})

  // Use composables
  const satnogs = useSatnogs()
  const storage = useSecureStorage()

  /**
   * Fetch satellite list from SatNOGS
   * @param {number} limit - Number of satellites to fetch
   * @returns {Promise<Array>} Array of satellites
   */
  const fetchSatellites = async (limit: number = 100): Promise<Satellite[]> => {
    isLoading.value = true
    error.value = null

    try {
      const results = await satnogs.searchSatellites('', limit)
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
   * Fetch transmitters for a specific satellite
   */
  const fetchTransmitters = async (satId: number): Promise<Transmitter[]> => {
    isLoading.value = true
    error.value = null

    try {
      const results = await satnogsService.fetchTransmitters(satId)
      transmitters.value = results
      return results
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch transmitters'
      console.error('SatNOGS transmitters fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch combined satellite and transponder data by NORAD ID
   */
  const fetchCombinedData = async (noradId: number): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      const results = await satnogsService.fetchCombinedData(noradId)
      combinedData.value = results
      return results
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch combined data'
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
          const data = await satnogsService.fetchCombinedData(satellite.noradId)
          results[satellite.noradId] = data
          successCount++
          console.log(`✓ Found ${data.transmitters?.length || 0} transmitters for ${satellite.name}`)
        } catch (err) {
          errorCount++
          console.log(`✗ Error fetching data for ${satellite.name}:`, err instanceof Error ? err.message : 'Unknown error')
        }
      })

      await Promise.all(promises)

      combinedData.value = results

      console.log(`Transponder data fetch complete: ${successCount} success, ${errorCount} errors`)

      return {
        results: results,
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
      if (transmitter.description?.toLowerCase().includes('uplink') ||
          transmitter.uplinkLow) {
        frequencies.uplinks.push(freq)
      } else if (transmitter.description?.toLowerCase().includes('downlink') ||
                 transmitter.downlinkLow) {
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
   * Search satellites by name or NORAD ID
   */
  const searchSatellites = (query: string): Satellite[] => {
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
