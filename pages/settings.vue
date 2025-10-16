<template>
  <NuxtLayout name="default" title="⚙️ Settings" subtitle="Configure SatTrack">
    <!-- API Credentials -->
    <ApiCredentials
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
      @load-storage-info="loadStorageInfo"
      @clear-tle-data="clearTLEData"
      @clear-transmitter-data="clearTransmitterData"
      @clear-all-data="clearAllData"
    />

    <!-- Additional Settings -->
    <AdditionalSettings
      :settings="settings"
      :is-saving-settings="isSavingSettings"
      :update-settings="updateSettings"
      @save-settings="saveSettings"
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

// Import composables
const {
  settings,
  loadSettings,
  saveSettings: saveSettingsToStorage,
  updateSettings
} = useSettings()

const {
  tleLoading,
  getTLEData,
  initializeTLEData,
  fetchTLEData
} = useTLEData()

const {
  searchSatellites
} = useSatelliteSearch()

const {
  storeTransponderData,
  getStorageInfo,
  clearTLEData: clearIndexedDBTLEData,
  clearTransmitterData: clearIndexedDBTransmitterData,
  clearAll: clearIndexedDBAllData
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
    names: satellite.names         // Short name (SO-50)
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
const combinedData = ref({})
const storageInfo = ref({})

// Fetch status objects
const spaceTrackFetchStatus = ref({
  show: false,
  status: '',
  message: '',
  progress: ''
})

const satnogsFetchStatus = ref({
  show: false,
  status: '',
  message: '',
  progress: ''
})

// Functions
const saveSettings = async () => {
  isSavingSettings.value = true
  try {
    await saveSettingsToStorage()
    console.log('Settings saved successfully')
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
        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            action: 'transmitters',
            noradId: noradId,
            token: settings.value.satnogsToken
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

const loadStorageInfo = async () => {
  isLoadingStorage.value = true
  try {
    const info = await getStorageInfo()
    storageInfo.value = info
  } catch (error) {
    console.error('Failed to load storage info:', error)
  } finally {
    isLoadingStorage.value = false
  }
}

const clearTLEData = async () => {
  isClearingData.value = true
  try {
    await clearIndexedDBTLEData()
    console.log('TLE data cleared successfully')
    await loadStorageInfo()
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
    await loadStorageInfo()
  } catch (error) {
    console.error('Failed to clear transmitter data:', error)
  } finally {
    isClearingData.value = false
  }
}

const clearAllData = async () => {
  isClearingData.value = true
  try {
    await clearIndexedDBAllData()
    console.log('All data cleared successfully')
    await loadStorageInfo()
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

// Load settings and storage info on mount
onMounted(async () => {
  await loadSettings()
  await loadStorageInfo()
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
