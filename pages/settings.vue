<template>
  <div class="min-h-screen space-gradient p-4">
    <!-- Header -->
    <header class="text-center mb-6">
      <h1 class="text-2xl font-bold mb-1 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
        Satellite Tracking Settings
      </h1>
      <p class="text-space-400 text-sm">Configure your satellite tracking preferences</p>
    </header>

    <!-- API Credentials -->
    <ApiCredentials
      :settings="settings"
      :is-saving-settings="isSavingSettings"
      @save-settings="saveSettings"
      @update:settings="settings = $event"
    />

    <!-- Satellite Management -->
    <SatelliteManagement
      :settings="settings"
      :tle-loading="tleLoading"
      :is-testing-combined="isTestingCombined"
      :space-track-fetch-status="spaceTrackFetchStatus"
      :satnogs-fetch-status="satnogsFetchStatus"
      :search-query="searchQuery"
      :search-results="searchResults"
      :search-error="searchError"
      :debounced-search="debouncedSearch"
      @fetch-all-data="fetchAllData"
      @add-satellite="addSatellite"
      @remove-satellite="removeSatellite"
      @update:search-query="searchQuery = $event"
      @search-input="debouncedSearch($event, settings.satnogsToken)"
    />

    <!-- Storage Management -->
    <StorageManagement
      :storage-info="storageInfo"
      :is-loading-storage="isLoadingStorage"
      @load-storage-info="loadStorageInfo"
      @test-storage="testStorage"
      @clear-all-data="clearAllData"
    />

    <!-- Location Settings -->
    <LocationSettings
      :settings="settings"
      @update:settings="settings = $event"
      @location-updated="handleLocationUpdated"
    />

    <!-- Additional Settings -->
    <AdditionalSettings
      :settings="settings"
      @update:settings="settings = $event"
    />

    <!-- Combined Data Display -->
    <CombinedDataDisplay
      v-if="Object.keys(combinedData).length > 0"
      :combined-data="combinedData"
      :expanded-satellites="expandedSatellites"
      :tle-data="tleData"
      :format-frequency="formatFrequency"
      @toggle-satellite-data="toggleSatelliteData"
    />

    <!-- Save Button -->
    <div class="max-w-lg mx-auto">
      <button
        @click="saveSettings"
        class="btn-primary w-full"
        :disabled="isSavingSettings"
      >
        {{ isSavingSettings ? 'Saving...' : 'Save All Settings' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useTLEData } from '~/composables/useTLEData.js'
import { useSatelliteSearch } from '~/composables/useSatelliteSearch.js'
import secureStorage from '~/utils/secureStorage.js'
import indexedDBStorage from '~/utils/indexedDBStorage.js'
import ApiCredentials from '~/components/settings/ApiCredentials.vue'
import SatelliteManagement from '~/components/settings/SatelliteManagement.vue'
import StorageManagement from '~/components/settings/StorageManagement.vue'
import LocationSettings from '~/components/settings/LocationSettings.vue'
import AdditionalSettings from '~/components/settings/AdditionalSettings.vue'
import CombinedDataDisplay from '~/components/settings/CombinedDataDisplay.vue'

// Reactive state
const settings = ref({
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  satnogsToken: '',
  trackedSatellites: [],
  updateInterval: 5000,
  units: 'metric',
  compassType: 'magnetic',
  autoUpdateTLE: true,
  soundAlerts: true,
  highAccuracyMode: false,
  autoCalibrateCompass: true,
  gridSquare: '',
  useGridSquare: false,
  disableGPS: false
})

const isSavingSettings = ref(false)
const tleLoading = ref(false)
const isTestingCombined = ref(false)
const combinedData = ref({})
const expandedSatellites = ref(new Set())
const storageInfo = ref({})
const isLoadingStorage = ref(false)

// Status tracking
const spaceTrackFetchStatus = ref({ show: false, type: '', message: '', details: '', progress: '' })
const satnogsFetchStatus = ref({ show: false, type: '', message: '', details: '', progress: '' })

// TLE data composable
const { getTLEData, getAllTLEData, fetchTLEData, initializeTLEData, tleData } = useTLEData()

// Satellite search composable
const {
  isLoading: searchLoading,
  error: searchError,
  searchResults,
  searchQuery,
  debouncedSearch,
  clearSearch,
  formatSatellite,
  isNoradId
} = useSatelliteSearch()

// Load settings on mount
const loadSettings = async () => {
  try {
    const storedSettings = await secureStorage.getSettings()
    if (storedSettings) {
      settings.value = { ...settings.value, ...storedSettings }

      // Clean up any satellites with undefined NORAD IDs
      settings.value.trackedSatellites = settings.value.trackedSatellites.filter(
        sat => sat.noradId && sat.noradId !== undefined
      )
    }

    // Load credentials separately
    const credentials = await secureStorage.getCredentials()
    if (credentials) {
      if (credentials.spaceTrackUsername) settings.value.spaceTrackUsername = credentials.spaceTrackUsername
      if (credentials.spaceTrackPassword) settings.value.spaceTrackPassword = credentials.spaceTrackPassword
      if (credentials.satnogsToken) settings.value.satnogsToken = credentials.satnogsToken
    }

    // Load stored TLE data into the composable
    await loadStoredTLEData()

    // Load stored transmitter data
    await loadStoredTransmitterData()
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

// Load stored TLE data from cache
const loadStoredTLEData = async () => {
  try {
    await initializeTLEData(
      settings.value.trackedSatellites,
      settings.value.spaceTrackUsername,
      settings.value.spaceTrackPassword
    )
  } catch (error) {
    console.error('Failed to initialize TLE data:', error)
  }
}

// Load stored transmitter data
const loadStoredTransmitterData = async () => {
  try {
    const storedData = await indexedDBStorage.getAllTransponderData()
    if (storedData && storedData.length > 0) {
      // Filter for transmitter data and convert array to object keyed by NORAD ID
      const transmitterData = {}
      storedData.forEach(item => {
        if (item.type === 'transmitter') {
          // Parse CTCSS tones from stored transmitter descriptions
          const transmittersWithCTCSS = item.data.transmitters.map(transmitter => {
            const ctcss = parseCTCSS(transmitter.description)
            return {
              ...transmitter,
              ctcss: ctcss
            }
          })

          transmitterData[item.noradId] = {
            ...item.data,
            transmitters: transmittersWithCTCSS
          }
        }
      })
      if (Object.keys(transmitterData).length > 0) {
        combinedData.value = transmitterData
      }
    }
  } catch (error) {
    console.error('Failed to load stored transmitter data:', error)
  }
}

// Save settings
const saveSettings = async () => {
  try {
    isSavingSettings.value = true

    // Create clean settings object for storage
    const cleanSettings = JSON.parse(JSON.stringify(settings.value))

    // Store settings
    await secureStorage.storeSettings(cleanSettings)

    // Store credentials separately
    await secureStorage.storeCredentials({
      spaceTrackUsername: settings.value.spaceTrackUsername,
      spaceTrackPassword: settings.value.spaceTrackPassword,
      satnogsToken: settings.value.satnogsToken
    })

    console.log('Settings saved successfully')
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    isSavingSettings.value = false
  }
}

// Fetch all data (TLE and transmitter)
const fetchAllData = async () => {
  if (!settings.value.trackedSatellites.length) {
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'warning',
      message: 'No satellites to fetch data for',
      details: 'Add satellites to your tracked list first'
    }
    return
  }

  try {
    isTestingCombined.value = true
    spaceTrackFetchStatus.value = { show: false }
    satnogsFetchStatus.value = { show: false }

    // Fetch TLE data
    await fetchTrackedSatellitesTLEData()

    // Fetch transmitter data
    await fetchTrackedSatellitesTransmitterData()

  } catch (error) {
    console.error('Failed to fetch combined data:', error)
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'error',
      message: 'Failed to fetch satellite data',
      details: error.message
    }
  } finally {
    isTestingCombined.value = false
  }
}

// Fetch TLE data for tracked satellites
const fetchTrackedSatellitesTLEData = async () => {
  try {
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'info',
      message: 'Fetching TLE data...',
      progress: `Processing ${settings.value.trackedSatellites.length} satellites`
    }

    const noradIds = settings.value.trackedSatellites
      .filter(sat => sat.noradId && sat.noradId !== undefined)
      .map(sat => sat.noradId)

    // Check if we have credentials for TLE data
    if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
      spaceTrackFetchStatus.value = {
        show: true,
        type: 'warning',
        message: 'Space-Track.org credentials required for TLE data',
        details: 'Please add your Space-Track.org username and password in the API Credentials section'
      }
      return
    }

    const tleData = await fetchTLEData(
      settings.value.trackedSatellites,
      settings.value.spaceTrackUsername,
      settings.value.spaceTrackPassword,
      settings.value.satnogsToken
    )

    // Check if TLE data was successfully loaded (it's stored internally, not returned)
    const loadedTLEData = getAllTLEData()
    if (loadedTLEData && Object.keys(loadedTLEData).length > 0) {
      spaceTrackFetchStatus.value = {
        show: true,
        type: 'success',
        message: `Successfully fetched TLE data for ${Object.keys(loadedTLEData).length} tracked satellites`,
        details: `NORAD IDs: ${Object.keys(loadedTLEData).join(', ')}`
      }
    } else {
      spaceTrackFetchStatus.value = {
        show: true,
        type: 'warning',
        message: 'TLE data fetch completed but no data returned',
        details: 'This might indicate an issue with the API or satellite data availability'
      }
    }

  } catch (error) {
    console.error('TLE fetch error:', error)
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'error',
      message: 'Failed to fetch TLE data',
      details: error.message
    }
  }
}

/**
 * Parse CTCSS tone from transmitter description
 * @param {string} description - Transmitter description
 * @returns {number|null} CTCSS tone frequency in Hz, or null if not found
 */
const parseCTCSS = (description) => {
  if (!description) return null

  // Match patterns like "CTCSS 67.0 Hz", "CTCSS 67.0", "67.0 Hz CTCSS", etc.
  const ctcssMatch = description.match(/(?:ctcss|tone|pl)\s*(\d+(?:\.\d+)?)\s*(?:hz)?/i)
  if (ctcssMatch) {
    return parseFloat(ctcssMatch[1])
  }

  return null
}

// Fetch transmitter data for tracked satellites
const fetchTrackedSatellitesTransmitterData = async () => {
  try {
    // Check if SatNOGS token is available
    if (!settings.value.satnogsToken) {
      satnogsFetchStatus.value = {
        show: true,
        type: 'warning',
        message: 'SatNOGS API token required for transmitter data',
        details: 'Please add your SatNOGS API token in the API Credentials section'
      }
      return
    }

    satnogsFetchStatus.value = {
      show: true,
      type: 'info',
      message: 'Fetching transmitter data...',
      progress: `Processing ${settings.value.trackedSatellites.length} satellites`
    }

    const transmitterData = {}

    for (const satellite of settings.value.trackedSatellites.filter(sat => sat.noradId && sat.noradId !== undefined)) {
      try {
        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            action: 'transmitters',
            noradId: satellite.noradId,
            satId: satellite.satId,
            token: settings.value.satnogsToken
          }
        })

        if (response.success && response.data) {
          // Parse CTCSS tones from transmitter descriptions
          const transmittersWithCTCSS = response.data.map(transmitter => {
            const ctcss = parseCTCSS(transmitter.description)
            return {
              ...transmitter,
              ctcss: ctcss
            }
          })

          transmitterData[satellite.noradId] = {
            satellite: satellite,
            transmitters: transmittersWithCTCSS,
            noradId: satellite.noradId,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        console.error(`Failed to fetch transmitter data for ${satellite.name}:`, error)
      }
    }

    // Store transmitter data
    combinedData.value = transmitterData
    await indexedDBStorage.storeAllTransmitterData(JSON.parse(JSON.stringify(transmitterData)))

    // Collapse all satellites when new data is loaded
    collapseAllSatellites()

    satnogsFetchStatus.value = {
      show: true,
      type: 'success',
      message: `Successfully fetched transmitter data for ${Object.keys(transmitterData).length} satellites`,
      details: `Found transmitters for: ${Object.keys(transmitterData).join(', ')}`
    }

  } catch (error) {
    console.error('Failed to fetch transmitter data:', error)
    satnogsFetchStatus.value = {
      show: true,
      type: 'error',
      message: 'Failed to fetch transmitter data',
      details: error.message
    }
  }
}

/**
 * Handle location update from LocationSettings component
 * @param {Object} locationData - Location data or error
 */
const handleLocationUpdated = async (locationData) => {
  if (locationData.error) {
    // Show error message
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'error',
      message: 'Failed to update location',
      details: locationData.error
    }
  } else {
    // Save settings
    await saveSettings()

    console.log('Location updated:', locationData)

    // Show success message
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'success',
      message: 'Location updated successfully',
      details: `Grid Square: ${locationData.gridSquare} (${locationData.latitude.toFixed(6)}°N, ${locationData.longitude.toFixed(6)}°E)`
    }

    // Auto-hide message after 5 seconds
    setTimeout(() => {
      spaceTrackFetchStatus.value.show = false
    }, 5000)
  }
}

// Add satellite to tracked list
const addSatellite = (satellite) => {
  const exists = settings.value.trackedSatellites.some(sat => sat.noradId === satellite.noradId)
  if (!exists) {
    settings.value.trackedSatellites.push({
      noradId: satellite.noradId,
      name: satellite.name,
      names: satellite.names || '',
      status: satellite.status,
      operator: satellite.operator || 'Unknown',
      countries: satellite.countries || '',
      launched: satellite.launched,
      website: satellite.website || '',
      image: satellite.image || '',
      satId: satellite.satId
    })
    clearSearch()
  }
}

// Remove satellite
const removeSatellite = async (noradId) => {
  try {
    // Remove from tracked satellites list
    settings.value.trackedSatellites = settings.value.trackedSatellites.filter(
      sat => sat.noradId !== noradId
    )

    // Remove from combined data display
    if (combinedData.value && combinedData.value[noradId]) {
      delete combinedData.value[noradId]
    }

    // Remove from expanded satellites if it was expanded
    expandedSatellites.value.delete(noradId)

    // Clean up all associated data from database
    await Promise.all([
      indexedDBStorage.clearTLEDataForSatellite(noradId),
      indexedDBStorage.clearTransponderDataForSatellite(noradId)
    ])

    console.log(`Satellite ${noradId} and all its data removed successfully`)
  } catch (error) {
    console.error(`Failed to remove satellite ${noradId} data:`, error)
  }
}

// Toggle satellite data expansion
const toggleSatelliteData = (noradId) => {
  if (expandedSatellites.value.has(noradId)) {
    expandedSatellites.value.delete(noradId)
  } else {
    expandedSatellites.value.add(noradId)
  }
}

// Collapse all satellites
const collapseAllSatellites = () => {
  expandedSatellites.value.clear()
}

// Storage management functions
const loadStorageInfo = async () => {
  try {
    isLoadingStorage.value = true
    const info = await indexedDBStorage.getStorageInfo()
    storageInfo.value = info
  } catch (error) {
    console.error('Failed to load storage info:', error)
  } finally {
    isLoadingStorage.value = false
  }
}

const testStorage = async () => {
  try {
    const testData = { test: 'data', timestamp: Date.now() }
    await indexedDBStorage.storeSettings(testData)
    const retrieved = await indexedDBStorage.getSettings()
    console.log('Storage test successful:', retrieved)
  } catch (error) {
    console.error('Storage test failed:', error)
  }
}

const clearAllData = async () => {
  try {
    // Clear tracked satellites
    settings.value.trackedSatellites = []

    // Clear combined data
    combinedData.value = {}

    // Clear status messages
    spaceTrackFetchStatus.value = { show: false }
    satnogsFetchStatus.value = { show: false }

    // Clear database storage
    await Promise.all([
      indexedDBStorage.clearTLEData(),
      indexedDBStorage.clearTransponderData()
    ])

    // Save settings without tracked satellites (preserve credentials)
    const cleanSettings = JSON.parse(JSON.stringify(settings.value))
    await secureStorage.storeSettings(cleanSettings)

    // Refresh storage display
    await loadStorageInfo()

    console.log('All satellite data cleared successfully')
  } catch (error) {
    console.error('Failed to clear all data:', error)
  }
}

// Format frequency helper
const formatFrequency = (freq) => {
  if (!freq) return 'N/A'
  if (freq >= 1000000) {
    return `${(freq / 1000000).toFixed(3)} MHz`
  } else if (freq >= 1000) {
    return `${(freq / 1000).toFixed(3)} kHz`
  } else {
    return `${freq.toFixed(0)} Hz`
  }
}

// Watch for settings changes and auto-save
watch(settings, (newSettings) => {
  // Auto-save when settings change (debounced)
  clearTimeout(window.settingsSaveTimeout)
  window.settingsSaveTimeout = setTimeout(() => {
    saveSettings()
  }, 1000)
}, { deep: true })

// Load data on mount
onMounted(async () => {
  await loadSettings()
  await loadStorageInfo()
})
</script>
