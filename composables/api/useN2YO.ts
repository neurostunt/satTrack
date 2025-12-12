/**
 * N2YO.com API Integration
 * Handles radio pass predictions with 61-minute caching
 */

import { ref, readonly } from 'vue'

export interface N2YOPass {
  startUTC: number // Unix timestamp
  endUTC: number // Unix timestamp
  duration: number
  maxEl: number // N2YO uses maxEl, not maxElevation
  maxAz: number // Azimuth at maximum elevation
  startAz: number // N2YO uses startAz, not startAzimuth
  endAz: number // N2YO uses endAz, not endAzimuth
  // Note: radiopasses does NOT provide startEl/endEl
  // We'll calculate these based on horizon/minElevation
}

export interface N2YOResponse {
  info: {
    satid: number
    satname: string
    transactionscount: number
    passescount: number
  }
  passes: N2YOPass[]
}

export interface CachedN2YOData {
  data: N2YOResponse
  timestamp: number
  cacheKey: string
}

// Shared API request tracking (outside composable so it's shared across all instances)
const requestCount = ref(0)
const lastResetTime = ref(Date.now())

// N2YO API Limits (per hour):
// - positions: 1000 requests/hour
// - radiopasses: 100 requests/hour
// - visualpasses: 100 requests/hour
// - tle: 1000 requests/hour
const REQUEST_LIMIT_PER_HOUR = 1000 // Using positions endpoint limit (most restrictive for our use case)

export const useN2YO = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Cache duration: 61 minutes (as requested)
  const CACHE_DURATION = 61 * 60 * 1000 // 61 minutes in milliseconds

  // Cache storage
  const cache = ref<Map<string, CachedN2YOData>>(new Map())

  /**
   * Check if we're within API rate limits
   */
  const checkRateLimit = (): boolean => {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    // Reset counter if more than an hour has passed
    if (now - lastResetTime.value > oneHour) {
      requestCount.value = 0
      lastResetTime.value = now
    }

    return requestCount.value < REQUEST_LIMIT_PER_HOUR
  }

  /**
   * Increment request counter
   */
  const incrementRequestCount = (): void => {
    requestCount.value++
  }

  /**
   * Generate cache key for N2YO request
   */
  const generateCacheKey = (
    endpoint: 'radio' | 'visual',
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    days: number,
    param: number // minElevation for radio, minVisibility for visual
  ): string => {
    return `${endpoint}-${noradId}-${observerLat}-${observerLng}-${observerAlt}-${days}-${param}`
  }

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION
  }

  /**
   * Get cached data if valid
   */
  const getCachedData = (cacheKey: string): N2YOResponse | null => {
    const cached = cache.value.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }
    return null
  }

  /**
   * Store data in cache
   */
  const setCachedData = (cacheKey: string, data: N2YOResponse): void => {
    cache.value.set(cacheKey, {
      data,
      timestamp: Date.now(),
      cacheKey
    })
  }

  /**
   * Get radio passes from N2YO API (designed for radio amateur use)
   * No optical visibility requirement - based on elevation only
   */
  const getRadioPasses = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number = 0,
    days: number = 3,
    minElevation: number = 10,
    apiKey: string
  ): Promise<N2YOResponse> => {
    try {
      isLoading.value = true
      error.value = null

      // Generate cache key for radio passes
      const cacheKey = generateCacheKey('radio', noradId, observerLat, observerLng, observerAlt, days, minElevation)

      // Check cache first
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        return cachedData
      }

      // Check rate limit before making request
      if (!checkRateLimit()) {
        throw new Error(`API rate limit exceeded. Maximum ${REQUEST_LIMIT_PER_HOUR} requests per hour. Please wait before making more requests.`)
      }

      // Make API request
      const response = await $fetch('/api/n2yo', {
        method: 'POST',
        body: {
          action: 'radiopasses',
          apiKey,
          noradId,
          observerLat,
          observerLng,
          observerAlt,
          days,
          minElevation
        }
      })

      if (!response.success) {
        throw new Error((response as any).message || 'N2YO radio passes API request failed')
      }

      const n2yoData = (response as any).data as N2YOResponse

      // Increment request counter after successful API call
      incrementRequestCount()

      // Cache the result
      setCachedData(cacheKey, n2yoData)

      return n2yoData

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'N2YO radio passes API request failed'
      error.value = errorMessage
      console.error('N2YO radio passes API error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get satellite positions from N2YO API
   * Returns position data for specified number of seconds
   * Used for real-time tracking during passes
   *
   * @param noradId NORAD catalog ID
   * @param observerLat Observer latitude
   * @param observerLng Observer longitude
   * @param observerAlt Observer altitude (meters)
   * @param seconds Number of seconds (positions returned: 1 per second)
   * @param apiKey N2YO API key
   * @returns Array of position samples with azimuth, elevation, distance
   */
  const getSatellitePositions = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number = 0,
    seconds: number = 60,
    apiKey: string
  ): Promise<any[]> => {
    try {
      isLoading.value = true
      error.value = null

      // Check rate limit before making request
      if (!checkRateLimit()) {
        throw new Error(`API rate limit exceeded. Maximum ${REQUEST_LIMIT_PER_HOUR} requests per hour.`)
      }


      const response = await $fetch('/api/n2yo', {
        method: 'POST',
        body: {
          action: 'positions',
          apiKey,
          noradId,
          observerLat,
          observerLng,
          observerAlt,
          seconds
        }
      })

      if (!response.success) {
        throw new Error((response as any).message || 'N2YO positions API request failed')
      }

      const positionsData = (response as any).data
      
      // Get server-side timestamp for consistent time calculations across devices
      // This ensures all devices use the same reference time, eliminating differences
      // due to system clock drift or timezone differences
      const serverTimestamp = positionsData.serverTimestamp || Date.now()

      // Increment request counter after successful API call
      incrementRequestCount()

      // Convert N2YO positions to our format
      const positions = positionsData.positions.map((pos: any) => ({
        timestamp: pos.timestamp * 1000, // Convert to milliseconds
        azimuth: pos.azimuth,
        elevation: pos.elevation,
        satLatitude: pos.satlatitude,
        satLongitude: pos.satlongitude,
        satAltitude: pos.sataltitude,
        distance: 0 // Will be calculated from coordinates
      }))

      // Add server-side timestamp to positions array metadata
      // This allows useRealTimePosition to use server time for all calculations
      ;(positions as any).serverTimestamp = serverTimestamp

      return positions

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'N2YO positions API request failed'
      error.value = errorMessage
      console.error('N2YO positions API error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get TLE data from N2YO API
   */
  const getTLEData = async (noradId: number, apiKey: string): Promise<any> => {
    try {
      isLoading.value = true
      error.value = null


      const response = await $fetch('/api/n2yo', {
        method: 'POST',
        body: {
          action: 'tle',
          apiKey,
          noradId
        }
      })

      if (!response.success) {
        throw new Error((response as any).message || 'N2YO TLE request failed')
      }

      return (response as any).data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'N2YO TLE request failed'
      error.value = errorMessage
      console.error('N2YO TLE error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Test N2YO API connection
   */
  const testConnection = async (apiKey: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null


      const response = await $fetch('/api/n2yo', {
        method: 'POST',
        body: {
          action: 'test',
          apiKey
        }
      })

      const success = response.success

      return success

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'N2YO connection test failed'
      error.value = errorMessage
      console.error('N2YO connection test error:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear cache
   */
  const clearCache = (): void => {
    cache.value.clear()
  }

  /**
   * Get cache statistics
   */
  const getCacheStats = (): { size: number; keys: string[] } => {
    return {
      size: cache.value.size,
      keys: Array.from(cache.value.keys())
    }
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
    requestCount: readonly(requestCount),
    REQUEST_LIMIT_PER_HOUR,

    // Methods
    getRadioPasses,
    getSatellitePositions,
    getTLEData,
    testConnection,
    clearCache,
    getCacheStats,
    clearError,
    isCacheValid,
    checkRateLimit
  }
}
