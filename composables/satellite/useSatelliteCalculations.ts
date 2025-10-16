/**
 * Satellite Calculations Composable
 * Handles orbital calculations, pass predictions, and position tracking
 */

import { ref, readonly } from 'vue'
import type { Satellite, SatellitePass, ObservationLocation, TLEData } from '~/types/satellite'
import { DEFAULT_SATELLITE_SETTINGS } from '~/constants/satellite'

export const useSatelliteCalculations = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastCalculation = ref<number>(0)

  // Constants
  const EARTH_RADIUS = 6371 // km
  const GRAVITATIONAL_CONSTANT = 3.986004418e14 // m³/s²

  /**
   * Calculate satellite position from TLE data
   */
  const calculatePosition = (tle: TLEData, time: Date = new Date()): {
    latitude: number
    longitude: number
    altitude: number
    velocity: number
  } => {
    try {
      // Parse TLE lines
      const line1 = tle.line1.trim()
      const line2 = tle.line2.trim()

      // Extract orbital elements
      const inclination = parseTLEFloat(line2, 8, 8) * Math.PI / 180
      const rightAscension = parseTLEFloat(line2, 17, 8) * Math.PI / 180
      const eccentricity = parseTLEFloat(line2, 26, 7) / 1e7
      const argumentOfPerigee = parseTLEFloat(line2, 34, 8) * Math.PI / 180
      const meanAnomaly = parseTLEFloat(line2, 43, 8) * Math.PI / 180
      const meanMotion = parseTLEFloat(line2, 52, 11) * 2 * Math.PI / 86400

      // Calculate semi-major axis
      const semiMajorAxis = Math.pow(GRAVITATIONAL_CONSTANT / Math.pow(meanMotion, 2), 1/3) / 1000 // km

      // Calculate current mean anomaly
      const epochTime = parseTLEEpoch(line1)
      const timeDiff = (time.getTime() - epochTime.getTime()) / 1000 // seconds
      const currentMeanAnomaly = meanAnomaly + meanMotion * timeDiff

      // Solve Kepler's equation for eccentric anomaly
      const eccentricAnomaly = solveKeplersEquation(currentMeanAnomaly, eccentricity)

      // Calculate true anomaly
      const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
        Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
      )

      // Calculate position in orbital plane
      const radius = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly))
      const x = radius * Math.cos(trueAnomaly)
      const y = radius * Math.sin(trueAnomaly)

      // Transform to Earth-centered coordinates
      const cosRA = Math.cos(rightAscension)
      const sinRA = Math.sin(rightAscension)
      const cosI = Math.cos(inclination)
      const sinI = Math.sin(inclination)
      const cosAP = Math.cos(argumentOfPerigee)
      const sinAP = Math.sin(argumentOfPerigee)

      const xECI = x * (cosRA * cosAP - sinRA * sinAP * cosI) - y * (cosRA * sinAP + sinRA * cosAP * cosI)
      const yECI = x * (sinRA * cosAP + cosRA * sinAP * cosI) - y * (sinRA * sinAP - cosRA * cosAP * cosI)
      const zECI = x * sinAP * sinI + y * cosAP * sinI

      // Convert to geodetic coordinates
      const latitude = Math.atan2(zECI, Math.sqrt(xECI * xECI + yECI * yECI))
      const longitude = Math.atan2(yECI, xECI)
      const altitude = Math.sqrt(xECI * xECI + yECI * yECI + zECI * zECI) - EARTH_RADIUS

      // Calculate velocity (simplified)
      const velocity = Math.sqrt(GRAVITATIONAL_CONSTANT / (radius * 1000)) / 1000 // km/s

      return {
        latitude: latitude * 180 / Math.PI,
        longitude: longitude * 180 / Math.PI,
        altitude: Math.max(altitude, 0),
        velocity
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Position calculation failed'
      console.error('Error calculating satellite position:', err)
      return {
        latitude: 0,
        longitude: 0,
        altitude: 0,
        velocity: 0
      }
    }
  }

  /**
   * Calculate satellite passes for a given location
   */
  const calculatePasses = async (
    satellite: Satellite,
    tle: TLEData,
    location: ObservationLocation,
    startTime: Date = new Date(),
    endTime: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    minElevation: number = DEFAULT_SATELLITE_SETTINGS.MIN_ELEVATION
  ): Promise<SatellitePass[]> => {
    try {
      isLoading.value = true
      error.value = null

      const passes: SatellitePass[] = []
      const timeStep = 60 * 1000 // 1 minute
      let currentTime = new Date(startTime)
      let inPass = false
      let passStart: Date | null = null
      let maxElevation = 0
      let peakTime: Date | null = null

      while (currentTime <= endTime) {
        const position = calculatePosition(tle, currentTime)
        const elevation = calculateElevation(position, location)

        if (elevation >= minElevation) {
          if (!inPass) {
            inPass = true
            passStart = new Date(currentTime)
            maxElevation = elevation
            peakTime = new Date(currentTime)
          } else {
            if (elevation > maxElevation) {
              maxElevation = elevation
              peakTime = new Date(currentTime)
            }
          }
        } else {
          if (inPass && passStart) {
            // End of pass
            const passEnd = new Date(currentTime)
            const duration = (passEnd.getTime() - passStart.getTime()) / 1000 / 60 // minutes

            if (duration >= DEFAULT_SATELLITE_SETTINGS.PASS_DURATION_THRESHOLD / 60) {
              passes.push({
                noradId: satellite.noradId,
                startTime: passStart,
                endTime: passEnd,
                peakTime: peakTime!,
                maxElevation,
                duration: Math.round(duration),
                azimuth: calculateAzimuth(position, location),
                elevation: maxElevation
              })
            }

            inPass = false
            passStart = null
            maxElevation = 0
            peakTime = null
          }
        }

        currentTime = new Date(currentTime.getTime() + timeStep)
      }

      lastCalculation.value = Date.now()
      return passes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Pass calculation failed'
      console.error('Pass calculation error:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Calculate elevation angle from observer to satellite
   */
  const calculateElevation = (satellitePos: { latitude: number; longitude: number; altitude: number }, observer: ObservationLocation): number => {
    const lat1 = observer.latitude * Math.PI / 180
    const lon1 = observer.longitude * Math.PI / 180
    const lat2 = satellitePos.latitude * Math.PI / 180
    const lon2 = satellitePos.longitude * Math.PI / 180

    const dLat = lat2 - lat1
    const dLon = lon2 - lon1

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const distance = EARTH_RADIUS * c
    const elevation = Math.atan2(satellitePos.altitude, distance) * 180 / Math.PI

    return Math.max(elevation, 0)
  }

  /**
   * Calculate azimuth angle from observer to satellite
   */
  const calculateAzimuth = (satellitePos: { latitude: number; longitude: number; altitude: number }, observer: ObservationLocation): number => {
    const lat1 = observer.latitude * Math.PI / 180
    const lon1 = observer.longitude * Math.PI / 180
    const lat2 = satellitePos.latitude * Math.PI / 180
    const lon2 = satellitePos.longitude * Math.PI / 180

    const dLon = lon2 - lon1

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    let azimuth = Math.atan2(y, x) * 180 / Math.PI
    azimuth = (azimuth + 360) % 360

    return azimuth
  }

  /**
   * Check if satellite is currently visible
   */
  const isSatelliteVisible = (
    satellite: Satellite,
    tle: TLEData,
    location: ObservationLocation,
    minElevation: number = DEFAULT_SATELLITE_SETTINGS.MIN_ELEVATION
  ): boolean => {
    try {
      const position = calculatePosition(tle)
      const elevation = calculateElevation(position, location)
      return elevation >= minElevation
    } catch (err) {
      console.error('Visibility check error:', err)
      return false
    }
  }

  /**
   * Get next pass for a satellite
   */
  const getNextPass = async (
    satellite: Satellite,
    tle: TLEData,
    location: ObservationLocation,
    minElevation: number = DEFAULT_SATELLITE_SETTINGS.MIN_ELEVATION
  ): Promise<SatellitePass | null> => {
    try {
      const passes = await calculatePasses(satellite, tle, location, new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000), minElevation)
      return passes.length > 0 ? passes[0] || null : null
    } catch (err) {
      console.error('Next pass calculation error:', err)
      return null
    }
  }

  /**
   * Parse TLE float value
   */
  const parseTLEFloat = (line: string, start: number, length: number): number => {
    const value = line.substring(start, start + length).trim()
    return parseFloat(value) || 0
  }

  /**
   * Parse TLE epoch time
   */
  const parseTLEEpoch = (line: string): Date => {
    const year = parseInt(line.substring(18, 20))
    const dayOfYear = parseFloat(line.substring(20, 32))

    const fullYear = year < 57 ? 2000 + year : 1900 + year
    const epoch = new Date(fullYear, 0, 1)
    epoch.setDate(epoch.getDate() + dayOfYear - 1)

    return epoch
  }

  /**
   * Solve Kepler's equation using Newton-Raphson method
   */
  const solveKeplersEquation = (meanAnomaly: number, eccentricity: number, maxIterations: number = 10): number => {
    let eccentricAnomaly = meanAnomaly

    for (let i = 0; i < maxIterations; i++) {
      const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
      const fPrime = 1 - eccentricity * Math.cos(eccentricAnomaly)

      if (Math.abs(f) < 1e-10) break

      eccentricAnomaly = eccentricAnomaly - f / fPrime
    }

    return eccentricAnomaly
  }

  /**
   * Clear error state
   */
  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastCalculation: readonly(lastCalculation),

    // Methods
    calculatePosition,
    calculatePasses,
    calculateElevation,
    calculateAzimuth,
    isSatelliteVisible,
    getNextPass,
    clearError
  }
}
