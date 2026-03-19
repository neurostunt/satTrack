/**
 * Pass Status Composable
 * Handles pass status determination and time formatting
 */

import { isGeostationaryPass as checkGeostationaryPass } from '~/utils/satelliteStatusUtils'

export type PassStatus = 'upcoming' | 'passing' | 'passed' | 'stationary'

export const usePassStatus = () => {
  // Reactive current time for real-time updates
  const currentTime = ref(Date.now())

  /**
   * Detect if a satellite is geostationary based on pass characteristics
   */
  const isGeostationaryPass = (pass: any): boolean => checkGeostationaryPass(pass)

  /**
   * Get the current status of a pass
   */
  const getPassStatus = (startTime: number, endTime: number, noradId: number, pass?: any): PassStatus => {
    const isGeostationary = pass ? isGeostationaryPass(pass) : false

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
  const formatTimeUntilPass = (startTime: number, endTime: number, noradId: number, pass?: any): string => {
    const status = getPassStatus(startTime, endTime, noradId, pass)

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
   * Check if a satellite is geostationary based on pass data
   */
  const isGeostationary = (pass: any): boolean => {
    return isGeostationaryPass(pass)
  }

  return {
    // State
    currentTime,

    // Methods
    getPassStatus,
    formatTimeUntilPass,
    updateCurrentTime,
    isGeostationary
  }
}
