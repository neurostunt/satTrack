<template>
  <NuxtLayout name="default" title="🛰️ AR Tracker" subtitle="Augmented Reality Satellite Tracking">
    <div class="max-w-lg mx-auto pb-24">
      <!-- AR View Container -->
      <div class="mb-6">
        <!-- AR Polar Plot -->
        <ArTrackArPolarPlot
            v-if="selectedPass"
            :satellite-name="selectedPass.satelliteName"
            :current-elevation="isGeostationarySatellite ? (geostationaryPosition?.elevation ?? selectedPass.maxElevation) : (currentPosition?.elevation ?? null)"
            :current-azimuth="isGeostationarySatellite ? (geostationaryPosition?.azimuth ?? selectedPass.maxAzimuth) : (currentPosition?.azimuth ?? null)"
            :current-distance="isGeostationarySatellite ? (geostationaryPosition?.distance ?? 0) : (currentPosition?.distance ?? 0)"
            :distance-units="settings.distanceUnits || 'km'"
            :past-positions="pastPositions"
            :future-positions="futurePositionsForPath"
            :start-azimuth="selectedPass.startAzimuth"
            :end-azimuth="selectedPass.endAzimuth"
            :max-elevation="selectedPass.maxElevation"
            :max-azimuth="selectedPass.maxAzimuth"
            :norad-id="selectedPass.noradId"
            :pass-start-time="selectedPass.startTime"
            :pass-end-time="selectedPass.endTime"
            :compass-heading="compassHeading"
          />
        <div v-else class="bg-space-900 border border-space-600 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
          <div class="text-space-400 text-center">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p>Select a passing satellite to start AR tracking</p>
          </div>
        </div>

        <!-- Calibration Overlay -->
        <div v-if="isCalibrating && selectedPass" class="fixed inset-0 bg-space-900/80 backdrop-blur-sm z-30 flex items-center justify-center p-6">
          <div class="text-center w-full">
            <div class="text-lg font-semibold text-primary-400 mb-4">Calibrating Compass</div>
            <div class="w-full h-3 bg-space-700 rounded-full overflow-hidden mb-4">
              <div class="h-full bg-primary-500 transition-all duration-300" :style="{ width: `${calibrationProgress}%` }" />
            </div>
            <p class="text-sm text-space-300">Move your device in a figure-8 pattern</p>
          </div>
        </div>
      </div>

      <!-- Controls & Selection -->
      <div class="bg-space-800 border border-space-700 rounded-lg p-4 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 flex items-end gap-3">
            <div class="flex-1">
              <label class="block text-xs text-space-400 mb-1 uppercase tracking-wider font-semibold">Active Passes</label>
              <select
                v-model="selectedPassId"
                @change="onPassSelected"
                class="w-full px-3 py-2 rounded bg-space-900 border border-space-600 text-space-200 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                :disabled="activePasses.length === 0"
              >
                <option v-if="activePasses.length === 0" value="" disabled>No active passes</option>
                <option v-else value="">Select Satellite...</option>
                <option
                  v-for="pass in activePasses"
                  :key="`${pass.noradId}-${pass.startTime}`"
                  :value="`${pass.noradId}-${pass.startTime}`"
                >
                  {{ pass.satelliteName }}
                </option>
              </select>
            </div>
            <!-- Tracking indicator inline -->
            <div v-if="isTrackingActive" class="flex items-center gap-2 px-3 py-2 rounded bg-green-600/20 border border-green-600/50 mb-0.5">
              <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span class="text-xs font-medium text-green-400">TRACKING</span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              v-if="isDeviceOrientationActive"
              @click="calibrateCompass"
              class="p-2 rounded bg-space-700 border border-space-600 text-space-300 hover:text-white transition-colors"
              title="Calibrate Compass"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- AR Indicators -->
      <div v-if="selectedPass && isTrackingActive" class="mt-6">
        <div v-if="!currentPosition && !isGeostationarySatellite" class="text-center py-4 bg-space-800 border border-space-700 rounded-lg mb-4">
          <div class="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p class="text-xs text-space-400">Waiting for real-time position data...</p>
        </div>
        <ArTrackArIndicators
          :current-azimuth="isGeostationarySatellite ? (geostationaryPosition?.azimuth ?? selectedPass.maxAzimuth) : (currentPosition?.azimuth ?? 0)"
          :current-elevation="isGeostationarySatellite ? (geostationaryPosition?.elevation ?? selectedPass.maxElevation) : (currentPosition?.elevation ?? 0)"
          :current-distance="isGeostationarySatellite ? (geostationaryPosition?.distance ?? 0) : (currentPosition?.distance ?? 0)"
          :distance-units="settings.distanceUnits || 'km'"
          :compass-heading="compassHeading"
          :device-pitch="devicePitch"
          :compass-quality="compassQuality"
          :radial-velocity="radialVelocity"
          :is-passing="!isGeostationarySatellite"
          :norad-id="selectedPass.noradId"
          :get-satellite-data="getSatelliteData"
        />
      </div>

      <!-- Status Messages -->
      <Transition name="fade">
        <div v-if="statusMessage" class="fixed top-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-lg z-50 border" :class="{
          'bg-green-900/90 text-green-300 border-green-700': statusMessageType === 'success',
          'bg-red-900/90 text-red-300 border-red-700': statusMessageType === 'error',
          'bg-blue-900/90 text-blue-300 border-blue-700': statusMessageType === 'info'
        }">
          {{ statusMessage.toUpperCase() }}
        </div>
      </Transition>
    </div>
  </NuxtLayout>
</template>

<script setup>
// Page metadata
useHead({
  title: 'AR Satellite Tracker',
  meta: [
    { name: 'description', content: 'Augmented Reality satellite tracking with device orientation' }
  ]
})

// Settings
const {
  settings,
  loadSettings
} = useSettings()

// Device orientation
const {
  start: startDeviceOrientation,
  stop: stopDeviceOrientation,
  startCalibration: startCompassCalibration,
  isActive: isDeviceOrientationActive,
  compassHeading,
  pitch,
  calibrationState
} = useDeviceOrientation()

// Pass data
const {
  passPredictions,
  combinedData,
  loadPassPredictions,
  loadStoredTransmitterData
} = usePassData(settings, () => null, () => '')

// Helper function to get satellite data
const getSatelliteData = (noradId) => {
  return combinedData.value[noradId] || null
}

// Pass status
const {
  currentTime,
  getPassStatus,
  updateCurrentTime,
  isGeostationary
} = usePassStatus()

// Pass filtering
const { sortedPasses } = usePassFiltering(
  passPredictions,
  settings,
  combinedData,
  getPassStatus,
  currentTime
)

// Real-time position tracking
const {
  currentPosition,
  positionHistory,
  futurePositions,
  radialVelocity,
  startTracking,
  stopTracking
} = useRealTimePosition()

const { getPastPositions } = useSatellitePath()

// Reactive state
const selectedPassId = ref('')
const selectedPass = ref(null)
const isTrackingActive = ref(false)
const statusMessage = ref('')
const statusMessageType = ref('info')
const timeUpdateInterval = ref(null)
const timeoutIds = ref([]) // Store all timeout IDs for cleanup
const isMounted = ref(false) // Track if component is mounted

// Computed properties
const activePasses = computed(() => {
  return sortedPasses.value.filter(pass => {
    const status = getPassStatus(pass.startTime, pass.endTime, pass.noradId, pass)
    // Only show passing or stationary satellites (exclude passed ones)
    return status === 'passing' || status === 'stationary'
  })
})

const isGeostationarySatellite = computed(() => {
  if (!selectedPass.value) return false
  return isGeostationary(selectedPass.value)
})

const geostationaryPosition = computed(() => {
  if (!isGeostationarySatellite.value || !selectedPass.value) return null

  const GEOSTATIONARY_ALTITUDE_KM = 35786
  const EARTH_RADIUS_KM = 6371
  const observerAltKm = (settings.value.observationLocation?.altitude || 0) / 1000

  const elevationRad = (selectedPass.value.maxElevation * Math.PI) / 180
  const R = EARTH_RADIUS_KM
  const h = GEOSTATIONARY_ALTITUDE_KM
  const obsR = R + observerAltKm

  const distance = Math.sqrt(
    Math.pow(R + h, 2) - Math.pow(obsR * Math.cos(elevationRad), 2)
  ) - obsR * Math.sin(elevationRad)

  return {
    azimuth: selectedPass.value.maxAzimuth,
    elevation: selectedPass.value.maxElevation,
    distance: distance,
    timestamp: Date.now()
  }
})

const pastPositions = computed(() => {
  return getPastPositions(positionHistory.value)
})

// Future positions for path drawing
const futurePositionsForPath = computed(() => {
  // Return future positions directly - they're already filtered in useRealTimePosition
  // The futurePath computed in ArPolarPlot will handle combining past + future
  return futurePositions.value || []
})

// Watch removed - no longer needed for debugging

const devicePitch = computed(() => {
  return pitch.value
})

const compassQuality = computed(() => {
  // Calculate compass quality based on calibration state
  if (calibrationState.value.isCalibrating) {
    return calibrationState.value.calibrationProgress
  }
  // If calibrated, assume good quality
  if (calibrationState.value.calibrationProgress === 100) {
    return 90
  }
  // Default to medium quality
  return 50
})

const isCalibrating = computed(() => {
  return calibrationState.value.isCalibrating
})

const calibrationProgress = computed(() => {
  return calibrationState.value.calibrationProgress
})

const canStartTracking = computed(() => {
  if (!selectedPass.value) return false
  // Don't require device orientation - allow tracking on desktop too
  if (!settings.value.n2yoApiKey && !isGeostationarySatellite.value) return false
  return true
})

// Methods
const onPassSelected = async () => {
  // Stop current tracking if active
  if (isTrackingActive.value) {
    stopTracking()
    isTrackingActive.value = false
  }

  if (!selectedPassId.value) {
    selectedPass.value = null
    return
  }

  const [noradId, startTime] = selectedPassId.value.split('-')
  const pass = activePasses.value.find(
    p => p.noradId === parseInt(noradId) && p.startTime === parseInt(startTime)
  )

  if (pass) {
    // Check if pass is still active
    const status = getPassStatus(pass.startTime, pass.endTime, pass.noradId, pass)
    if (status === 'passed') {
      // Pass has ended, remove from selection
      selectedPassId.value = ''
      selectedPass.value = null
      stopTracking()
      isTrackingActive.value = false
      showStatus('Satellite pass has ended', 'info')
      return
    }

    selectedPass.value = pass
    showStatus('Satellite selected', 'success')
    
    // Auto-start tracking immediately
    if (canStartTracking.value) {
      // Small delay to ensure state is updated
      const timeoutId = setTimeout(async () => {
        await startTrackingForPass(pass)
      }, 100)
      timeoutIds.value.push(timeoutId)
    }
  }
}

// Helper function to start tracking for a pass
const startTrackingForPass = async (pass) => {
  // Stop any existing tracking first to clear cache
  if (isTrackingActive.value) {
    stopTracking()
    isTrackingActive.value = false
    // Small delay to ensure cleanup
    await new Promise(resolve => {
      const timeoutId = setTimeout(resolve, 100)
      timeoutIds.value.push(timeoutId)
    })
  }

  // For geostationary satellites, no API call needed
  if (!isGeostationarySatellite.value) {
    if (!settings.value.n2yoApiKey) {
      showStatus('N2YO API key required for tracking', 'error')
      return
    }

    await startTracking(
      pass.noradId,
      settings.value.observationLocation.latitude,
      settings.value.observationLocation.longitude,
      settings.value.observationLocation.altitude || 0,
      settings.value.n2yoApiKey
    )
  }

  isTrackingActive.value = true
  showStatus('Tracking started', 'success')
}

// Toggle tracking removed - now auto-starts on satellite selection

const calibrateCompass = () => {
  if (!isDeviceOrientationActive.value) {
    showStatus('Device orientation not active', 'error')
    return
  }

  startCompassCalibration()
  showStatus('Calibrating compass... Move device in figure-8 pattern', 'info')
}

const showStatus = (message, type = 'info') => {
  statusMessage.value = message
  statusMessageType.value = type
  const timeoutId = setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
  timeoutIds.value.push(timeoutId)
}


// Initialize
const initialize = async () => {
  await loadSettings()
  await loadPassPredictions()
  await loadStoredTransmitterData()

  // Check for query parameters (from PassDetails link)
  const route = useRoute()
  const noradIdParam = route.query.noradId
  const startTimeParam = route.query.startTime

  if (noradIdParam && startTimeParam) {
    const noradId = parseInt(String(noradIdParam))
    const startTime = parseInt(String(startTimeParam))
    
    // Find matching pass
    const pass = activePasses.value.find(
      p => p.noradId === noradId && p.startTime === startTime
    )

    if (pass) {
      // Check if pass is still active
      const status = getPassStatus(pass.startTime, pass.endTime, pass.noradId, pass)
      if (status === 'passed') {
        showStatus('Satellite pass has ended', 'info')
        return
      }

      selectedPassId.value = `${pass.noradId}-${pass.startTime}`
      selectedPass.value = pass
      showStatus('Satellite selected', 'success')
      
      // Clear any existing tracking first to avoid cache issues
      if (isTrackingActive.value) {
        stopTracking()
        isTrackingActive.value = false
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, 200)
          timeoutIds.value.push(timeoutId)
        })
      }
      
      // Auto-start tracking if conditions are met
      // Wait a bit for reactive state to update
      const timeoutId = setTimeout(async () => {
        if (canStartTracking.value) {
          await startTrackingForPass(pass)
        }
      }, 300)
      timeoutIds.value.push(timeoutId)
    }
  }

  // Start device orientation (optional - not required for tracking)
  if (settings.value.enableDeviceOrientation) {
    await startDeviceOrientation()
  }

  // Don't auto-select to prevent infinite loops
  // User must manually select a satellite from the dropdown

  // Start time updates
  timeUpdateInterval.value = setInterval(() => {
    if (!isMounted.value) return // Don't execute if component is unmounted
    try {
      updateCurrentTime()
    } catch (error) {
      if (isMounted.value) {
        console.error('Error in time update:', error)
      }
    }
  }, 1000)
}

// Watch for activePasses changes to update selectedPass
// Note: Removed auto-select and auto-tracking logic to prevent infinite loops
const stopWatchActivePasses = watch(activePasses, (newPasses) => {
  if (!isMounted.value) return // Don't execute if component is unmounted
  
  // Only update if we have a selected pass
  if (selectedPass.value && selectedPassId.value) {
    const [noradId, startTime] = selectedPassId.value.split('-')
    const updatedPass = newPasses.find(
      p => p.noradId === parseInt(noradId) && p.startTime === parseInt(startTime)
    )
    
    if (updatedPass) {
      // Update the pass data without triggering auto-select
      selectedPass.value = updatedPass
    } else {
      // Pass is no longer active, clear selection
      selectedPass.value = null
      selectedPassId.value = ''
      if (isTrackingActive.value) {
        stopTracking()
        isTrackingActive.value = false
      }
      showStatus('Satellite pass has ended', 'info')
    }
  }
}, { 
  deep: false, // Don't deep watch to avoid unnecessary triggers
  flush: 'post' // Run after component updates to prevent loops
})

onMounted(async () => {
  isMounted.value = true
  await initialize()
})

onUnmounted(() => {
  // Stop watch functions FIRST
  if (stopWatchActivePasses) {
    stopWatchActivePasses()
  }
  
  // Clear intervals SECOND
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value)
    timeUpdateInterval.value = null
  }
  
  // Mark as unmounted THIRD (after stopping all async operations)
  isMounted.value = false
  
  // Clear all timeouts
  if (timeoutIds.value && timeoutIds.value.length > 0) {
    timeoutIds.value.forEach(id => {
      if (id) clearTimeout(id)
    })
    timeoutIds.value = []
  }
  
  // Stop tracking
  if (isTrackingActive.value) {
    stopTracking()
    isTrackingActive.value = false
  }
  
  // Stop device orientation
  stopDeviceOrientation()
  
  // Clear reactive state
  selectedPass.value = null
  selectedPassId.value = ''
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Styles moved to ArPolarPlot component */
</style>

