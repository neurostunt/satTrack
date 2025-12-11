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
import indexedDBStorage from '~/utils/indexedDBStorage'

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
  fetchTLEData
} = useTLEData()

// Pass prediction status (managed locally in settings page)
const passPredictionStatus = ref({
  show: true,
  status: 'success',
  message: 'Pass predictions calculated: 0 satellites',
  progress: ''
})

const {
  searchSatellites
} = useSatelliteSearch()

const {
  calculatePassesForSatellites
} = usePassPrediction()

const {
  storeTransponderData,
  getTransponderData,
  getStorageInfo,
  getTLEData: getTLEDataFromIndexedDB,
  getAllTransponderData,
  getAllPassPredictions,
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
  console.log('💾 Starting to save settings...')
  try {
    // Save regular settings
    console.log('📝 Saving regular settings...')
    await saveSettingsToStorage()
    console.log('✅ Regular settings saved')

    // Save credentials separately
    console.log('🔑 Saving credentials:', {
      username: settings.value.spaceTrackUsername,
      password: settings.value.spaceTrackPassword ? '***' : 'empty',
      satnogsToken: settings.value.satnogsToken ? '***' : 'empty',
      n2yoApiKey: settings.value.n2yoApiKey ? '***' : 'empty'
    })

    if (settings.value.spaceTrackUsername || settings.value.spaceTrackPassword || settings.value.satnogsToken || settings.value.n2yoApiKey) {
      console.log('🔐 Encrypting and storing credentials...')
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

    console.log('✅ Settings and credentials saved successfully')
  } catch (error) {
    console.error('❌ Failed to save settings:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
  } finally {
    console.log('🏁 Save operation completed, resetting loading state')
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
    // Always update TLE and Pass Predictions
    await fetchTrackedSatellitesTLEData()
    await fetchTrackedSatellitesPassPredictions()
    
    // Only fetch and store if missing: Transmitter data, SatNOGS info, SATCAT, images
    await fetchTrackedSatellitesTransmitterData()
    await fetchTrackedSatellitesInfoData()
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
    spaceTrackFetchStatus.value = {
      show: true,
      status: 'error',
      message: 'TLE data fetched successfully: 0 satellites',
      progress: ''
    }
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
    const fetchedCount = await fetchTLEData(satellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken, true)

    spaceTrackFetchStatus.value = {
      show: true,
      status: 'success',
      message: `TLE data fetched successfully: ${fetchedCount} satellites`,
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
    satnogsFetchStatus.value = {
      show: true,
      status: 'error',
      message: 'Transmitter data fetched: 0 successful, 0 failed',
      progress: ''
    }
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
        // Check if transmitter data already exists - only fetch if missing
        const existingData = await getTransponderData(noradId)
        if (existingData) {
          console.log(`Transmitter data already exists for NORAD ${noradId}, skipping fetch`)
          successCount++
          continue
        }

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
    passPredictionStatus.value = {
      show: true,
      status: 'error',
      message: 'Pass predictions calculated: 0 satellites',
      progress: ''
    }
    return
  }

  // Check if we have observer location
  if (!settings.value.observationLocation?.latitude || !settings.value.observationLocation?.longitude) {
    console.warn('⚠️ Observer location not configured, skipping pass predictions')
    passPredictionStatus.value = {
      show: true,
      status: 'error',
      message: 'Pass predictions calculated: 0 satellites (observer location not configured)',
      progress: ''
    }
    return
  }

  // Check if we have N2YO API key
  if (!settings.value.n2yoApiKey) {
    console.warn('⚠️ N2YO API key not configured, skipping pass predictions')
    passPredictionStatus.value = {
      show: true,
      status: 'error',
      message: 'Pass predictions calculated: 0 satellites (N2YO API key not configured)',
      progress: ''
    }
    return
  }

  const observerLocation = {
    lat: settings.value.observationLocation.latitude,
    lng: settings.value.observationLocation.longitude,
    alt: settings.value.observationLocation.altitude || 0
  }

  passPredictionStatus.value = {
    show: true,
    status: 'loading',
    message: 'Calculating pass predictions...',
    progress: `Processing ${satellites.length} satellites`
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
    let storedCount = 0
    for (const [noradId, passes] of freshPasses.entries()) {
      try {
        await storePassPredictions(noradId, passes, observerLocation)
        console.log(`✅ Stored ${passes.length} passes for NORAD ID: ${noradId}`)
        storedCount++
      } catch (error) {
        console.error(`❌ Failed to store passes for NORAD ID: ${noradId}`, error)
      }
    }

    console.log('✅ All pass predictions stored successfully')

    passPredictionStatus.value = {
      show: true,
      status: 'success',
      message: `Pass predictions calculated: ${storedCount} satellites`,
      progress: ''
    }
  } catch (error) {
    console.error('❌ Failed to fetch pass predictions:', error)
    passPredictionStatus.value = {
      show: true,
      status: 'error',
      message: `Pass predictions failed: ${error.message || 'Unknown error'}`,
      progress: ''
    }
  }
}

const fetchTrackedSatellitesInfoData = async () => {
  console.log('Fetching satellite info data (SatNOGS, SATCAT, images) for tracked satellites:', settings.value.trackedSatellites)

  const satellites = settings.value.trackedSatellites.filter(sat => sat.noradId)

  if (satellites.length === 0) {
    console.log('No valid satellites found for info data')
    return
  }

  console.log(`Fetching info data for ${satellites.length} satellites`)

  // Batch check which satellites need SatNOGS info (check all upfront)
  const satnogsCheckPromises = satellites.map(sat => 
    indexedDBStorage.getSatnogsInfo(sat.noradId).then(info => ({ sat, hasInfo: !!info }))
  )
  const satnogsChecks = await Promise.all(satnogsCheckPromises)
  
  const satellitesNeedingSatnogs = satnogsChecks
    .filter(check => !check.hasInfo)
    .map(check => check.sat)

  // Process SatNOGS info fetches in parallel batches (5 at a time to avoid rate limits)
  if (satellitesNeedingSatnogs.length > 0) {
    console.log(`Fetching SatNOGS info for ${satellitesNeedingSatnogs.length} satellites...`)
    
    const batchSize = 5
    const imageUpdates = []
    let storedCount = 0
    
    for (let i = 0; i < satellitesNeedingSatnogs.length; i += batchSize) {
      const batch = satellitesNeedingSatnogs.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (satellite) => {
        const noradId = satellite.noradId
        try {
          const response = await $fetch('/api/satnogs', {
            method: 'POST',
            body: {
              action: 'satellites',
              limit: 1,
              noradId: noradId
            }
          })

          if (response?.success && Array.isArray(response.data)) {
            const satData = response.data.find(s => s.norad_cat_id === noradId)
            if (satData) {
              await indexedDBStorage.storeSatnogsInfo(noradId, satData)
              storedCount++
              
              // Collect image updates to batch process later
              if (satData.image && !satellite.image) {
                imageUpdates.push({ noradId, image: satData.image })
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch SatNOGS info for NORAD ${noradId}:`, error)
        }
      }))
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < satellitesNeedingSatnogs.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`✅ Stored SatNOGS info for ${storedCount} satellites`)
    
    // Batch update satellite images in settings (single save operation)
    if (imageUpdates.length > 0) {
      for (const update of imageUpdates) {
        const satIndex = settings.value.trackedSatellites.findIndex(s => s.noradId === update.noradId)
        if (satIndex !== -1 && !settings.value.trackedSatellites[satIndex].image) {
          settings.value.trackedSatellites[satIndex].image = update.image
        }
      }
      await saveSettings()
      console.log(`✅ Updated images for ${imageUpdates.length} satellites`)
    }
  }

  // Process SATCAT data fetches in parallel batches (5 at a time)
  console.log(`Fetching SATCAT data for ${satellites.length} satellites...`)
  const batchSize = 5
  let satcatStoredCount = 0
  
  for (let i = 0; i < satellites.length; i += batchSize) {
    const batch = satellites.slice(i, i + batchSize)
    
    await Promise.all(batch.map(async (satellite) => {
      const noradId = satellite.noradId
      try {
        const response = await $fetch('/api/celestrak', {
          method: 'POST',
          body: {
            action: 'satcat',
            noradId: noradId
          }
        })

        console.log(`SATCAT response for NORAD ${noradId}:`, {
          success: response?.success,
          hasData: !!response?.data,
          dataKeys: response?.data ? Object.keys(response.data) : null
        })

        if (response?.success) {
          if (response.data) {
            await indexedDBStorage.storeSatcatData(noradId, response.data)
            satcatStoredCount++
            console.log(`✅ Stored SATCAT data for NORAD ${noradId}`)
          } else {
            console.log(`⚠️ No SATCAT data returned for NORAD ${noradId} (API returned null)`)
          }
        } else {
          console.warn(`⚠️ SATCAT API call failed for NORAD ${noradId}:`, response?.message)
        }
      } catch (error) {
        // Handle 403 errors gracefully - don't log if rate limited
        if (error?.statusCode === 403 || error?.statusMessage?.includes('403')) {
          // Silently skip if rate limited
        } else {
          console.error(`Failed to fetch SATCAT data for NORAD ${noradId}:`, error)
        }
      }
    }))
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < satellites.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log(`✅ Stored SATCAT data for ${satcatStoredCount} satellites`)

  console.log('✅ Satellite info data fetch completed')
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

  // Note: initializeTLEData removed - data fetching only happens on button click
  // No automatic fetching on page load/refresh

  // Calculate and log storage by sections (only if beatle query parameter is present)
  const route = useRoute()
  const beatleParam = route.query.beatle
  if (beatleParam === '' || beatleParam === 'true') {
    try {
      const tleData = await getTLEDataFromIndexedDB()
      const transponderData = await getAllTransponderData()
      const passPredictions = await getAllPassPredictions()
      
      // Calculate sizes
      const tleSize = JSON.stringify(tleData).length
      const transponderSize = JSON.stringify(transponderData).length
      const passPredictionsSize = JSON.stringify(passPredictions).length
      
      // Get SatNOGS info and SATCAT data sizes
      let satnogsInfoSize = 0
      let satcatSize = 0
      
      if (settings.value.trackedSatellites) {
        for (const satellite of settings.value.trackedSatellites) {
          if (satellite.noradId) {
            try {
              const satnogsInfo = await indexedDBStorage.getSatnogsInfo(satellite.noradId)
              if (satnogsInfo) {
                satnogsInfoSize += JSON.stringify(satnogsInfo).length
              }
            } catch {
              // Skip if not found
            }
            
            try {
              const satcatData = await indexedDBStorage.getSatcatData(satellite.noradId)
              if (satcatData) {
                satcatSize += JSON.stringify(satcatData).length
              }
            } catch {
              // Skip if not found
            }
          }
        }
      }
      
      const totalSize = tleSize + transponderSize + passPredictionsSize + satnogsInfoSize + satcatSize
      
      console.log('Our calculated storage size:', totalSize, 'bytes')
      console.log('TLE size:', tleSize, 'bytes')
      console.log('Transponder size:', transponderSize, 'bytes')
      console.log('Pass Predictions size:', passPredictionsSize, 'bytes')
      console.log('SatNOGS Info size:', satnogsInfoSize, 'bytes')
      console.log('SATCAT size:', satcatSize, 'bytes')
    } catch (error) {
      console.error('Failed to calculate storage sizes:', error)
    }
  }
})

// Cleanup on unmount
onUnmounted(() => {
  // Any cleanup needed
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
