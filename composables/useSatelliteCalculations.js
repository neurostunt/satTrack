/**
 * Satellite Calculations Composable
 * Handles satellite position calculations using satellite.js
 */

import { 
  twoline2satrec, 
  propagate, 
  eciToGeodetic, 
  geodeticToEcf, 
  ecfToLookAngles 
} from 'satellite.js'

export const useSatelliteCalculations = () => {
  const calculations = ref({})
  const isCalculating = ref(false)

  /**
   * Calculate satellite position from TLE data
   * @param {Object} tleData - TLE data object
   * @param {Object} observerLocation - Observer location {latitude, longitude, altitude}
   * @param {Date} time - Time for calculation (defaults to now)
   * @returns {Object|null} - Calculated position or null
   */
  const calculateSatellitePosition = (tleData, observerLocation, time = new Date()) => {
    if (!tleData || !tleData.tle1 || !tleData.tle2) {
      console.warn('Invalid TLE data for calculation')
      return null
    }

    if (!observerLocation || !observerLocation.latitude || !observerLocation.longitude) {
      console.warn('Invalid observer location for calculation')
      return null
    }

    try {
      // Parse TLE data
      const satrec = twoline2satrec(tleData.tle1, tleData.tle2)
      
      // Calculate satellite position
      const positionAndVelocity = propagate(satrec, time)
      
      if (positionAndVelocity.position === false) {
        console.warn('Satellite position calculation failed')
        return null
      }

      // Convert position to ECI coordinates
      const positionEci = positionAndVelocity.position
      
      // Observer position in ECI
      const observerGd = {
        latitude: observerLocation.latitude * Math.PI / 180,
        longitude: observerLocation.longitude * Math.PI / 180,
        height: (observerLocation.altitude || 0) / 1000 // Convert to km
      }
      
      const observerEci = eciToGeodetic(geodeticToEcf(observerGd, time), time)
      
      // Calculate look angles
      const lookAngles = ecfToLookAngles(observerGd, positionEci, time)
      
      if (!lookAngles) {
        console.warn('Look angles calculation failed')
        return null
      }

      // Calculate range
      const range = Math.sqrt(
        Math.pow(positionEci.x - observerEci.x, 2) +
        Math.pow(positionEci.y - observerEci.y, 2) +
        Math.pow(positionEci.z - observerEci.z, 2)
      )

      // Convert angles to degrees
      const azimuth = (lookAngles.azimuth * 180 / Math.PI + 360) % 360
      const elevation = lookAngles.elevation * 180 / Math.PI

      return {
        azimuth: Math.round(azimuth * 100) / 100,
        elevation: Math.round(elevation * 100) / 100,
        range: Math.round(range * 100) / 100, // km
        rangeKm: Math.round(range * 100) / 100,
        rangeMiles: Math.round(range * 0.621371 * 100) / 100,
        isVisible: elevation > 0,
        time: time.toISOString(),
        noradId: tleData.noradId,
        name: tleData.name
      }

    } catch (error) {
      console.error('Satellite calculation error:', error)
      return null
    }
  }

  /**
   * Calculate next pass for a satellite
   * @param {Object} tleData - TLE data object
   * @param {Object} observerLocation - Observer location
   * @param {Date} startTime - Start time for search (defaults to now)
   * @param {number} maxDays - Maximum days to search ahead
   * @returns {Object|null} - Next pass info or null
   */
  const calculateNextPass = (tleData, observerLocation, startTime = new Date(), maxDays = 7) => {
    if (!tleData || !observerLocation) {
      return null
    }

    try {
      const endTime = new Date(startTime.getTime() + maxDays * 24 * 60 * 60 * 1000)
      const timeStep = 60 * 1000 // 1 minute steps
      
      let currentTime = new Date(startTime)
      let lastElevation = -90
      let passStart = null
      let maxElevation = -90
      let maxElevationTime = null

      while (currentTime < endTime) {
        const position = calculateSatellitePosition(tleData, observerLocation, currentTime)
        
        if (position) {
          // Rising above horizon
          if (lastElevation <= 0 && position.elevation > 0) {
            passStart = new Date(currentTime)
          }
          
          // Track maximum elevation
          if (position.elevation > maxElevation) {
            maxElevation = position.elevation
            maxElevationTime = new Date(currentTime)
          }
          
          // Pass ended
          if (lastElevation > 0 && position.elevation <= 0 && passStart) {
            return {
              startTime: passStart,
              maxElevationTime: maxElevationTime,
              maxElevation: Math.round(maxElevation * 100) / 100,
              duration: Math.round((currentTime - passStart) / 1000 / 60), // minutes
              noradId: tleData.noradId,
              name: tleData.name
            }
          }
          
          lastElevation = position.elevation
        }
        
        currentTime = new Date(currentTime.getTime() + timeStep)
      }

      return null
    } catch (error) {
      console.error('Next pass calculation error:', error)
      return null
    }
  }

  /**
   * Calculate multiple satellite positions
   * @param {Object} tleDataMap - Map of NORAD ID to TLE data
   * @param {Object} observerLocation - Observer location
   * @param {Date} time - Time for calculation
   * @returns {Object} - Map of NORAD ID to position data
   */
  const calculateMultiplePositions = (tleDataMap, observerLocation, time = new Date()) => {
    const results = {}
    
    Object.values(tleDataMap).forEach(tleData => {
      const position = calculateSatellitePosition(tleData, observerLocation, time)
      if (position) {
        results[tleData.noradId] = position
      }
    })
    
    return results
  }

  /**
   * Get satellite visibility status
   * @param {Object} position - Satellite position data
   * @returns {Object} - Visibility status
   */
  const getVisibilityStatus = (position) => {
    if (!position) {
      return { status: 'unknown', message: 'No position data' }
    }

    if (position.elevation > 0) {
      return { 
        status: 'visible', 
        message: `Above horizon (${position.elevation.toFixed(1)}°)`,
        elevation: position.elevation
      }
    } else if (position.elevation > -10) {
      return { 
        status: 'approaching', 
        message: `Approaching horizon (${position.elevation.toFixed(1)}°)`,
        elevation: position.elevation
      }
    } else {
      return { 
        status: 'below', 
        message: `Below horizon (${position.elevation.toFixed(1)}°)`,
        elevation: position.elevation
      }
    }
  }

  return {
    // State
    calculations: readonly(calculations),
    isCalculating: readonly(isCalculating),
    
    // Methods
    calculateSatellitePosition,
    calculateNextPass,
    calculateMultiplePositions,
    getVisibilityStatus
  }
}
