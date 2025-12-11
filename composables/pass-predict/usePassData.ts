/**
 * Pass Data Composable
 * Handles loading and managing pass prediction data
 */

import type { Ref } from 'vue'
import { useIndexedDB } from '../storage/useIndexedDB'
import { usePassPrediction } from '../satellite/usePassPrediction'
import { getSatnogsImageUrl } from '~/utils/satelliteImageUtils'

export const usePassData = (
  settings: Ref<any>,
  getNextPassTime: (passes: any[]) => number | null,
  formatPassTime: (timestamp: number) => string
) => {
  // Reactive state
  const passPredictions = ref(new Map())
  const combinedData = ref<any>({})
  const observerLocation = ref({ lat: 0, lng: 0, alt: 0 })

  // IndexedDB instance
  const { getAllPassPredictions, getAllTransponderData, clearPassPredictions } = useIndexedDB()

  // Pass prediction composable
  const { calculatePassesForSatellites } = usePassPrediction()

  /**
   * Load stored pass predictions from database
   */
  const loadPassPredictions = async () => {
    try {
      if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
        return
      }

      // Get observer location from settings
      observerLocation.value = {
        lat: settings.value.observationLocation?.latitude || 0,
        lng: settings.value.observationLocation?.longitude || 0,
        alt: settings.value.observationLocation?.altitude || 0
      }

      // Load all stored pass predictions
      const allStoredPasses = await getAllPassPredictions()

      // Convert stored passes to the format expected by the UI
      const predictionsMap = new Map()

      if (Array.isArray(allStoredPasses)) {
        allStoredPasses.forEach((storedPass: any) => {
          if (storedPass.noradId && storedPass.passes && Array.isArray(storedPass.passes)) {
            // Filter out expired passes when loading from database
            const currentTime = Date.now()

            let validPasses = storedPass.passes
            // Check if ANY pass is geostationary (they all should be the same for a satellite)
            const hasGeostationaryPass = storedPass.passes.some((pass: any) => {
              const azimuthDiff = Math.abs(pass.startAzimuth - pass.endAzimuth)
              const duration = pass.endTime - pass.startTime
              const durationHours = duration / (1000 * 60 * 60)
              return azimuthDiff < 5 && durationHours > 12
            })

            if (!hasGeostationaryPass) {
              validPasses = storedPass.passes.filter((pass: any) => pass.endTime > currentTime)
            }

            // Filter out passes with max elevation below minimum elevation setting
            const minElevation = settings.value?.minElevation || 20
            validPasses = validPasses.filter((pass: any) => {
              return pass.maxElevation >= minElevation
            })

            if (validPasses.length > 0) {
              predictionsMap.set(storedPass.noradId, validPasses)
            }
          }
        })
      }

      passPredictions.value = predictionsMap

    } catch (error) {
      console.error('❌ Failed to load pass predictions:', error)
    }
  }

  /**
   * Load stored transmitter data
   */
  const loadStoredTransmitterData = async () => {
    try {
      const transmitterData = await getAllTransponderData()

      // Convert array to object keyed by NORAD ID
      const transmitterDataObj: any = {}
      if (Array.isArray(transmitterData)) {
        transmitterData.forEach((data: any) => {
          if (data.noradId) {
            // Handle different data structures
            if (Array.isArray(data.data)) {
              transmitterDataObj[data.noradId] = data.data
            } else if (data.data && data.data.transmitters) {
              transmitterDataObj[data.noradId] = data.data.transmitters
            } else if (data.transmitters) {
              transmitterDataObj[data.noradId] = data.transmitters
            } else {
              transmitterDataObj[data.noradId] = data.data || data
            }
          }
        })
      } else if (transmitterData && typeof transmitterData === 'object') {
        Object.keys(transmitterData).forEach(noradId => {
          transmitterDataObj[noradId] = (transmitterData as any)[noradId]
        })
      }

      // Build combined data from tracked satellites with pass predictions
      const combined: any = {}
      if (settings.value.trackedSatellites) {
        // Create array of satellites with pass data for sorting
        const satellitesWithPasses = settings.value.trackedSatellites.map((satellite: any) => {
          const noradId = parseInt(satellite.noradId)
          const passes = passPredictions.value.get(noradId) || []
          const nextPassTime = getNextPassTime(passes)

          return {
            ...satellite,
            noradId,
            nextPassTime: nextPassTime || Number.MAX_SAFE_INTEGER
          }
        })

        // Sort satellites by next pass time
        satellitesWithPasses.sort((a: any, b: any) => a.nextPassTime - b.nextPassTime)

        // Build combined data in sorted order
        satellitesWithPasses.forEach((satellite: any) => {
          if (satellite.noradId) {
            const transmitters = transmitterDataObj[satellite.noradId] || []
            const passes = passPredictions.value.get(satellite.noradId) || []
            const nextPassTime = getNextPassTime(passes)

            // Convert SatNOGS relative image path to full URL if available
            let imageUrl = undefined
            if (satellite.image) {
              imageUrl = getSatnogsImageUrl(satellite.image) || undefined
            }

            combined[satellite.noradId] = {
              satellite: {
                name: satellite.name,
                status: satellite.status || 'alive',
                names: satellite.names || satellite.name,
                image: imageUrl // Full URL from SatNOGS or undefined
              },
              timestamp: new Date().toISOString(),
              transmitters: filterTransmitters(transmitters),
              passPredictions: {
                passes: passes,
                nextPassTime: nextPassTime,
                nextPassFormatted: nextPassTime ? formatPassTime(nextPassTime) : 'No upcoming passes',
                passCount: passes.length
              }
            }
          }
        })
      }

      combinedData.value = combined
    } catch (error) {
      console.error('Failed to load stored transmitter data:', error)
    }
  }

  /**
   * Filter transmitters based on settings
   * Note: This function is kept for backward compatibility but filtering
   * is now done in PassDetails component using the categorization utility
   */
  const filterTransmitters = (transmitters: any[]) => {
    if (!transmitters || !Array.isArray(transmitters)) return transmitters
    
    // Don't filter here - let PassDetails component handle filtering
    // This ensures consistent filtering logic
    return transmitters
  }

  /**
   * Check if cached data is stale and needs refresh
   */
  const isDataStale = (): boolean => {
    // Check if we have any cached data
    if (passPredictions.value.size === 0) {
      return true
    }

    // Check if any passes are very old (more than 2 hours)
    const currentTime = Date.now()
    const twoHoursAgo = currentTime - (2 * 60 * 60 * 1000)

    for (const passes of passPredictions.value.values()) {
      if (passes.length > 0) {
        // If the first pass is very old, data might be stale
        const firstPass = passes[0]
        if (firstPass.startTime < twoHoursAgo) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Calculate fresh pass predictions using N2YO visual passes API
   * IMPORTANT: Preserves active passes (currently passing) to prevent changing predicted path during active tracking
   */
  const calculateFreshPassPredictions = async () => {
    try {
      if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
        console.log('⚠️ No tracked satellites configured')
        return
      }

      if (!settings.value.n2yoApiKey) {
        console.log('⚠️ N2YO API key not configured')
        return
      }

      console.log('🔄 Calculating fresh pass predictions using visual passes API...')
      console.log('🛰️ Observer location:', observerLocation.value)
      console.log('🛰️ Tracked satellites:', settings.value.trackedSatellites.length)

      // Prepare satellites data
      const satellites = settings.value.trackedSatellites.map((sat: any) => ({
        noradId: parseInt(sat.noradId)
      }))

      // Calculate passes using visual passes API
      const freshPasses = await calculatePassesForSatellites(
        satellites,
        observerLocation.value,
        settings.value.minElevation || 20, // Use configured minElevation, default to 20
        settings.value.n2yoApiKey
      )

      console.log('✅ Fresh pass predictions calculated:', freshPasses.size, 'satellites')

      // Preserve active passes (currently passing) to prevent changing predicted path during active tracking
      const currentTime = Date.now()
      const preservedPasses = new Map()

      // First, identify and preserve active passes from existing predictions
      for (const [noradId, existingPasses] of passPredictions.value.entries()) {
        if (Array.isArray(existingPasses)) {
          const activePasses = existingPasses.filter((pass: any) => {
            // Pass is active if current time is between startTime and endTime
            return currentTime >= pass.startTime && currentTime <= pass.endTime
          })

          if (activePasses.length > 0) {
            preservedPasses.set(noradId, activePasses)
            console.log(`🔒 Preserving ${activePasses.length} active pass(es) for NORAD ${noradId} to prevent path changes`)
          }
        }
      }

      // Merge fresh passes with preserved active passes
      // For satellites with active passes, keep the active passes and add future passes from fresh data
      for (const [noradId, freshPassesForSat] of freshPasses.entries()) {
        if (preservedPasses.has(noradId)) {
          // This satellite has an active pass - preserve it and add future passes
          const activePasses = preservedPasses.get(noradId) || []
          const futurePasses = (freshPassesForSat || []).filter((pass: any) => pass.startTime > currentTime)
          preservedPasses.set(noradId, [...activePasses, ...futurePasses])
        } else {
          // No active pass - use fresh data
          preservedPasses.set(noradId, freshPassesForSat)
        }
      }

      // Update the pass predictions with merged data
      passPredictions.value = preservedPasses

    } catch (error) {
      console.error('❌ Failed to calculate fresh pass predictions:', error)
    }
  }

  /**
   * Clear pass predictions and force refresh
   */
  const clearAndRefreshPassPredictions = async () => {
    try {
      console.log('🔄 Clearing old pass predictions to force refresh with radio passes data...')
      await clearPassPredictions()
      passPredictions.value = new Map()
      console.log('✅ Pass predictions cleared, will fetch fresh data on next load')
    } catch (error) {
      console.error('❌ Failed to clear pass predictions:', error)
    }
  }

  return {
    // State
    passPredictions,
    combinedData,
    observerLocation,

    // Methods
    loadPassPredictions,
    loadStoredTransmitterData,
    filterTransmitters,
    calculateFreshPassPredictions,
    clearAndRefreshPassPredictions,
    isDataStale
  }
}
