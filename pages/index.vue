<template>
  <NuxtLayout name="default" title="🛰️ SatTrack" subtitle="Satellite Tracking System">
    <!-- Observation Location -->
    <ObservationLocation
      :latitude="settings.observationLocation?.latitude || 0"
      :longitude="settings.observationLocation?.longitude || 0"
      :altitude="settings.observationLocation?.altitude || 0"
      :grid-square="settings.gridSquare || ''"
    />

    <!-- Combined Satellite Data -->
    <CombinedSatelliteData
      :combined-data="combinedData"
      :get-t-l-e-data="getTLEData"
      :format-frequency="formatFrequency"
    />
  </NuxtLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import ObservationLocation from '~/components/common/ObservationLocation.vue'
import CombinedSatelliteData from '~/components/common/CombinedSatelliteData.vue'
import { useSettings } from '~/composables/storage/useSettings'
import { useTLEData } from '~/composables/api/useTLEData'
import { useIndexedDB } from '~/composables/storage/useIndexedDB'
import indexedDBStorage from '~/utils/indexedDBStorage'
import { getSatnogsImageUrl } from '~/utils/satelliteImageUtils'

// Import composables
const {
  settings,
  loadSettings
} = useSettings()

const {
  getTLEData,
  initializeTLEData
} = useTLEData()

const {
  getAllTransponderData
} = useIndexedDB()

// Reactive state
const combinedData = ref({})

// Load stored transmitter data
const loadStoredTransmitterData = async () => {
  try {
    const transmitterData = await getAllTransponderData()

    // Convert array to object keyed by NORAD ID
    const transmitterDataObj = {}
    if (Array.isArray(transmitterData)) {
      transmitterData.forEach(data => {
        if (data.noradId) {
          // Handle different data structures
          if (Array.isArray(data.data)) {
            // Newer format: {noradId: 25544, data: Array(38), timestamp: '...'}
            transmitterDataObj[data.noradId] = data.data
          } else if (data.data && data.data.transmitters) {
            // Older format: {noradId: '25544', data: {transmitters: [...]}, timestamp: '...'}
            transmitterDataObj[data.noradId] = data.data.transmitters
          } else if (data.transmitters) {
            // Fallback: direct transmitters property
            transmitterDataObj[data.noradId] = data.transmitters
          } else {
            // Last resort: use the data as-is
            transmitterDataObj[data.noradId] = data.data || data
          }
        }
      })
    } else if (transmitterData && typeof transmitterData === 'object') {
      Object.keys(transmitterData).forEach(noradId => {
        transmitterDataObj[noradId] = transmitterData[noradId]
      })
    }

    // Build combined data from tracked satellites
    const combined = {}
    if (settings.value.trackedSatellites) {
      settings.value.trackedSatellites.forEach(satellite => {
        if (satellite.noradId) {
          const transmitters = transmitterDataObj[satellite.noradId] || []

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
              image: imageUrl, // Full URL from SatNOGS or undefined
              description: satellite.description || undefined // Description if available
            },
            timestamp: new Date().toISOString(),
            transmitters: filterTransmitters(transmitters)
          }
        }
      })
    }

    combinedData.value = combined

    // Load recommended satellites descriptions as fallback (from static JSON file, no API)
    await loadRecommendedSatellitesDescriptions()
  } catch (error) {
    console.error('Failed to load stored transmitter data:', error)
  }
}

/**
 * Helper function to apply SATCAT data to combined data
 */
const applySatcatData = (noradId, satcatData) => {
  if (!combinedData.value[noradId]) return

  combinedData.value = {
    ...combinedData.value,
    [noradId]: {
      ...combinedData.value[noradId],
      satellite: {
        ...combinedData.value[noradId].satellite,
        objectId: satcatData.objectId,
        objectType: satcatData.objectType,
        opsStatusCode: satcatData.opsStatusCode,
        owner: satcatData.owner,
        launchSite: satcatData.launchSite,
        rcs: satcatData.rcs,
        orbitCenter: satcatData.orbitCenter,
        orbitType: satcatData.orbitType,
        ...(satcatData.apogee && !combinedData.value[noradId].satellite.apogee && { apogee: satcatData.apogee }),
        ...(satcatData.perigee && !combinedData.value[noradId].satellite.perigee && { perigee: satcatData.perigee }),
        ...(satcatData.inclination && !combinedData.value[noradId].satellite.inclination && { inclination: satcatData.inclination }),
        ...(satcatData.period && !combinedData.value[noradId].satellite.period && { period: satcatData.period })
      }
    }
  }
}

/**
 * Load SATCAT data from IndexedDB cache
 * Always uses cached data if available (no expiration check - data is refreshed in settings)
 */
const loadSatcatDataFromCache = async () => {
  if (!settings.value.trackedSatellites) return

  try {
    for (const satellite of settings.value.trackedSatellites) {
      if (!satellite.noradId) continue

      const cached = await indexedDBStorage.getSatcatData(satellite.noradId)
      if (cached) {
        applySatcatData(satellite.noradId, cached.data)
      }
    }
  } catch (error) {
    console.error('Failed to load SATCAT data from cache:', error)
  }
}

// Filter transmitters based on settings
const filterTransmitters = (transmitters) => {
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

import { formatFrequencyValue } from '~/utils/frequencyUtils'

const formatFrequency = (transmitter) => {
  if (!transmitter) return 'Unknown'

  const frequency = transmitter.downlink_low ||
                   transmitter.uplink_low ||
                   transmitter.downlink_high ||
                   transmitter.uplink_high ||
                   transmitter.frequency ||
                   transmitter.downlink_frequency ||
                   transmitter.uplink_frequency

  if (!frequency) return 'Unknown'
  return formatFrequencyValue(frequency, 3)
}

// Watch for changes in transmitter filters and reload data
watch(() => settings.value.transmitterFilters, async () => {
  await loadStoredTransmitterData()
}, { deep: true })

// Load recommended satellites descriptions as fallback
const loadRecommendedSatellitesDescriptions = async () => {
  try {
    const recommended = await $fetch('/recommended-satellites-belgrade.json')
    if (recommended?.recommendedSatellites) {
      const descriptionsMap = {}
      recommended.recommendedSatellites.forEach(sat => {
        if (sat.noradId && sat.description) {
          descriptionsMap[sat.noradId] = sat.description
        }
      })

      // Update combined data with descriptions from recommended file if not already present
      // Use a new object to ensure reactivity
      const updatedData = { ...combinedData.value }
      Object.keys(updatedData).forEach(noradId => {
        if (!updatedData[noradId]?.satellite?.description && descriptionsMap[noradId]) {
          updatedData[noradId] = {
            ...updatedData[noradId],
            satellite: {
              ...updatedData[noradId].satellite,
              description: descriptionsMap[noradId]
            }
          }
        }
      })
      combinedData.value = updatedData
    }
  } catch {
    // Silently fail - descriptions are optional
  }
}

/**
 * Apply SatNOGS info (launch date, operator, countries, website, decayed/deployed, description, image)
 */
const applySatnogsInfo = (noradId, satData) => {
  if (!combinedData.value[noradId] || !satData) return

  const launchDate = satData?.launched ? new Date(satData.launched).toLocaleDateString() : null
  const operator = satData?.operator && satData.operator !== 'None' ? satData.operator : null
  const countries = satData?.countries || null
  const website = satData?.website || null
  const decayed = satData?.decayed ? new Date(satData.decayed).toLocaleDateString() : null
  const deployed = satData?.deployed ? new Date(satData.deployed).toLocaleDateString() : null
  const description = satData?.description || satData?.names || null

  // Update the combined data reactively
  combinedData.value = {
    ...combinedData.value,
    [noradId]: {
      ...combinedData.value[noradId],
      satellite: {
        ...combinedData.value[noradId].satellite,
        ...(launchDate && { launchDate }),
        ...(operator && { operator }),
        ...(countries && { countries }),
        ...(website && { website }),
        ...(decayed && { decayed }),
        ...(deployed && { deployed }),
        ...(description && !combinedData.value[noradId].satellite.description && { description }),
        // If SatNOGS provides an image, keep the stored path (converted later)
        ...(satData.image && !combinedData.value[noradId].satellite.image && { image: getSatnogsImageUrl(satData.image) || combinedData.value[noradId].satellite.image })
      }
    }
  }
}

/**
 * Load SatNOGS info from IndexedDB cache (24h TTL)
 */
const loadSatnogsInfoFromCache = async () => {
  if (!settings.value.trackedSatellites) return

  try {
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
    const now = Date.now()

    for (const satellite of settings.value.trackedSatellites) {
      if (!satellite.noradId) continue

      const cached = await indexedDBStorage.getSatnogsInfo(satellite.noradId)
      if (cached && (now - cached.timestamp) < CACHE_DURATION_MS) {
        applySatnogsInfo(satellite.noradId, cached.data)
      }
    }
  } catch (error) {
    console.error('Failed to load SatNOGS info from cache:', error)
  }
}

// Load data on mount - only from IndexedDB, no API calls
onMounted(async () => {
  await loadSettings()
  await initializeTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken)
  
  // Load cached data from IndexedDB only - no API fetching
  await loadStoredTransmitterData()
  await loadSatnogsInfoFromCache()
  await loadSatcatDataFromCache()
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
