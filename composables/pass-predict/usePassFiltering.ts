/**
 * Pass Filtering Composable
 * Handles filtering and sorting of satellite passes
 */

import { computed, type Ref } from 'vue'
import type { PassStatus } from './usePassStatus'

export interface PassData {
  startTime: number
  endTime: number
  duration: number
  maxElevation: number
  startAzimuth: number
  endAzimuth: number
  startElevation: number
  endElevation: number
  noradId: number
  satelliteName: string
  transmitterCount: number
}

export const usePassFiltering = (
  passPredictions: Ref<Map<number, any[]>>,
  settings: Ref<any>,
  combinedData: Ref<any>,
  getPassStatus: (startTime: number, endTime: number, noradId: number) => PassStatus,
  currentTime: Ref<number>
) => {
  /**
   * Computed property for all passes sorted by time
   */
  const sortedPasses = computed((): PassData[] => {
    const allPasses: PassData[] = []
    const currentTimeNow = currentTime.value

    // Get all passes from satellites that have at least one upcoming pass
    passPredictions.value.forEach((passes, noradId) => {
      // Special handling for geostationary satellites
      const geostationarySatellites = [43700] // QO-100 and other GEO satellites
      const isGeostationary = geostationarySatellites.includes(noradId)
      
      // Filter passes for this satellite - include passes that ended less than 10 seconds ago
      let validPasses = passes
      if (!isGeostationary) {
        validPasses = passes.filter(pass => {
          const timeSinceEnd = currentTimeNow - pass.endTime
          return pass.endTime > currentTimeNow || timeSinceEnd < 10000 // Keep passes that are upcoming OR ended less than 10 seconds ago
        })
      }
      
      // Only process satellites that have valid passes (upcoming or recently passed)
      if (validPasses.length > 0) {
        // Find satellite name
        const satellite = settings.value.trackedSatellites?.find((s: any) => parseInt(s.noradId) === noradId)
        const satelliteName = satellite?.name || satellite?.names || `Satellite ${noradId}`

        // Get transmitter count for this satellite
        const transmitterCount = combinedData.value[noradId]?.transmitters?.length || 0

        // Add each valid pass with satellite info
        validPasses.forEach((pass: any) => {
          allPasses.push({
            ...pass,
            noradId,
            satelliteName,
            transmitterCount
          })
        })
      }
    })

    // Sort by start time (earliest first)
    const sorted = allPasses.sort((a, b) => a.startTime - b.startTime)

    return sorted
  })

  /**
   * Filter passes by status
   */
  const filterPassesByStatus = (passes: PassData[], status: PassStatus): PassData[] => {
    return passes.filter(pass => getPassStatus(pass.startTime, pass.endTime, pass.noradId) === status)
  }

  /**
   * Get upcoming passes only
   */
  const upcomingPasses = computed(() => {
    return filterPassesByStatus(sortedPasses.value, 'upcoming')
  })

  /**
   * Get currently passing satellites
   */
  const passingPasses = computed(() => {
    return filterPassesByStatus(sortedPasses.value, 'passing')
  })

  /**
   * Get recently passed satellites (within 10 seconds)
   */
  const recentlyPassedPasses = computed(() => {
    return filterPassesByStatus(sortedPasses.value, 'passed')
  })

  return {
    // Computed
    sortedPasses,
    upcomingPasses,
    passingPasses,
    recentlyPassedPasses,
    
    // Methods
    filterPassesByStatus
  }
}
