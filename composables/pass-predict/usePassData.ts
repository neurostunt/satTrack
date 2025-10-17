/**
 * Pass Data Composable
 * Handles loading and managing pass prediction data
 */

import { ref, type Ref } from 'vue'
import { useIndexedDB } from '../storage/useIndexedDB'

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
  const { getAllPassPredictions, getAllTransponderData } = useIndexedDB()

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
        lat: settings.value.observerLatitude || 0,
        lng: settings.value.observerLongitude || 0,
        alt: settings.value.observerAltitude || 0
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
            const geostationarySatellites = [43700] // QO-100 and other GEO satellites
            const isGeostationary = geostationarySatellites.includes(storedPass.noradId)
            
            let validPasses = storedPass.passes
            if (!isGeostationary) {
              validPasses = storedPass.passes.filter((pass: any) => pass.endTime > currentTime)
            }
            
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

            combined[satellite.noradId] = {
              satellite: {
                name: satellite.name,
                status: satellite.status || 'alive',
                names: satellite.names || satellite.name
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
   */
  const filterTransmitters = (transmitters: any[]) => {
    if (!transmitters || !Array.isArray(transmitters)) return []

    return transmitters.filter(transmitter => {
      if (!transmitter.description) return true

      const desc = transmitter.description.toLowerCase()
      const filters = settings.value.transmitterFilters || {}

      // Check each filter type
      if (desc.includes('amateur') || desc.includes('ham')) {
        return filters.amateur !== false
      }
      if (desc.includes('fm')) {
        return filters.fm !== false
      }
      if (desc.includes('cw')) {
        return filters.cw !== false
      }
      if (desc.includes('aprs')) {
        return filters.aprs !== false
      }
      if (desc.includes('sstv')) {
        return filters.sstv !== false
      }
      if (desc.includes('telemetry')) {
        return filters.telemetry !== false
      }
      if (desc.includes('voice')) {
        return filters.voice !== false
      }
      if (desc.includes('repeater')) {
        return filters.repeater !== false
      }
      if (desc.includes('beacon')) {
        return filters.beacon !== false
      }
      if (desc.includes('weather') || desc.includes('apt')) {
        return filters.weather !== false
      }
      if (desc.includes('communication') || desc.includes('comm')) {
        return filters.communication !== false
      }

      // If no specific type matches, show it (default behavior)
      return true
    })
  }

  return {
    // State
    passPredictions,
    combinedData,
    observerLocation,
    
    // Methods
    loadPassPredictions,
    loadStoredTransmitterData,
    filterTransmitters
  }
}
