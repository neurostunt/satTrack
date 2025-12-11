<template>
  <NuxtLayout name="default" title="⚙️ Settings" subtitle="Configure SatTrack">
    <!-- API Credentials -->
    <ApiCredentials
      :settings="settings"
      :is-saving-settings="isSavingSettings"
      :update-settings="updateSettings"
      @save-settings="saveSettings"
    />

    <!-- Tracking Settings -->
    <AdditionalSettings
      :settings="settings"
      :is-saving-settings="isSavingSettings"
      :update-settings="updateSettings"
      @save-settings="saveSettings"
    />

    <!-- Satellite Management -->
    <SatelliteManagement
      :settings="settings"
      :tle-loading="tleLoading"
      :is-testing-combined="isTestingCombined"
      :space-track-fetch-status="spaceTrackFetchStatus"
      :satnogs-fetch-status="satnogsFetchStatus"
      :pass-prediction-status="passPredictionStatus"
      v-model:search-query="searchQuery"
      :search-loading="searchLoading"
      :search-results="searchResults"
      :search-error="searchError"
      @fetch-all-data="fetchAllData"
      @add-satellite="addSatellite"
      @remove-satellite="removeSatellite"
    />

    <!-- Storage Management -->
    <StorageManagement
      :storage-info="storageInfo"
      :is-loading-storage="isLoadingStorage"
      :is-clearing-data="isClearingData"
      :is-loading-example-satellites="isLoadingExampleSatellites"
      @clear-tle-data="clearTLEData"
      @clear-transmitter-data="clearTransmitterData"
      @clear-all-data="clearAllData"
      @load-example-satellites="loadExampleSatellites"
    />

    <!-- Combined Data Display -->
    <CombinedDataDisplay
      :combined-data="combinedData"
      :get-t-l-e-data="getTLEData"
      :format-frequency="formatFrequency"
    />
  </NuxtLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import ApiCredentials from '~/components/settings/ApiCredentials.vue'
import SatelliteManagement from '~/components/settings/SatelliteManagement.vue'
import StorageManagement from '~/components/settings/StorageManagement.vue'
import AdditionalSettings from '~/components/settings/AdditionalSettings.vue'
import CombinedDataDisplay from '~/components/settings/CombinedDataDisplay.vue'
import { useSettings } from '~/composables/storage/useSettings'
import { useTLEData } from '~/composables/api/useTLEData'
import { useSatelliteSearch } from '~/composables/api/useSatelliteSearch'
import { useIndexedDB } from '~/composables/storage/useIndexedDB'
import { usePassPrediction } from '~/composables/satellite/usePassPrediction'
import { EXAMPLE_SATELLITES } from '~/constants/satellite'

// Import composables
const {
  settings,
  loadSettings,
  saveSettings: saveSettingsToStorage,
  updateSettings,
  resetSettings
} = useSettings()

const {
  tleLoading,
  getTLEData,
  initializeTLEData,
  fetchTLEData,
  passPredictionStatus
} = useTLEData()

const {
  searchSatellites
} = useSatelliteSearch()

const {
  calculatePassesForSatellites
} = usePassPrediction()

const {
  storeTransponderData,
  getStorageInfo,
  storeCredentials,
  clearTLEData: clearIndexedDBTLEData,
  clearTransmitterData: clearIndexedDBTransmitterData,
  clearAll: clearIndexedDBAllData,
  storePassPredictions
} = useIndexedDB()

// Local search state
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const searchError = ref('')

// Search cache management
const searchCache = ref(new Map())
const SEARCH_CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day in milliseconds

const getCachedSearchResults = (query) => {
  const cached = searchCache.value.get(query.toLowerCase())
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
    return cached.results
  }
  return null
}

const setCachedSearchResults = (query, results) => {
  searchCache.value.set(query.toLowerCase(), {
    results,
    timestamp: Date.now()
  })
}

// Add satellite to tracked list
const addSatellite = async (satellite) => {
  console.log('🚀 addSatellite function called!')
  console.log('🔍 addSatellite called with:', satellite)

  if (!satellite || !satellite.noradId) {
    console.error('Invalid satellite data:', satellite)
    return
  }

  // Check if satellite is already tracked
  const existingIndex = settings.value.trackedSatellites.findIndex(s => s.noradId === satellite.noradId)
  if (existingIndex !== -1) {
    console.log(`Satellite ${satellite.name} (NORAD ${satellite.noradId}) is already tracked`)
    return
  }

  // Add to tracked satellites using updateSettings
  // Note: satellite.name is already the full name, satellite.names is the short name
  const newSatellite = {
    noradId: satellite.noradId,
    name: satellite.name,          // Full name (SAUDISAT 1C)
    status: satellite.status || 'alive',
    names: satellite.names,        // Short name (SO-50)
    image: satellite.image || undefined // Include image field if available
  }

  console.log('🔍 Adding satellite:', newSatellite)

  // Use updateSettings to modify trackedSatellites
  const updatedSatellites = [...settings.value.trackedSatellites, newSatellite]
  updateSettings({ trackedSatellites: updatedSatellites })

  // Save to database
  try {
    await saveSettings()
    console.log('🔍 Satellite added and saved to database')
  } catch (error) {
    console.error('Failed to save satellite to database:', error)
  }

  console.log('🔍 Updated tracked satellites:', updatedSatellites)
  console.log(`Added satellite ${satellite.name} (NORAD ${satellite.noradId}) to tracked list`)

  // Clear search results after adding
  searchResults.value = []
  searchQuery.value = ''
}

// Format satellite from search results
const formatSatellite = (satellite) => {
  return {
    noradId: satellite.norad_cat_id,
    name: satellite.name,
    names: satellite.names || '',
    status: satellite.status,
    operator: satellite.operator || 'Unknown',
    countries: satellite.countries || '',
    launched: satellite.launched,
    website: satellite.website || '',
    image: satellite.image || '',
    satId: satellite.sat_id
  }
}

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

// Reactive state
const isSavingSettings = ref(false)
const isTestingCombined = ref(false)
const isClearingData = ref(false)
const isLoadingStorage = ref(false)
const isLoadingExampleSatellites = ref(false)
const combinedData = ref({})
const storageInfo = ref({})

// Fetch status objects
const spaceTrackFetchStatus = ref({
  show: true, // Always show
  status: 'success',
  message: 'TLE data fetched successfully: 0 satellites',
  progress: ''
})

const satnogsFetchStatus = ref({
  show: true, // Always show
  status: 'success',
  message: 'Transmitter data fetched: 0 successful, 0 failed',
  progress: ''
})

// Functions
const saveSettings = async () => {
  isSavingSettings.value = true
  try {
    // Save regular settings
    await saveSettingsToStorage()

    // Save credentials separately
    console.log('🔑 Saving credentials:', {
      username: settings.value.spaceTrackUsername,
      password: settings.value.spaceTrackPassword ? '***' : 'empty',
      satnogsToken: settings.value.satnogsToken ? '***' : 'empty',
      n2yoApiKey: settings.value.n2yoApiKey ? '***' : 'empty'
    })

    if (settings.value.spaceTrackUsername || settings.value.spaceTrackPassword || settings.value.satnogsToken || settings.value.n2yoApiKey) {
      await storeCredentials({
        username: settings.value.spaceTrackUsername || '',
        password: settings.value.spaceTrackPassword || '',
        satnogsToken: settings.value.satnogsToken || '',
        n2yoApiKey: settings.value.n2yoApiKey || ''
      })
      console.log('✅ Credentials saved successfully')
    } else {
      console.log('⚠️ No credentials to save')
    }

    console.log('Settings and credentials saved successfully')
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    isSavingSettings.value = false
  }
}

const fetchAllData = async () => {
  if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
    console.log('No tracked satellites to fetch data for')
    return
  }

  isTestingCombined.value = true

  try {
    await fetchTrackedSatellitesTLEData()
    await fetchTrackedSatellitesTransmitterData()
    await fetchTrackedSatellitesPassPredictions()
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isTestingCombined.value = false
  }
}

const fetchTrackedSatellitesTLEData = async () => {
  console.log('Tracked satellites:', settings.value.trackedSatellites)

  const noradIds = settings.value.trackedSatellites
    .filter(sat => sat.noradId)
    .map(sat => sat.noradId)

  console.log('Filtered NORAD IDs:', noradIds)

  if (noradIds.length === 0) {
    console.log('No valid NORAD IDs found')
    return
  }

  spaceTrackFetchStatus.value = {
    show: true,
    status: 'loading',
    message: 'Fetching TLE data...',
    progress: `Processing ${noradIds.length} satellites`
  }

  try {
    // Force fresh TLE data fetch, bypass cache
    // Pass satellite objects instead of just NORAD IDs
    const satellites = settings.value.trackedSatellites.filter(sat => sat.noradId)
    await fetchTLEData(satellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken, true)

    spaceTrackFetchStatus.value = {
      show: true,
      status: 'success',
      message: `TLE data fetched successfully: ${noradIds.length} satellites`,
      progress: ''
    }
  } catch (error) {
    spaceTrackFetchStatus.value = {
      show: true,
      status: 'error',
      message: `TLE data fetch failed: ${error.message}`,
      progress: ''
    }
  }
}

const fetchTrackedSatellitesTransmitterData = async () => {
  console.log('Tracked satellites for transmitter data:', settings.value.trackedSatellites)

  const noradIds = settings.value.trackedSatellites
    .filter(sat => sat.noradId)
    .map(sat => sat.noradId)

  console.log('Filtered NORAD IDs for transmitter data:', noradIds)

  if (noradIds.length === 0) {
    console.log('No valid NORAD IDs found')
    return
  }

  satnogsFetchStatus.value = {
    show: true,
    status: 'loading',
    message: 'Fetching transmitter data...',
    progress: `Processing ${noradIds.length} satellites`
  }

  try {
    let successCount = 0
    let errorCount = 0

    for (const noradId of noradIds) {
      try {
        // Note: SatNOGS transmitters endpoint doesn't require authentication for read-only operations
        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            action: 'transmitters',
            noradId: noradId
            // token removed - not needed for read-only operations
          }
        })

        console.log(`API response for NORAD ${noradId}:`, response)

        // Extract the actual transmitter data from the response
        const transmitterData = response?.data || response

        if (transmitterData && Array.isArray(transmitterData) && transmitterData.length > 0) {
          const processedTransmitterData = transmitterData.map(transmitter => ({
            ...transmitter,
            ctcss: parseCTCSS(transmitter.description)
          }))

          console.log(`Storing transmitter data for NORAD ${noradId}:`, processedTransmitterData.length, 'transmitters')
          await storeTransponderData(noradId, processedTransmitterData)
          console.log(`Successfully stored transmitter data for NORAD ${noradId}`)
          successCount++
        } else {
          console.log(`No transmitter data found for NORAD ${noradId}`)
        }
      } catch (error) {
        console.error(`Failed to fetch transmitter data for NORAD ${noradId}:`, error)
        errorCount++
      }
    }

    satnogsFetchStatus.value = {
      show: true,
      status: successCount > 0 ? 'success' : 'error',
      message: `Transmitter data fetched: ${successCount} successful, ${errorCount} failed`,
      progress: ''
    }
  } catch (error) {
    satnogsFetchStatus.value = {
      show: true,
      status: 'error',
      message: `Transmitter data fetch failed: ${error.message}`,
      progress: ''
    }
  }
}

const fetchTrackedSatellitesPassPredictions = async () => {
  console.log('Fetching pass predictions for tracked satellites:', settings.value.trackedSatellites)

  const satellites = settings.value.trackedSatellites
    .filter(sat => sat.noradId)
    .map(sat => ({ noradId: parseInt(sat.noradId) }))

  console.log('Filtered satellites for pass predictions:', satellites)

  if (satellites.length === 0) {
    console.log('No valid satellites found for pass predictions')
    return
  }

  // Check if we have observer location
  if (!settings.value.observationLocation?.latitude || !settings.value.observationLocation?.longitude) {
    console.warn('⚠️ Observer location not configured, skipping pass predictions')
    return
  }

  // Check if we have N2YO API key
  if (!settings.value.n2yoApiKey) {
    console.warn('⚠️ N2YO API key not configured, skipping pass predictions')
    return
  }

  const observerLocation = {
    lat: settings.value.observationLocation.latitude,
    lng: settings.value.observationLocation.longitude,
    alt: settings.value.observationLocation.altitude || 0
  }

  try {
    console.log('🛰️ Calculating pass predictions using N2YO API...')
    console.log('🛰️ Observer location:', observerLocation)
    console.log('🛰️ Satellites:', satellites.length)
    console.log('🛰️ Min Elevation:', settings.value.minElevation || 20)

    const freshPasses = await calculatePassesForSatellites(
      satellites,
      observerLocation,
      settings.value.minElevation || 20, // Use configured minElevation, default to 20
      settings.value.n2yoApiKey
    )

    console.log('✅ Pass predictions calculated:', freshPasses.size, 'satellites')

    // Store each satellite's passes in IndexedDB
    for (const [noradId, passes] of freshPasses.entries()) {
      try {
        await storePassPredictions(noradId, passes, observerLocation)
        console.log(`✅ Stored ${passes.length} passes for NORAD ID: ${noradId}`)
      } catch (error) {
        console.error(`❌ Failed to store passes for NORAD ID: ${noradId}`, error)
      }
    }

    console.log('✅ All pass predictions stored successfully')
  } catch (error) {
    console.error('❌ Failed to fetch pass predictions:', error)
  }
}

const removeSatellite = async (noradId) => {
  console.log('🚀 removeSatellite called with:', noradId)

  // Use updateSettings to modify trackedSatellites
  const updatedSatellites = settings.value.trackedSatellites.filter(sat => sat.noradId !== noradId)
  updateSettings({ trackedSatellites: updatedSatellites })

  // Save to database
  try {
    await saveSettings()
    console.log('🔍 Satellite removed and saved to database')
  } catch (error) {
    console.error('Failed to save satellite removal to database:', error)
  }

  console.log('🔍 Removed satellite, updated list:', updatedSatellites)
}

const loadExampleSatellites = async () => {
  isLoadingExampleSatellites.value = true
  try {
    // Get current tracked satellites
    const currentSatellites = settings.value.trackedSatellites || []
    const currentNoradIds = new Set(currentSatellites.map(sat => sat.noradId))

    // Filter out satellites that are already tracked (EXAMPLE_SATELLITES is now just an array of NORAD IDs)
    const newNoradIds = EXAMPLE_SATELLITES.filter(noradId => !currentNoradIds.has(noradId))

    if (newNoradIds.length === 0) {
      console.log('All example satellites are already tracked')
      return
    }

    console.log(`Fetching satellite data for ${newNoradIds.length} satellites from API...`)

    // Fetch satellite data from SatNOGS API for each NORAD ID
    const newSatellites = []
    for (const noradId of newNoradIds) {
      try {
        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            action: 'satellites',
            noradId: noradId
          }
        })

        if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
          const satData = response.data[0]
          const satellite = formatSatellite(satData)
          newSatellites.push(satellite)
          console.log(`✅ Fetched data for NORAD ${noradId}: ${satellite.name}`)
        } else {
          // If API doesn't return data, add with just NORAD ID
          console.warn(`⚠️ No API data for NORAD ${noradId}, adding with minimal info`)
          newSatellites.push({
            noradId: noradId,
            name: `Satellite ${noradId}`,
            status: 'alive',
            names: ''
          })
        }
      } catch (error) {
        console.error(`Failed to fetch data for NORAD ${noradId}:`, error)
        // Add with minimal info if API fails
        newSatellites.push({
          noradId: noradId,
          name: `Satellite ${noradId}`,
          status: 'alive',
          names: ''
        })
      }
    }

    // Add new satellites to tracked list
    const updatedSatellites = [...currentSatellites, ...newSatellites]
    updateSettings({ trackedSatellites: updatedSatellites })

    // Save to database
    await saveSettings()
    console.log(`✅ Loaded ${newSatellites.length} example satellites with data from API`)
  } catch (error) {
    console.error('Failed to load example satellites:', error)
  } finally {
    isLoadingExampleSatellites.value = false
  }
}

const clearTLEData = async () => {
  isClearingData.value = true
  try {
    await clearIndexedDBTLEData()
    console.log('TLE data cleared successfully')
    // Update storage info display after clearing
    const info = await getStorageInfo()
    storageInfo.value = info
  } catch (error) {
    console.error('Failed to clear TLE data:', error)
  } finally {
    isClearingData.value = false
  }
}

const clearTransmitterData = async () => {
  isClearingData.value = true
  try {
    await clearIndexedDBTransmitterData()
    console.log('Transmitter data cleared successfully')
    // Update storage info display after clearing
    const info = await getStorageInfo()
    storageInfo.value = info
  } catch (error) {
    console.error('Failed to clear transmitter data:', error)
  } finally {
    isClearingData.value = false
  }
}

const clearAllData = async () => {
  isClearingData.value = true
  try {
    // Clear IndexedDB data
    await clearIndexedDBAllData()

    // Reset settings to default (this clears tracked satellites)
    resetSettings()

    // Save reset settings to storage
    await saveSettingsToStorage()

    console.log('All data cleared successfully, including tracked satellites')

    // Update storage info display after clearing
    const info = await getStorageInfo()
    storageInfo.value = info
  } catch (error) {
    console.error('Failed to clear all data:', error)
  } finally {
    isClearingData.value = false
  }
}

const formatFrequency = (frequency) => {
  if (!frequency) return 'Unknown'
  return frequency
}


// Watch for search query changes with caching
watch(searchQuery, async (newQuery) => {
  if (newQuery.length >= 3) {
    // Check cache first
    const cachedResults = getCachedSearchResults(newQuery)
    if (cachedResults) {
      console.log(`🔍 Using cached search results for "${newQuery}"`)
      searchResults.value = cachedResults
      searchError.value = ''
      // Show brief loading indicator for cached results too
      searchLoading.value = true
      setTimeout(() => {
        searchLoading.value = false
      }, 300) // Brief delay to show loading
      return
    }

    // If not cached, make API call
    searchLoading.value = true
    searchError.value = ''

    console.log(`🔍 Searching for "${newQuery}"...`)

    try {
      // Note: satnogsToken is optional - search works without authentication
      const results = await searchSatellites(newQuery, settings.value.satnogsToken)
      searchResults.value = results

      // Only cache if we got results
      if (results && results.length > 0) {
        setCachedSearchResults(newQuery, results)
        console.log(`🔍 Cached ${results.length} search results for "${newQuery}"`)
      } else {
        console.log(`🔍 No results found for "${newQuery}", not caching`)
      }
    } catch (error) {
      searchError.value = error.message || 'Search failed'
      searchResults.value = []
    } finally {
      searchLoading.value = false
      console.log(`🔍 Search completed for "${newQuery}"`)
    }
  } else {
    searchResults.value = []
    searchError.value = ''
  }
})

// Load settings and initial storage info on mount
onMounted(async () => {
  await loadSettings()

  // Load storage info once on mount (no manual refresh button)
  try {
    const info = await getStorageInfo()
    storageInfo.value = info
  } catch (error) {
    console.error('Failed to load storage info:', error)
  }

  // Load credentials from .env or IndexedDB
  const { loadCredentials } = useCredentials()

  try {
    const credentials = await loadCredentials()

    if (credentials.spaceTrackUsername || credentials.n2yoApiKey || credentials.satnogsToken) {
      // Update settings with loaded credentials
      updateSettings(credentials)
      console.log('✅ Settings updated with credentials')
    } else {
      console.log('⚠️ No credentials found')
    }
  } catch (error) {
    console.error('Failed to load credentials:', error)
  }

  await initializeTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken)
})

// Cleanup on unmount
onUnmounted(() => {
  // Any cleanup needed
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
