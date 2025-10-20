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
    clearPassPredictions,
    clearPassPredictionsForSatellite
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
   * Get passes from N2YO API and convert to our format (using radio passes for ham radio use)
   */
  const getPassesFromN2YO = async (
    noradId: number,
    observerLocation: ObserverLocation,
    minElevation: number = 10,
    days: number = 7,
    apiKey: string
  ): Promise<PassPrediction[]> => {
    try {
      console.log(`🛰️ Fetching N2YO radio passes for NORAD ID: ${noradId}`)
      
      const n2yoResponse = await getRadioPasses(
        noradId,
        observerLocation.lat,
        observerLocation.lng,
        observerLocation.alt || 0,
        days,
        minElevation,
        apiKey
      )

      console.log(`🔍 N2YO Response for NORAD ${noradId}:`, n2yoResponse)
      console.log(`🔍 Response keys:`, Object.keys(n2yoResponse || {}))
      console.log(`🔍 Response.passes type:`, typeof n2yoResponse?.passes)
      console.log(`🔍 Response.passes isArray:`, Array.isArray(n2yoResponse?.passes))
      console.log(`🔍 Response.passes length:`, n2yoResponse?.passes?.length)
      console.log(`🔍 Response.info:`, n2yoResponse?.info)

      // Check if response has the expected structure
      if (!n2yoResponse || !n2yoResponse.passes || !Array.isArray(n2yoResponse.passes)) {
        console.warn(`⚠️ Invalid N2YO response structure for NORAD ID: ${noradId}`)
        console.warn('Response:', JSON.stringify(n2yoResponse, null, 2))
        return []
      }

      // Debug: Log the first pass to see what fields are available
      if (n2yoResponse.passes.length > 0) {
        const firstPass = n2yoResponse.passes[0]
        if (firstPass) {
          console.log(`🔍 First radio pass data for NORAD ${noradId}:`, firstPass)
          console.log(`🔍 Available fields:`, Object.keys(firstPass))
          console.log(`🔍 maxEl value:`, firstPass.maxEl)
          console.log(`🔍 startAz value:`, firstPass.startAz)
          console.log(`🔍 endAz value:`, firstPass.endAz)
        }
      }

      // Convert N2YO radio passes to our format
      // Note: radio passes do NOT include startEl/endEl (not needed for radio ops)
      const allPasses: PassPrediction[] = n2yoResponse.passes.map(pass => {
        console.log(`🔍 Processing radio pass:`, pass)
        console.log(`🔍 maxEl: ${pass.maxEl}`)
        
        const maxElevation = pass.maxEl || 0
        
        return {
          startTime: pass.startUTC * 1000, // Convert Unix timestamp to milliseconds
          endTime: pass.endUTC * 1000,
          duration: (pass.endUTC - pass.startUTC) * 1000, // Duration in milliseconds
          maxElevation: maxElevation,
          startAzimuth: pass.startAz || 0,
          endAzimuth: pass.endAz || 0,
          startElevation: 0, // Not provided by radio passes API (not needed)
          endElevation: 0 // Not provided by radio passes API (not needed)
        }
      })

      // Filter out passes that have already ended
      const currentTime = Date.now()
      const futurePasses = allPasses.filter(pass => pass.endTime > currentTime)
      
      console.log(`📊 N2YO returned ${allPasses.length} total passes, ${futurePasses.length} future passes for NORAD ID: ${noradId}`)
      
      if (allPasses.length > futurePasses.length) {
        const pastPasses = allPasses.length - futurePasses.length
        console.log(`⏰ Filtered out ${pastPasses} past passes for NORAD ID: ${noradId}`)
      }

      return futurePasses

    } catch (err) {
      console.error(`❌ Failed to get N2YO passes for NORAD ID: ${noradId}`, err)
      // Return empty array instead of throwing to prevent breaking the entire process
      return []
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
        
        // Filter out expired passes from cache
        const currentTime = Date.now()
        const futurePasses = cachedData.passes?.filter((pass: PassPrediction) => pass.endTime > currentTime) || []
        
        if (cachedData.passes && cachedData.passes.length > futurePasses.length) {
          const expiredPasses = cachedData.passes.length - futurePasses.length
          console.log(`⏰ Filtered out ${expiredPasses} expired passes from cache for NORAD ID: ${noradId}`)
        }
        
        return futurePasses
      }

      console.log(`🔄 Cache miss or expired for ${noradId}, fetching from N2YO`)

      // Get passes from N2YO API
      console.log(`🛰️ Getting passes from N2YO API for NORAD ID: ${noradId}`)
      const passes = await getPassesFromN2YO(noradId, observerLocation, minElevation, 7, n2yoApiKey)
      console.log(`✅ Successfully got ${passes.length} passes from N2YO for NORAD ID: ${noradId}`)
      
      // If no passes returned, log a warning but continue
      if (passes.length === 0) {
        console.warn(`⚠️ No passes returned for NORAD ID: ${noradId}. This might be due to API limits, invalid satellite, or no passes in the requested time period.`)
      }

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

  /**
   * Clear expired passes from cache (passes that have already ended)
   */
  const clearExpiredPasses = async (): Promise<void> => {
    try {
      console.log('🧹 Clearing expired passes from cache...')
      
      // Get all cached pass predictions
      const allCachedData = await getAllPassPredictions()
      const currentTime = Date.now()
      
      let totalExpired = 0
      
      // Group passes by NORAD ID
      const passesByNoradId = new Map<number, any[]>()
      
      for (const passData of allCachedData) {
        if (passData && passData.noradId) {
          if (!passesByNoradId.has(passData.noradId)) {
            passesByNoradId.set(passData.noradId, [])
          }
          passesByNoradId.get(passData.noradId)!.push(passData)
        }
      }
      
      // Process each satellite's passes
      for (const [noradId, passes] of passesByNoradId) {
        if (passes && passes.length > 0) {
          // Get the first pass data to extract observer location
          const firstPass = passes[0]
          const observerLocation = firstPass.observerLocation
          
          // Special handling for geostationary satellites
          const geostationarySatellites = [43700] // QO-100 and other GEO satellites
          const isGeostationary = geostationarySatellites.includes(noradId)
          
          let futurePasses: any[]
          
          if (isGeostationary) {
            console.log(`🛰️ NORAD ID ${noradId} is geostationary - keeping all passes (stationary satellite)`)
            // For geostationary satellites, keep all passes as they don't "pass" in the traditional sense
            futurePasses = passes
          } else {
            // Filter to only future passes for non-geostationary satellites
            futurePasses = passes.filter((pass: any) => {
              // Check if the pass has ended
              if (pass.endTime && pass.endTime <= currentTime) {
                return false
              }
              // Check if the pass has a next pass time and it's in the future
              if (pass.nextPassTime && pass.nextPassTime <= currentTime) {
                return false
              }
              return true
            })
          }
          
          const expiredCount = passes.length - futurePasses.length
          
          if (expiredCount > 0) {
            console.log(`🧹 Clearing ${expiredCount} expired passes for NORAD ID: ${noradId}`)
            
            // Update cache with only future passes
            if (futurePasses.length > 0) {
              // Convert back to PassPrediction format
              const passPredictions = futurePasses.map((pass: any) => ({
                startTime: pass.startTime,
                endTime: pass.endTime,
                duration: pass.duration,
                maxElevation: pass.maxElevation,
                startAzimuth: pass.startAzimuth,
                endAzimuth: pass.endAzimuth,
                startElevation: pass.startElevation,
                endElevation: pass.endElevation
              }))
              await storePassPredictions(noradId, passPredictions, observerLocation)
            } else {
              // Remove from cache if no future passes
              await clearPassPredictionsForSatellite(noradId)
            }
            
            totalExpired += expiredCount
          }
        }
      }
      
      if (totalExpired > 0) {
        console.log(`✅ Cleared ${totalExpired} expired passes from cache`)
      } else {
        console.log('✅ No expired passes found in cache')
      }
      
    } catch (err) {
      console.error('Failed to clear expired passes:', err)
      throw err
    }
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
    clearExpiredPasses,
    clearError,
    isCacheValid
  }
}
