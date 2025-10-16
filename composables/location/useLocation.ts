/**
 * Location Composable
 * Handles geolocation, grid square conversion, and location management
 */

import { ref, computed, readonly } from 'vue'
import type { ObservationLocation } from '~/types/satellite'
import { GRID_SQUARE } from '~/constants/ui'

export const useLocation = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const location = ref<ObservationLocation | null>(null)
  const gridSquare = ref<string>('')
  const useGPS = ref<boolean>(true)
  const lastUpdate = ref<number>(0)

  /**
   * Get current GPS location
   */
  const getCurrentLocation = async (): Promise<ObservationLocation | null> => {
    if (!navigator.geolocation) {
      error.value = 'Geolocation is not supported by this browser'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const newLocation: ObservationLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude || 0,
        gridSquare: convertToGridSquare(position.coords.latitude, position.coords.longitude)
      }

      location.value = newLocation
      gridSquare.value = newLocation.gridSquare || ''
      lastUpdate.value = Date.now()

      return newLocation
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get location'
      console.error('Location error:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Convert latitude/longitude to Maidenhead grid square
   */
  const convertToGridSquare = (lat: number, lon: number, precision: number = GRID_SQUARE.DEFAULT_LENGTH): string => {
    // Normalize longitude to 0-360 range
    lon = ((lon % 360) + 360) % 360

    // Calculate field (2 characters)
    const fieldLon = Math.floor(lon / 20)
    const fieldLat = Math.floor((lat + 90) / 10)

    let gridSquare = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat)

    if (precision >= 4) {
      // Calculate square (2 characters)
      const squareLon = Math.floor((lon % 20) / 2)
      const squareLat = Math.floor(((lat + 90) % 10) / 1)

      gridSquare += squareLon.toString() + squareLat.toString()
    }

    if (precision >= 6) {
      // Calculate subsquare (2 characters)
      const subsquareLon = Math.floor(((lon % 20) % 2) / (2 / 24))
      const subsquareLat = Math.floor((((lat + 90) % 10) % 1) / (1 / 24))

      gridSquare += String.fromCharCode(97 + subsquareLon) + String.fromCharCode(97 + subsquareLat)
    }

    if (precision >= 8) {
      // Calculate extended subsquare (2 characters)
      const extendedLon = Math.floor((((lon % 20) % 2) % (2 / 24)) / (2 / 24 / 10))
      const extendedLat = Math.floor(((((lat + 90) % 10) % 1) % (1 / 24)) / (1 / 24 / 10))

      gridSquare += extendedLon.toString() + extendedLat.toString()
    }

    return gridSquare
  }

  /**
   * Convert grid square to latitude/longitude
   */
  const convertFromGridSquare = (gridSquare: string): { latitude: number; longitude: number } | null => {
    if (!gridSquare || gridSquare.length < 2) return null

    try {
      const grid = gridSquare.toUpperCase()
      let lat = 0
      let lon = 0

      // Field (2 characters)
      if (grid.length >= 2) {
        const fieldLon = grid.charCodeAt(0) - 65
        const fieldLat = grid.charCodeAt(1) - 65
        lon = fieldLon * 20
        lat = fieldLat * 10 - 90
      }

      // Square (2 characters)
      if (grid.length >= 4) {
        const squareLon = parseInt(grid[2] || '0')
        const squareLat = parseInt(grid[3] || '0')
        lon += squareLon * 2
        lat += squareLat * 1
      }

      // Subsquare (2 characters)
      if (grid.length >= 6) {
        const subsquareLon = (grid.charCodeAt(4) || 97) - 97
        const subsquareLat = (grid.charCodeAt(5) || 97) - 97
        lon += subsquareLon * (2 / 24)
        lat += subsquareLat * (1 / 24)
      }

      // Extended subsquare (2 characters)
      if (grid.length >= 8) {
        const extendedLon = parseInt(grid[6] || '0')
        const extendedLat = parseInt(grid[7] || '0')
        lon += extendedLon * (2 / 24 / 10)
        lat += extendedLat * (1 / 24 / 10)
      }

      return { latitude: lat, longitude: lon }
    } catch (error) {
      console.error('Error converting grid square:', error)
      return null
    }
  }

  /**
   * Set location from grid square
   */
  const setLocationFromGridSquare = (grid: string): boolean => {
    const coords = convertFromGridSquare(grid)
    if (!coords) return false

    const newLocation: ObservationLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: 0,
      gridSquare: grid
    }

    location.value = newLocation
    gridSquare.value = grid
    useGPS.value = false
    lastUpdate.value = Date.now()

    return true
  }

  /**
   * Set location manually
   */
  const setLocation = (lat: number, lon: number, altitude: number = 0): void => {
    const newLocation: ObservationLocation = {
      latitude: lat,
      longitude: lon,
      altitude,
      gridSquare: convertToGridSquare(lat, lon)
    }

    location.value = newLocation
    gridSquare.value = newLocation.gridSquare || ''
    useGPS.value = false
    lastUpdate.value = Date.now()
  }

  /**
   * Enable/disable GPS
   */
  const setUseGPS = (enabled: boolean): void => {
    useGPS.value = enabled
    if (enabled) {
      getCurrentLocation()
    }
  }

  /**
   * Clear location data
   */
  const clearLocation = (): void => {
    location.value = null
    gridSquare.value = ''
    error.value = null
    lastUpdate.value = Date.now()
  }

  /**
   * Validate grid square format
   */
  const isValidGridSquare = (grid: string): boolean => {
    if (!grid || grid.length < 2 || grid.length > 8) return false

    const pattern = /^[A-R]{2}(\d{2})?([a-x]{2})?(\d{2})?$/i
    return pattern.test(grid)
  }

  /**
   * Get location accuracy info
   */
  const getLocationAccuracy = (): string => {
    if (!location.value) return 'No location'

    const gridLength = gridSquare.value.length
    switch (gridLength) {
      case 2: return '~100km'
      case 4: return '~10km'
      case 6: return '~1km'
      case 8: return '~100m'
      default: return 'Unknown'
    }
  }

  // Computed properties
  const hasLocation = computed(() => !!location.value)
  const hasError = computed(() => !!error.value)
  const isReady = computed(() => !isLoading.value && !error.value)
  const locationString = computed(() => {
    if (!location.value) return 'No location'
    return `${location.value.latitude.toFixed(4)}°N, ${location.value.longitude.toFixed(4)}°E`
  })

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    location: readonly(location),
    gridSquare: readonly(gridSquare),
    useGPS: readonly(useGPS),
    lastUpdate: readonly(lastUpdate),
    hasLocation,
    hasError,
    isReady,
    locationString,

    // Methods
    getCurrentLocation,
    convertToGridSquare,
    convertFromGridSquare,
    setLocationFromGridSquare,
    setLocation,
    setUseGPS,
    clearLocation,
    isValidGridSquare,
    getLocationAccuracy
  }
}
