<template>
  <NuxtLayout name="default" title="🛰️ Pass Predict" subtitle="Satellite Pass Prediction">
    <!-- Observation Location -->
    <ObservationLocation
      :latitude="settings.observationLocation?.latitude || 0"
      :longitude="settings.observationLocation?.longitude || 0"
      :altitude="settings.observationLocation?.altitude || 0"
      :grid-square="settings.gridSquare || ''"
    />

    <!-- Pass Prediction Data -->
    <div v-if="combinedData && Object.keys(combinedData).length > 0" class="max-w-lg mx-auto mb-6">
      <div class="bg-space-800 border border-space-700 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
          🛰️ Pass Predictions
          <span class="ml-2 text-sm text-space-300">({{ sortedPasses.length }} upcoming passes)</span>
        </h3>

        <!-- Loading State -->
        <div v-if="isPassCalculating" class="text-center py-8">
          <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-space-300">Calculating pass predictions...</p>
        </div>

        <!-- No Passes -->
        <div v-else-if="sortedPasses.length === 0" class="text-center py-8">
          <p class="text-space-400">No upcoming passes found</p>
          <p class="text-space-500 text-sm mt-2">Make sure you have tracked satellites and TLE data</p>
        </div>

        <!-- Individual Pass Cards -->
        <div v-else class="space-y-4">
          <PassCard
            v-for="pass in sortedPasses"
            :key="`${pass.noradId}-${pass.startTime}`"
            :pass="pass"
            :is-expanded="isPassExpanded(pass.noradId, pass.startTime)"
            :is-passing="getPassStatus(pass.startTime, pass.endTime, pass.noradId) === 'passing'"
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
      <PassPredictData
        :combined-data="combinedData"
        :get-t-l-e-data="getTLEData"
        :format-frequency="formatFrequency"
      />
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import ObservationLocation from '~/components/common/ObservationLocation.vue'
import PassPredictData from '~/components/common/PassPredictData.vue'
import PassCard from '~/components/pass-predict/PassCard.vue'
import { useSettings } from '~/composables/storage/useSettings'
import { useTLEData } from '~/composables/api/useTLEData'
import { usePassPrediction } from '~/composables/satellite/usePassPrediction'
import { usePassStatus } from '~/composables/pass-predict/usePassStatus'
import { usePassFiltering } from '~/composables/pass-predict/usePassFiltering'
import { usePassCleanup } from '~/composables/pass-predict/usePassCleanup'
import { usePassData } from '~/composables/pass-predict/usePassData'

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
  calculatePassesForSatellites,
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
  observerLocation,
  loadPassPredictions,
  loadStoredTransmitterData
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

// Reactive state
const expandedSatellites = ref(new Set()) // Track which satellites are expanded

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

// Helper functions for satellite name formatting
const getFormattedSatelliteName = (satellite, noradId) => {
  if (!satellite) {
    return { primary: `Satellite ${noradId}`, secondary: null }
  }

  const primary = satellite.name || satellite.names || `Satellite ${noradId}`
  const secondary = satellite.names && satellite.name && satellite.names !== satellite.name ? satellite.names : null

  return { primary, secondary }
}


onMounted(async () => {
  console.log('🚀 Pass-predict page mounted, starting data loading...')

  await loadSettings()
  await initializeTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken)

  // Load stored pass predictions and transmitter data
  await loadPassPredictions()
  await loadStoredTransmitterData()

  // Start real-time updates for time until pass
  const timeUpdateInterval = setInterval(() => {
    updateCurrentTime()
    
    // Handle auto-removal of passed satellites (every second)
    handleAutoRemoval()
    
    // Also cleanup expired passes every 30 seconds
    if (Date.now() % 30000 < 1000) {
      cleanupExpiredPasses()
    }
  }, 1000)

  // Initial cleanup of expired passes
  cleanupExpiredPasses()

  console.log('✅ Pass-predict page initialization complete')
})

// Cleanup interval on unmount
onUnmounted(() => {
  // Interval cleanup is handled by the composables
})
</script>

<style scoped>
/* Passing state styling - only header blinking, no card background changes */
.passing-card .text-primary-300 {
  color: #10b981 !important; /* green-500 */
}
</style>
