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

export const useN2YO = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // Cache duration: 61 minutes (as requested)
  const CACHE_DURATION = 61 * 60 * 1000 // 61 minutes in milliseconds
  
  // Cache storage
  const cache = ref<Map<string, CachedN2YOData>>(new Map())

  // API request tracking
  const requestCount = ref(0)
  const lastResetTime = ref(Date.now())
  // N2YO API Limits (per hour):
  // - positions: 1000 requests/hour
  // - radiopasses: 100 requests/hour
  // - visualpasses: 100 requests/hour
  // - tle: 1000 requests/hour
  const REQUEST_LIMIT_PER_HOUR = 1000 // Using positions endpoint limit (most restrictive for our use case)

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
      console.log(`📋 Using cached N2YO data for key: ${cacheKey}`)
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
    console.log(`💾 Cached N2YO data for key: ${cacheKey}`)
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
        console.log(`📋 Returning cached N2YO radio passes data for NORAD ${noradId}`)
        return cachedData
      }

      // Check rate limit before making request
      if (!checkRateLimit()) {
        throw new Error(`API rate limit exceeded. Maximum ${REQUEST_LIMIT_PER_HOUR} requests per hour. Please wait before making more requests.`)
      }

      console.log(`🔄 Fetching fresh N2YO radio passes data for NORAD ${noradId}`)
      console.log(`📊 API requests used: ${requestCount.value}/${REQUEST_LIMIT_PER_HOUR}`)

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

      console.log(`✅ N2YO radio passes API success for NORAD ${noradId}:`, {
        passesCount: n2yoData.info.passescount,
        transactionsCount: n2yoData.info.transactionscount
      })

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

      console.log(`📡 Fetching satellite positions for NORAD ${noradId} (${seconds}s)`)
      console.log(`📊 API requests used this hour: ${requestCount.value}/${REQUEST_LIMIT_PER_HOUR} (positions endpoint)`)

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
      
      // Increment request counter after successful API call
      incrementRequestCount()

      console.log(`✅ N2YO positions API success for NORAD ${noradId}:`, {
        positionsCount: positionsData.positions?.length || 0
      })

      // Debug: Log first position to see what fields are available
      if (positionsData.positions && positionsData.positions.length > 0) {
        console.log('🔍 First position sample:', positionsData.positions[0])
        console.log('🔍 Available fields:', Object.keys(positionsData.positions[0]))
      }

      // Convert N2YO positions to our format
      const positions = positionsData.positions.map((pos: any) => ({
        timestamp: pos.timestamp * 1000, // Convert to milliseconds
        azimuth: pos.azimuth,
        elevation: pos.elevation,
        distance: pos.distance || pos.sataltitude || pos.range || 0
      }))
      
      console.log('🔍 Mapped first position:', positions[0])

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

      console.log(`🔄 Fetching N2YO TLE data for NORAD ${noradId}`)

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

      console.log(`✅ N2YO TLE data retrieved for NORAD ${noradId}`)
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

      console.log('🔄 Testing N2YO API connection...')

      const response = await $fetch('/api/n2yo', {
        method: 'POST',
        body: {
          action: 'test',
          apiKey
        }
      })

      const success = response.success
      console.log(success ? '✅ N2YO API connection successful' : '❌ N2YO API connection failed')
      
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
    console.log('🗑️ N2YO cache cleared')
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
