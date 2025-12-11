<template>
  <NuxtLayout name="default" title="🛰️ Pass Predict" subtitle="Satellite Pass Prediction">
    <!-- Observation Location -->
    <CommonObservationLocation
      :latitude="settings.observationLocation?.latitude || 0"
      :longitude="settings.observationLocation?.longitude || 0"
      :altitude="settings.observationLocation?.altitude || 0"
      :grid-square="settings.gridSquare || ''"
    />

    <!-- Pass Prediction Data -->
    <div v-if="passPredictions && passPredictions.size > 0" class="max-w-lg mx-auto mb-6">
      <div class="bg-space-800 border border-space-700 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
          🛰️ Pass Predictions
          <span class="ml-2 text-sm text-space-300">({{ passesWithTransmitters.length }} upcoming passes)</span>
        </h3>

        <!-- Loading State -->
        <div v-if="isPassCalculating" class="text-center py-8">
          <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-space-300">Calculating pass predictions...</p>
        </div>

        <!-- No Passes -->
        <div v-else-if="passesWithTransmitters.length === 0" class="text-center py-8">
          <p class="text-space-400">No upcoming passes with available transmitters found</p>
          <p class="text-space-500 text-sm mt-2">Make sure you have tracked satellites with transmitter data</p>
        </div>

        <!-- Individual Pass Cards -->
        <div v-else class="space-y-4">
          <PassPredictPassCard
            v-for="pass in passesWithTransmitters"
            :key="`${pass.noradId}-${pass.startTime}`"
            :pass="pass"
            :is-expanded="isPassExpanded(pass.noradId, pass.startTime)"
            :is-passing="getPassStatus(pass.startTime, pass.endTime, pass.noradId, pass) === 'passing'"
            :format-time-until-pass="formatTimeUntilPass"
            :get-pass-status="getPassStatus"
            :get-t-l-e-data="getTLEData"
            :get-satellite-data="getSatelliteData"
            :format-pass-time="formatPassTime"
            :format-pass-duration="formatPassDuration"
            @toggle="togglePassData(pass.noradId, pass.startTime)"
          />
        </div>
      </div>
    </div>

    <!-- Individual Satellite Data (Hidden for now) -->
    <div v-if="false" class="max-w-lg mx-auto mb-6">
      <CommonPassPredictData
        :combined-data="combinedData"
        :get-t-l-e-data="getTLEData"
        :format-frequency="formatFrequency"
      />
    </div>
  </NuxtLayout>
</template>

<script setup>
// Nuxt 4 auto-imports:
// - Vue functions (ref, onMounted, onUnmounted, computed, watch)
// - Components from components/ directory
// - Composables from composables/ directory
import { matchesTransmitterFilters } from '~/utils/transmitterCategorization'

const {
  settings,
  loadSettings
} = useSettings()

const {
  getTLEData,
  initializeTLEData,
  fetchTLEData
} = useTLEData()

const {
  getNextPassTime,
  formatPassTime,
  formatPassDuration,
  isLoading: isPassCalculating
} = usePassPrediction()

// Pass status composable
const {
  currentTime,
  getPassStatus,
  formatTimeUntilPass,
  updateCurrentTime,
  isGeostationary
} = usePassStatus()

// Pass data composable
const {
  passPredictions,
  combinedData,
  loadPassPredictions,
  loadStoredTransmitterData,
  calculateFreshPassPredictions,
  isDataStale
} = usePassData(settings, getNextPassTime, formatPassTime)

// Pass filtering composable
const { sortedPasses } = usePassFiltering(
  passPredictions,
  settings,
  combinedData,
  getPassStatus,
  currentTime
)

// Pass cleanup composable
const { cleanupExpiredPasses, handleAutoRemoval } = usePassCleanup(
  passPredictions,
  isGeostationary
)

// Sound alerts composable
const {
  enable: enableSoundAlerts,
  disable: disableSoundAlerts,
  checkAndPlayAlert
} = useSoundAlerts()

// Device orientation composable (for auto-calibrate compass)
const {
  start: startDeviceOrientation,
  stop: stopDeviceOrientation,
  startCalibration: startCompassCalibration,
  isActive: isDeviceOrientationActive
} = useDeviceOrientation()

// Reactive state
const expandedSatellites = ref(new Set()) // Track which satellites are expanded
const timeUpdateInterval = ref(null)
const backgroundRefreshInterval = ref(null)
const soundAlertCheckInterval = ref(null)
const alertedPasses = ref(new Map()) // Track which passes have triggered alerts

// Collapsible functionality for individual passes
const isPassExpanded = (noradId, startTime) => {
  const passKey = `${noradId}-${startTime}`
  return expandedSatellites.value.has(passKey)
}

const togglePassData = (noradId, startTime) => {
  const passKey = `${noradId}-${startTime}`
  if (expandedSatellites.value.has(passKey)) {
    expandedSatellites.value.delete(passKey)
  } else {
    expandedSatellites.value.add(passKey)
  }
}

// Helper function to get satellite data by NORAD ID
const getSatelliteData = (noradId) => {
  return combinedData.value[noradId] || null
}

// Helper function to check if a pass has available transmitters after filtering
const hasAvailableTransmitters = (pass) => {
  const satData = getSatelliteData(pass.noradId)
  const allTransmitters = satData?.transmitters || []

  // If no transmitter data at all, don't show (satellite might not have transmitter data loaded)
  if (allTransmitters.length === 0) {
    // But if transmitterCount is set and > 0, we might have data that just isn't loaded yet
    // In that case, show it anyway (data might load later)
    if (pass.transmitterCount && pass.transmitterCount > 0) {
      return true
    }
    return false
  }

  // Filter out dead transmitters
  const aliveTransmitters = allTransmitters.filter(t => t.alive !== false)

  // If no alive transmitters, don't show
  if (aliveTransmitters.length === 0) {
    return false
  }

  // Apply frequency type filters if settings are available
  if (settings.value?.transmitterFilters) {
    const filtered = aliveTransmitters.filter(transmitter =>
      matchesTransmitterFilters(transmitter, settings.value.transmitterFilters)
    )
    return filtered.length > 0
  }

  // If no filters configured, show if there are alive transmitters
  return aliveTransmitters.length > 0
}

// Filter passes to only show those with available transmitters
const passesWithTransmitters = computed(() => {
  return sortedPasses.value.filter(pass => hasAvailableTransmitters(pass))
})

// Check and play sound alerts for passes
// IMPORTANT: Only alert for passes that are actually displayed on the page
// This means they must:
// 1. Pass minElevation filter (already filtered in sortedPasses)
// 2. Have available transmitters (filtered in passesWithTransmitters)
// 3. Not be geostationary
const checkSoundAlerts = () => {
  if (!settings.value.soundAlerts) return

  const now = currentTime.value
  const TEN_MINUTES = 10 * 60 * 1000

  // Use passesWithTransmitters which already includes all filters:
  // - minElevation filter (from sortedPasses)
  // - transmitter availability filter
  // This ensures we only alert for passes that are actually displayed on the page
  passesWithTransmitters.value.forEach(pass => {
    // Skip geostationary satellites - no alerts needed for stationary satellites
    if (isGeostationary(pass)) {
      return
    }

    // Additional safety check: ensure pass meets minElevation requirement
    // (should already be filtered, but double-check for safety)
    const minElevation = settings.value?.minElevation || 20
    if (pass.maxElevation < minElevation) {
      return // Skip passes below minimum elevation
    }

    // Only alert for passes that are upcoming or currently passing
    // Don't alert for passes that have already ended (more than 10 seconds ago)
    const passStatus = getPassStatus(pass.startTime, pass.endTime, pass.noradId, pass)
    if (passStatus === 'passed') {
      return // Skip passes that have already ended
    }

    const passKey = `${pass.noradId}-${pass.startTime}`
    const alerted = alertedPasses.value.get(passKey) || {
      warning10min: false,
      start: false,
      maxElevation: false,
      end: false
    }

    // 10-minute warning
    if (!alerted.warning10min && now >= pass.startTime - TEN_MINUTES && now < pass.startTime) {
      checkAndPlayAlert({
        type: 'pass_10min_warning',
        noradId: pass.noradId,
        satelliteName: getSatelliteData(pass.noradId)?.satellite?.name,
        timestamp: now
      })
      alerted.warning10min = true
      alertedPasses.value.set(passKey, alerted)
    }

    // Pass start
    if (!alerted.start && now >= pass.startTime && now < pass.startTime + 5000) {
      checkAndPlayAlert({
        type: 'pass_start',
        noradId: pass.noradId,
        satelliteName: getSatelliteData(pass.noradId)?.satellite?.name,
        timestamp: now
      })
      alerted.start = true
      alertedPasses.value.set(passKey, alerted)
    }

    // Max elevation (approximate - when pass is at midpoint)
    const passDuration = pass.endTime - pass.startTime
    const maxElevationTime = pass.startTime + passDuration / 2
    if (!alerted.maxElevation && now >= maxElevationTime - 5000 && now < maxElevationTime + 5000) {
      checkAndPlayAlert({
        type: 'max_elevation',
        noradId: pass.noradId,
        satelliteName: getSatelliteData(pass.noradId)?.satellite?.name,
        timestamp: now
      })
      alerted.maxElevation = true
      alertedPasses.value.set(passKey, alerted)
    }

    // Pass end
    if (!alerted.end && now >= pass.endTime - 5000 && now < pass.endTime + 5000) {
      checkAndPlayAlert({
        type: 'pass_end',
        noradId: pass.noradId,
        satelliteName: getSatelliteData(pass.noradId)?.satellite?.name,
        timestamp: now
      })
      alerted.end = true
      alertedPasses.value.set(passKey, alerted)
    }
  })
}

onMounted(async () => {
  await loadSettings()
  await initializeTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken)

  // Load stored pass predictions from IndexedDB (no API calls)
  await loadPassPredictions()

  // Load stored transmitter data
  await loadStoredTransmitterData()

  // Enable sound alerts if setting is enabled
  if (settings.value.soundAlerts) {
    enableSoundAlerts()
  }

  // Start device orientation if enabled
  if (settings.value.enableDeviceOrientation) {
    await startDeviceOrientation()

    // Start compass calibration if auto-calibrate is enabled
    if (settings.value.autoCalibrateCompass && isDeviceOrientationActive.value) {
      startCompassCalibration()
    }
  }

  // Start real-time updates for time until pass
  timeUpdateInterval.value = setInterval(() => {
    updateCurrentTime()

    // Handle auto-removal of passed satellites (every second)
    handleAutoRemoval()

    // Also cleanup expired passes every 30 seconds
    if (Date.now() % 30000 < 1000) {
      cleanupExpiredPasses()
    }
  }, 1000)

  // Check sound alerts every 5 seconds
  if (settings.value.soundAlerts) {
    soundAlertCheckInterval.value = setInterval(() => {
      checkSoundAlerts()
    }, 5000)
  }

  // Background refresh: Auto-update TLE and pass predictions every 6 hours
  // Only enabled if autoUpdateTLE is checked in settings
  // Interval: 6 hours (TLE data is typically updated every 12-24 hours, so 6h is a good balance)
  const AUTO_UPDATE_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

  if (settings.value.autoUpdateTLE) {
    console.log(`✅ Auto-update TLE enabled - Starting ${AUTO_UPDATE_INTERVAL / (60 * 60 * 1000)}-hour background refresh interval`)

    // Function to perform full refresh: TLE data + pass predictions
    const performAutoUpdate = async () => {
      try {
        console.log('🔄 Auto-update: Starting full refresh (TLE + pass predictions)...')

        // Check if we have tracked satellites
        if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
          console.log('ℹ️ No tracked satellites, skipping auto-update')
          return
        }

        // Step 1: Fetch fresh TLE data (force refresh) and save to IndexedDB
        console.log('📥 Step 1: Fetching fresh TLE data...')
        await fetchTLEData(
          settings.value.trackedSatellites,
          settings.value.spaceTrackUsername,
          settings.value.spaceTrackPassword,
          settings.value.satnogsToken,
          true // forceRefresh = true to always get latest data
        )
        console.log('✅ TLE data fetched and saved to IndexedDB')

        // Step 2: Calculate fresh pass predictions using new TLE data
        console.log('📊 Step 2: Calculating fresh pass predictions...')
        await calculateFreshPassPredictions()
        console.log('✅ Pass predictions calculated')

        // Step 3: Reload stored transmitter data to update combined data
        await loadStoredTransmitterData()
        console.log('✅ Auto-update completed successfully')

      } catch (error) {
        console.error('❌ Auto-update failed:', error)
        // Don't throw - allow app to continue with cached data
      }
    }

    // Run immediately on mount if data is stale
    if (isDataStale() || passPredictions.value.size === 0) {
      console.log('🔄 Data is stale or missing, running initial auto-update...')
      performAutoUpdate()
    }

    // Set up periodic refresh
    backgroundRefreshInterval.value = setInterval(() => {
      performAutoUpdate()
    }, AUTO_UPDATE_INTERVAL)
  } else {
    console.log('⏸️ Auto-update TLE disabled - Background refresh will not run')
  }

  // Initial cleanup of expired passes
  cleanupExpiredPasses()
})

// Cleanup interval on unmount
onUnmounted(() => {
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value)
  }
  if (backgroundRefreshInterval.value) {
    clearInterval(backgroundRefreshInterval.value)
  }
  if (soundAlertCheckInterval.value) {
    clearInterval(soundAlertCheckInterval.value)
  }

  // Stop device orientation
  stopDeviceOrientation()

  // Disable sound alerts
  disableSoundAlerts()
})

// Watch for settings changes
watch(() => settings.value.soundAlerts, (enabled) => {
  if (enabled) {
    enableSoundAlerts()
    if (!soundAlertCheckInterval.value) {
      soundAlertCheckInterval.value = setInterval(() => {
        checkSoundAlerts()
      }, 5000)
    }
  } else {
    disableSoundAlerts()
    if (soundAlertCheckInterval.value) {
      clearInterval(soundAlertCheckInterval.value)
      soundAlertCheckInterval.value = null
    }
  }
})

watch(() => settings.value.enableDeviceOrientation, async (enabled) => {
  if (enabled) {
    await startDeviceOrientation()
    if (settings.value.autoCalibrateCompass && isDeviceOrientationActive.value) {
      startCompassCalibration()
    }
  } else {
    stopDeviceOrientation()
  }
})

watch(() => settings.value.autoCalibrateCompass, (enabled) => {
  if (enabled && isDeviceOrientationActive.value) {
    startCompassCalibration()
  }
})
</script>

<style scoped>
/* Passing state styling - only header blinking, no card background changes */
.passing-card .text-primary-300 {
  color: #10b981 !important; /* green-500 */
}
</style>
