/**
 * Pass Prediction Composable
 * Handles satellite pass calculations using N2YO API
 */

import { ref, readonly } from 'vue'
import { useIndexedDB } from '../storage/useIndexedDB'
import { useN2YO } from '../api/useN2YO'

export interface ObserverLocation {
  lat: number
  lng: number
  alt?: number
}

export interface PassPrediction {
  startTime: number
  endTime: number
  duration: number
  maxElevation: number
  startAzimuth: number
  endAzimuth: number
  startElevation: number
  endElevation: number
}

export interface PassPredictionData {
  noradId: number
  observerLocation: ObserverLocation
  passes: PassPrediction[]
  nextPassTime: number | null
  timestamp: number
}

export const usePassPrediction = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const isCalculating = ref<boolean>(false)

  // IndexedDB instance
  const {
    storePassPredictions,
    getPassPredictions,
    getAllPassPredictions,
    clearPassPredictions
  } = useIndexedDB()

  // N2YO API instance
  const { getRadioPasses, isLoading: n2yoLoading, error: n2yoError } = useN2YO()

  // Cache duration: 2 hours (as discussed)
  const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

  /**
   * Check if cached pass predictions are still valid
   */
  const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION
  }

  /**
   * Get passes from N2YO API and convert to our format
   */
  const getPassesFromN2YO = async (
    noradId: number,
    observerLocation: ObserverLocation,
    minElevation: number = 10,
    days: number = 7,
    apiKey: string
  ): Promise<PassPrediction[]> => {
    try {
      console.log(`🛰️ Fetching N2YO passes for NORAD ID: ${noradId}`)
      
      const n2yoResponse = await getRadioPasses(
        noradId,
        observerLocation.lat,
        observerLocation.lng,
        observerLocation.alt || 0,
        days,
        minElevation,
        apiKey
      )

      // Convert N2YO passes to our format
      const passes: PassPrediction[] = n2yoResponse.passes.map(pass => ({
        startTime: pass.startUTC * 1000, // Convert Unix timestamp to milliseconds
        endTime: pass.endUTC * 1000,
        duration: (pass.endUTC - pass.startUTC) * 1000, // Duration in milliseconds
        maxElevation: pass.maxEl,
        startAzimuth: pass.startAz,
        endAzimuth: pass.endAz,
        startElevation: pass.startEl,
        endElevation: pass.endEl
      }))

      console.log(`✅ Got ${passes.length} passes from N2YO for NORAD ID: ${noradId}`)
      return passes

    } catch (err) {
      console.error(`❌ Failed to get N2YO passes for NORAD ID: ${noradId}`, err)
      throw err
    }
  }


  /**
   * Get pass predictions with caching (N2YO only)
   */
  const getPassPredictionsWithCache = async (
    noradId: number,
    observerLocation: ObserverLocation,
    minElevation: number = 10,
    n2yoApiKey: string
  ): Promise<PassPrediction[]> => {
    try {
      isLoading.value = true
      error.value = null

      console.log(`🔍 Checking cache for NORAD ID: ${noradId}`)

      // Check cache first
      const cachedData = await getPassPredictions(noradId, observerLocation)
      console.log(`📋 Cache check result for ${noradId}:`, cachedData ? 'Found' : 'Not found')

      if (cachedData && isCacheValid(cachedData.timestamp)) {
        console.log(`📋 Using cached pass predictions for NORAD ID: ${noradId}`)
        console.log(`📋 Cached passes count: ${cachedData.passes?.length || 0}`)
        return cachedData.passes
      }

      console.log(`🔄 Cache miss or expired for ${noradId}, fetching from N2YO`)

      // Get passes from N2YO API
      console.log(`🛰️ Getting passes from N2YO API for NORAD ID: ${noradId}`)
      const passes = await getPassesFromN2YO(noradId, observerLocation, minElevation, 7, n2yoApiKey)
      console.log(`✅ Successfully got ${passes.length} passes from N2YO for NORAD ID: ${noradId}`)

      // Cache the results
      console.log(`💾 Storing ${passes.length} passes for NORAD ID: ${noradId} in database`)
      await storePassPredictions(noradId, passes, observerLocation)
      console.log(`✅ Successfully stored passes for NORAD ID: ${noradId}`)

      return passes

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get pass predictions'
      error.value = errorMessage
      console.error('Pass prediction error:', err)

      // Return cached data even if expired as fallback
      const cachedData = await getPassPredictions(noradId, observerLocation)
      if (cachedData) {
        console.log(`⚠️ Using expired cached data for NORAD ID: ${noradId}`)
        return cachedData.passes
      }

      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get all pass predictions sorted by next pass time
   */
  const getAllPassPredictionsSorted = async (): Promise<PassPredictionData[]> => {
    try {
      isLoading.value = true
      error.value = null

      const allPasses = await getAllPassPredictions()

      // Filter out expired passes and sort by next pass time
      const validPasses = allPasses
        .filter(pass => pass.nextPassTime && pass.nextPassTime > Date.now())
        .sort((a, b) => a.nextPassTime! - b.nextPassTime!)

      console.log(`📊 Retrieved ${validPasses.length} valid pass predictions`)
      return validPasses

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get all pass predictions'
      error.value = errorMessage
      console.error('Get all pass predictions error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Calculate passes for multiple satellites
   */
  const calculatePassesForSatellites = async (
    satellites: Array<{ noradId: number }>,
    observerLocation: ObserverLocation,
    minElevation: number = 10,
    n2yoApiKey: string
  ): Promise<Map<number, PassPrediction[]>> => {
    try {
      isLoading.value = true
      error.value = null

      const results = new Map<number, PassPrediction[]>()

      console.log(`🛰️ Calculating passes for ${satellites.length} satellites`)
      console.log(`🛰️ Observer location:`, observerLocation)

      // Calculate passes for each satellite
      for (const satellite of satellites) {
        try {
          console.log(`🔄 Processing satellite ${satellite.noradId}`)
          const passes = await getPassPredictionsWithCache(
            satellite.noradId,
            observerLocation,
            minElevation,
            n2yoApiKey
          )
          console.log(`✅ Got ${passes.length} passes for satellite ${satellite.noradId}`)
          results.set(satellite.noradId, passes)
        } catch (err) {
          console.error(`Failed to calculate passes for NORAD ID: ${satellite.noradId}`, err)
          results.set(satellite.noradId, [])
        }
      }

      console.log(`✅ Completed pass calculations for ${results.size} satellites`)
      return results

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate passes for satellites'
      error.value = errorMessage
      console.error('Calculate passes for satellites error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Format pass time for display
   */
  const formatPassTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  /**
   * Format pass duration
   */
  const formatPassDuration = (durationMs: number): string => {
    const minutes = Math.floor(durationMs / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)
    return `${minutes}m ${seconds}s`
  }

  /**
   * Get next pass time for a satellite
   */
  const getNextPassTime = (passes: PassPrediction[]): number | null => {
    if (!passes || passes.length === 0) return null

    const now = Date.now()
    const futurePasses = passes.filter(pass => pass.startTime > now)

    return futurePasses.length > 0 ? futurePasses[0]?.startTime || null : null
  }

  /**
   * Clear all pass prediction cache
   */
  const clearCache = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      await clearPassPredictions()
      console.log('🗑️ Pass prediction cache cleared')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear pass prediction cache'
      error.value = errorMessage
      console.error('Clear pass prediction cache error:', err)
      throw err
    } finally {
      isLoading.value = false
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
    isCalculating: readonly(isCalculating),

    // Methods
    getPassPredictionsWithCache,
    getAllPassPredictionsSorted,
    calculatePassesForSatellites,
    formatPassTime,
    formatPassDuration,
    getNextPassTime,
    clearCache,
    clearError,
    isCacheValid
  }
}
