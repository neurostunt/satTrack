/**
 * Pass Status Composable
 * Handles pass status determination and time formatting
 */

import { ref, computed } from 'vue'

export type PassStatus = 'upcoming' | 'passing' | 'passed' | 'stationary'

export const usePassStatus = () => {
  // Reactive current time for real-time updates
  const currentTime = ref(Date.now())

  // Geostationary satellites that don't "pass" in traditional sense
  const geostationarySatellites = [43700] // QO-100 and other GEO satellites

  /**
   * Get the current status of a pass
   */
  const getPassStatus = (startTime: number, endTime: number, noradId: number): PassStatus => {
    const isGeostationary = geostationarySatellites.includes(noradId)
    
    if (isGeostationary) {
      return 'stationary'
    }
    
    const now = currentTime.value
    
    if (now < startTime) {
      return 'upcoming'
    } else if (now >= startTime && now <= endTime) {
      return 'passing'
    } else {
      return 'passed'
    }
  }

  /**
   * Format time until pass with different states
   */
  const formatTimeUntilPass = (startTime: number, endTime: number, noradId: number): string => {
    const status = getPassStatus(startTime, endTime, noradId)
    
    switch (status) {
      case 'stationary':
        return 'Stationary'
      case 'upcoming': {
        const timeUntil = startTime - currentTime.value
        const hours = Math.floor(timeUntil / (1000 * 60 * 60))
        const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeUntil % (1000 * 60)) / 1000)

        if (hours > 0) {
          return `${hours}h ${minutes}m`
        } else if (minutes > 0) {
          return `${minutes}m ${seconds}s`
        } else {
          return `${seconds}s`
        }
      }
      case 'passing':
        return 'Passing'
      case 'passed':
        return 'Passed'
      default:
        return 'Unknown'
    }
  }

  /**
   * Update current time (called by interval)
   */
  const updateCurrentTime = () => {
    currentTime.value = Date.now()
  }

  /**
   * Check if a satellite is geostationary
   */
  const isGeostationary = (noradId: number): boolean => {
    return geostationarySatellites.includes(noradId)
  }

  return {
    // State
    currentTime: computed(() => currentTime.value),
    
    // Methods
    getPassStatus,
    formatTimeUntilPass,
    updateCurrentTime,
    isGeostationary
  }
}
