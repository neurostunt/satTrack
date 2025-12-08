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
import { getSatnogsImageUrl } from '~/utils/satelliteImageUtils'

// Import composables
const {
  settings,
  loadSettings,
  saveSettings
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

// CTCSS parsing function
const parseCTCSS = (description) => {
  if (!description) return null

  // Look for CTCSS/subtone patterns like "67.0 Hz", "67.0", "CTCSS 67.0", etc.
  const ctcssPatterns = [
    /(\d+\.?\d*)\s*Hz/i,
    /CTCSS\s*(\d+\.?\d*)/i,
    /subtone\s*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*CTCSS/i
  ]

  for (const pattern of ctcssPatterns) {
    const match = description.match(pattern)
    if (match) {
      return parseFloat(match[1])
    }
  }

  return null
}

// Load stored transmitter data
const loadStoredTransmitterData = async () => {
  try {
    const transmitterData = await getAllTransponderData()
    console.log('🔍 Debug: Raw transmitter data from IndexedDB:', transmitterData)
    console.log('🔍 Debug: Type of transmitter data:', typeof transmitterData)
    console.log('🔍 Debug: Is array?', Array.isArray(transmitterData))

    // Convert array to object keyed by NORAD ID
    const transmitterDataObj = {}
    if (Array.isArray(transmitterData)) {
      transmitterData.forEach(data => {
        console.log('🔍 Debug: Processing array item:', data)
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
      console.log('🔍 Debug: Processing object keys:', Object.keys(transmitterData))
      Object.keys(transmitterData).forEach(noradId => {
        transmitterDataObj[noradId] = transmitterData[noradId]
      })
    }

    console.log('🔍 Debug: Transmitter data converted to object:', Object.keys(transmitterDataObj))
    console.log('🔍 Debug: Sample transmitter data for ISS (25544):', transmitterDataObj['25544'])
    console.log('🔍 Debug: First ISS transmitter:', transmitterDataObj['25544']?.[0])

    // Analyze transmitter types for filtering
    const allTransmitters = Object.values(transmitterDataObj).flat()
    const transmitterTypes = new Set()
    const transmitterModes = new Set()
    const transmitterServices = new Set()

    allTransmitters.forEach(transmitter => {
      if (transmitter.description) {
        const desc = transmitter.description.toLowerCase()
        if (desc.includes('amateur') || desc.includes('ham')) transmitterTypes.add('amateur')
        if (desc.includes('fm')) transmitterTypes.add('fm')
        if (desc.includes('cw')) transmitterTypes.add('cw')
        if (desc.includes('aprs')) transmitterTypes.add('aprs')
        if (desc.includes('sstv')) transmitterTypes.add('sstv')
        if (desc.includes('telemetry')) transmitterTypes.add('telemetry')
        if (desc.includes('voice')) transmitterTypes.add('voice')
        if (desc.includes('repeater')) transmitterTypes.add('repeater')
        if (desc.includes('beacon')) transmitterTypes.add('beacon')
        if (desc.includes('weather') || desc.includes('apt')) transmitterTypes.add('weather')
        if (desc.includes('communication') || desc.includes('comm')) transmitterTypes.add('communication')
      }

      if (transmitter.mode) transmitterModes.add(transmitter.mode.toLowerCase())
      if (transmitter.service) transmitterServices.add(transmitter.service.toLowerCase())
    })

    console.log('🔍 Debug: Available transmitter types:', Array.from(transmitterTypes))
    console.log('🔍 Debug: Available transmitter modes:', Array.from(transmitterModes))
    console.log('🔍 Debug: Available transmitter services:', Array.from(transmitterServices))

    // Build combined data from tracked satellites
    const combined = {}
    if (settings.value.trackedSatellites) {
      settings.value.trackedSatellites.forEach(satellite => {
        if (satellite.noradId) {
          const transmitters = transmitterDataObj[satellite.noradId] || []
          console.log(`🔍 Debug: Transmitters for ${satellite.name} (${satellite.noradId}):`, transmitters)

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
      
      // Fetch satellite images asynchronously from UpHere Space API if SatNOGS image is missing (non-blocking)
      settings.value.trackedSatellites.forEach(async (satellite) => {
        if (satellite.noradId && !satellite.image && combined[satellite.noradId]) {
          try {
            const { getSatelliteImageFromUpHere } = await import('~/utils/satelliteImageUtils')
            const imageUrl = await getSatelliteImageFromUpHere(satellite.noradId)
            // Update image if found
            if (imageUrl && combined[satellite.noradId]) {
              combined[satellite.noradId].satellite.image = imageUrl
            }
          } catch (error) {
            // Silently fail - image is optional
          }
        }
      })
    }

    combinedData.value = combined
    console.log('🔍 Debug: Final combined data:', Object.keys(combinedData.value))
    console.log('🔍 Debug: ISS combined data:', combinedData.value['25544'])
    
    // Load recommended satellites descriptions as fallback (before API fetching)
    await loadRecommendedSatellitesDescriptions()
    
    // Fetch missing satellite images and descriptions from SatNOGS API
    await fetchMissingSatelliteImages()
    await fetchMissingSatelliteDescriptions()
  } catch (error) {
    console.error('Failed to load stored transmitter data:', error)
  }
}

/**
 * Fetch satellite descriptions from SatNOGS API for satellites that don't have descriptions
 */
const fetchMissingSatelliteDescriptions = async () => {
  if (!settings.value.trackedSatellites) return
  
  const satellitesWithoutDescriptions = settings.value.trackedSatellites.filter(
    sat => sat.noradId && !sat.description && !combinedData.value[sat.noradId]?.satellite?.description
  )
  
  if (satellitesWithoutDescriptions.length === 0) {
    console.log('All satellites already have descriptions')
    return
  }
  
  console.log(`Fetching descriptions for ${satellitesWithoutDescriptions.length} satellites without descriptions`)
  
  // Fetch descriptions for each satellite
  for (const satellite of satellitesWithoutDescriptions) {
    try {
      // Fetch satellite data from SatNOGS API
      const response = await $fetch('/api/satnogs', {
        method: 'POST',
        body: {
          action: 'satellites',
          limit: 1,
          noradId: satellite.noradId
        }
      })
      
      // Try to get satellite data from response
      let satData = null
      if (response?.success && Array.isArray(response.data)) {
        satData = response.data.find(s => s.norad_cat_id === satellite.noradId)
      }
      
      // Debug: log what fields are available in satData
      console.log(`SatNOGS data for ${satellite.name} (${satellite.noradId}):`, Object.keys(satData || {}))
      
      // Try multiple possible description fields from SatNOGS API
      const description = satData?.description || 
                          satData?.purpose || 
                          satData?.description_text ||
                          satData?.notes ||
                          satData?.comment
      
      // If we found satellite data with a description, update it
      if (description && combinedData.value[satellite.noradId]) {
        // Update the combined data reactively using a new object to ensure reactivity
        combinedData.value = {
          ...combinedData.value,
          [satellite.noradId]: {
            ...combinedData.value[satellite.noradId],
            satellite: {
              ...combinedData.value[satellite.noradId].satellite,
              description: description
            }
          }
        }
        console.log(`✓ Fetched description for ${satellite.name} (${satellite.noradId}):`, description.substring(0, 50) + '...')
      } else {
        console.log(`No description found for ${satellite.name} (${satellite.noradId})`)
      }
    } catch (error) {
      console.log(`Could not fetch description for ${satellite.name} (${satellite.noradId}):`, error)
    }
  }
}

/**
 * Fetch satellite images from SatNOGS API for satellites that don't have images
 */
const fetchMissingSatelliteImages = async () => {
  if (!settings.value.trackedSatellites) return
  
  const satellitesWithoutImages = settings.value.trackedSatellites.filter(
    sat => sat.noradId && !sat.image
  )
  
  if (satellitesWithoutImages.length === 0) {
    console.log('All satellites already have images')
    return
  }
  
  console.log(`Fetching images for ${satellitesWithoutImages.length} satellites without images`)
  
  // Fetch images for each satellite
  for (const satellite of satellitesWithoutImages) {
    try {
      // Fetch satellite data from SatNOGS API
      const response = await $fetch('/api/satnogs', {
        method: 'POST',
        body: {
          action: 'satellites',
          limit: 1,
          noradId: satellite.noradId
        }
      })
      
      // Try to get satellite data from response
      let satData = null
      if (response?.success && Array.isArray(response.data)) {
        satData = response.data.find(s => s.norad_cat_id === satellite.noradId)
      }
      
      // If we found satellite data with an image, update it
      if (satData?.image) {
        const imageUrl = getSatnogsImageUrl(satData.image)
        
        if (imageUrl) {
          // Update the satellite in settings
          const satIndex = settings.value.trackedSatellites.findIndex(s => s.noradId === satellite.noradId)
          if (satIndex !== -1) {
            settings.value.trackedSatellites[satIndex].image = satData.image
            await saveSettings()
          }
          
          // Update the combined data reactively
          if (combinedData.value[satellite.noradId]) {
            combinedData.value[satellite.noradId].satellite.image = imageUrl
          }
          
          console.log(`✓ Fetched image for ${satellite.name} (${satellite.noradId})`)
        }
      }
    } catch (error) {
      console.log(`Could not fetch image for ${satellite.name} (${satellite.noradId}):`, error)
    }
  }
}

// Filter transmitters based on settings
const filterTransmitters = (transmitters) => {
  if (!transmitters || !Array.isArray(transmitters)) return []

  console.log('🔍 Debug: Filtering transmitters with settings:', settings.value.transmitterFilters)

  return transmitters.filter(transmitter => {
    if (!transmitter.description) return true

    const desc = transmitter.description.toLowerCase()
    const filters = settings.value.transmitterFilters || {}

    console.log(`🔍 Debug: Checking transmitter "${transmitter.description}" against filters:`, filters)

    // Check each filter type
    if (desc.includes('amateur') || desc.includes('ham')) {
      console.log('🔍 Debug: Found amateur/ham transmitter, filter enabled:', filters.amateur !== false)
      return filters.amateur !== false
    }
    if (desc.includes('fm')) {
      console.log('🔍 Debug: Found FM transmitter, filter enabled:', filters.fm !== false)
      return filters.fm !== false
    }
    if (desc.includes('cw')) {
      console.log('🔍 Debug: Found CW transmitter, filter enabled:', filters.cw !== false)
      return filters.cw !== false
    }
    if (desc.includes('aprs')) {
      console.log('🔍 Debug: Found APRS transmitter, filter enabled:', filters.aprs !== false)
      return filters.aprs !== false
    }
    if (desc.includes('sstv')) {
      console.log('🔍 Debug: Found SSTV transmitter, filter enabled:', filters.sstv !== false)
      return filters.sstv !== false
    }
    if (desc.includes('telemetry')) {
      console.log('🔍 Debug: Found telemetry transmitter, filter enabled:', filters.telemetry !== false)
      return filters.telemetry !== false
    }
    if (desc.includes('voice')) {
      console.log('🔍 Debug: Found voice transmitter, filter enabled:', filters.voice !== false)
      return filters.voice !== false
    }
    if (desc.includes('repeater')) {
      console.log('🔍 Debug: Found repeater transmitter, filter enabled:', filters.repeater !== false)
      return filters.repeater !== false
    }
    if (desc.includes('beacon')) {
      console.log('🔍 Debug: Found beacon transmitter, filter enabled:', filters.beacon !== false)
      return filters.beacon !== false
    }
    if (desc.includes('weather') || desc.includes('apt')) {
      console.log('🔍 Debug: Found weather transmitter, filter enabled:', filters.weather !== false)
      return filters.weather !== false
    }
    if (desc.includes('communication') || desc.includes('comm')) {
      console.log('🔍 Debug: Found communication transmitter, filter enabled:', filters.communication !== false)
      return filters.communication !== false
    }

    // If no specific type matches, show it (default behavior)
    console.log('🔍 Debug: No specific type match, showing transmitter by default')
    return true
  })
}

const formatFrequency = (transmitter) => {
  if (!transmitter) return 'Unknown'

  // Try different frequency field names from SatNOGS API
  let frequency = transmitter.downlink_low ||
                 transmitter.uplink_low ||
                 transmitter.downlink_high ||
                 transmitter.uplink_high ||
                 transmitter.frequency ||
                 transmitter.downlink_frequency ||
                 transmitter.uplink_frequency

  if (!frequency) return 'Unknown'

  // Handle different frequency formats
  if (typeof frequency === 'number') {
    if (frequency >= 1000000) {
      return `${(frequency / 1000000).toFixed(3)} MHz`
    } else if (frequency >= 1000) {
      return `${(frequency / 1000).toFixed(0)} kHz`
    } else {
      return `${frequency} Hz`
    }
  }

  // If it's already a string, return as-is
  return frequency.toString()
}

// Watch for changes in transmitter filters and reload data
watch(() => settings.value.transmitterFilters, async () => {
  console.log('🔍 Debug: Transmitter filters changed, reloading data...')
  await loadStoredTransmitterData()
}, { deep: true })

// Load recommended satellites descriptions as fallback
const loadRecommendedSatellitesDescriptions = async () => {
  try {
    const recommended = await $fetch('/recommended-satellites-belgrade.json')
    console.log('📝 Loading recommended satellites descriptions:', recommended)
    if (recommended?.recommendedSatellites) {
      const descriptionsMap = {}
      recommended.recommendedSatellites.forEach(sat => {
        if (sat.noradId && sat.description) {
          descriptionsMap[sat.noradId] = sat.description
          console.log(`📝 Found description for NORAD ${sat.noradId}: ${sat.description.substring(0, 50)}...`)
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
          console.log(`📝 Applied description from recommended file for NORAD ${noradId}: ${descriptionsMap[noradId].substring(0, 50)}...`)
        }
      })
      combinedData.value = updatedData
      
      console.log('📝 Descriptions map:', descriptionsMap)
      console.log('📝 Combined data after loading descriptions:', Object.keys(combinedData.value).map(id => ({
        noradId: id,
        hasDescription: !!combinedData.value[id]?.satellite?.description,
        description: combinedData.value[id]?.satellite?.description?.substring(0, 50)
      })))
    }
  } catch (error) {
    console.log('Could not load recommended satellites descriptions:', error)
  }
}

// Load data on mount
onMounted(async () => {
  await loadSettings()
  console.log('🔍 Debug: Settings loaded:', settings.value.transmitterFilters)
  await initializeTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken)
  await loadStoredTransmitterData()
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
