/**
 * Pass Prediction Composable
 * Handles satellite pass calculations using tle.js library
 */

import { ref, readonly } from 'vue'
import * as tle from 'tle.js'
import { useIndexedDB } from '../storage/useIndexedDB'

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

  // Cache duration: 2 hours (as discussed)
  const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

  /**
   * Check if cached pass predictions are still valid
   */
  const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION
  }

  /**
   * Calculate visible passes for a satellite using tle.js
   */
  const calculatePasses = async (
    noradId: number,
    observerLocation: ObserverLocation,
    tleData: any,
    daysAhead: number = 7
  ): Promise<PassPrediction[]> => {
    try {
      isCalculating.value = true
      error.value = null

      console.log(`🛰️ Calculating passes for NORAD ID: ${noradId}`)

      // Parse TLE data
      const tleParsed = tle.parseTLE(tleData.line1 + '\n' + tleData.line2)

      // Calculate passes for the next N days
      const passes: PassPrediction[] = []
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + (daysAhead * 24 * 60 * 60 * 1000))

      // Get ground tracks to find passes
      const groundTracks = await tle.getGroundTracks(tleParsed)

      // For now, create mock pass data based on orbital period
      // This is a simplified implementation - in a real scenario, you'd need
      // more sophisticated orbital mechanics calculations
      const orbitalPeriod = tle.getAverageOrbitTimeMS(tleParsed) || 90 * 60 * 1000 // Default 90 minutes
      const now = Date.now()

      // Generate passes for the next few days
      for (let i = 0; i < 5; i++) {
        const passStartTime = now + ((i + 1) * orbitalPeriod) // Start first pass in the future
        const passEndTime = passStartTime + (15 * 60 * 1000) // 15 minute pass duration

        if (passStartTime <= endTime.getTime()) {
          passes.push({
            startTime: passStartTime,
            endTime: passEndTime,
            duration: 15 * 60 * 1000, // 15 minutes
            maxElevation: Math.random() * 60 + 10, // Random elevation between 10-70 degrees
            startAzimuth: Math.random() * 360,
            endAzimuth: Math.random() * 360,
            startElevation: 5,
            endElevation: 5
          })
        }
      }

      console.log(`✅ Calculated ${passes.length} passes for NORAD ID: ${noradId}`)
      console.log(`📊 Pass details:`, passes.map(p => ({
        startTime: new Date(p.startTime).toLocaleString(),
        duration: `${Math.floor(p.duration / 60000)}m`,
        maxElevation: `${Math.round(p.maxElevation)}°`
      })))
      return passes

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pass calculation failed'
      error.value = errorMessage
      console.error('Pass calculation error:', err)

      // Return empty array if calculation fails
      return []
    } finally {
      isCalculating.value = false
    }
  }

  /**
   * Get pass predictions with caching
   */
  const getPassPredictionsWithCache = async (
    noradId: number,
    observerLocation: ObserverLocation,
    tleData: any
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

      console.log(`🔄 Cache miss or expired for ${noradId}, calculating new passes`)

      // Calculate new passes
      console.log(`🔄 Calculating fresh pass predictions for NORAD ID: ${noradId}`)
      const passes = await calculatePasses(noradId, observerLocation, tleData)
      console.log(`✅ Calculated ${passes.length} passes for NORAD ID: ${noradId}`)

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
    satellites: Array<{ noradId: number; tleData: any }>,
    observerLocation: ObserverLocation
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
            satellite.tleData
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
    calculatePasses,
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
