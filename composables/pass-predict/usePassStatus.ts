/**
 * Pass Status Composable
 * Handles pass status determination and time formatting
 */

export type PassStatus = 'upcoming' | 'passing' | 'passed' | 'stationary'

export const usePassStatus = () => {
  // Reactive current time for real-time updates
  const currentTime = ref(Date.now())

  /**
   * Detect if a satellite is geostationary based on pass characteristics
   * Geostationary satellites have:
   * - Start azimuth ≈ End azimuth (within 5 degrees)
   * - Very long duration (> 12 hours)
   */
  const isGeostationaryPass = (pass: any): boolean => {
    if (!pass) return false

    const azimuthDiff = Math.abs(pass.startAzimuth - pass.endAzimuth)
    const duration = pass.endTime - pass.startTime
    const durationHours = duration / (1000 * 60 * 60)

    // Geostationary if azimuth barely changes AND duration is very long
    return azimuthDiff < 5 && durationHours > 12
  }

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
    currentTime: computed(() => currentTime.value),

    // Methods
    getPassStatus,
    formatTimeUntilPass,
    updateCurrentTime,
    isGeostationary
  }
}
