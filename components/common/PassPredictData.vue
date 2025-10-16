<template>
  <div v-if="combinedData && Object.keys(combinedData).length > 0" class="max-w-lg mx-auto mb-6">
    <div class="bg-space-800 border border-space-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
        🛰️ Pass Prediction Data
        <span class="ml-2 text-sm text-space-300">({{ Object.keys(combinedData).length }} satellites)</span>
      </h3>

      <div class="space-y-4">
        <div
          v-for="(data, noradId) in combinedData"
          :key="noradId"
          class="bg-space-900 border border-space-600 rounded p-3"
          :class="{ 'bg-space-800': isSatelliteExpanded(noradId) }"
        >
          <!-- Clickable Header -->
          <div
            @click="toggleSatelliteData(noradId)"
            class="flex items-center justify-between mb-1 cursor-pointer rounded py-1 px-2 transition-all duration-300 ease-in-out hover:scale-[1.01] group"
            :class="isSatelliteExpanded(noradId) ? 'bg-space-800' : 'hover:bg-space-800'"
          >
            <div class="flex items-center gap-2 w-full">
              <div class="flex flex-col w-full">
        <!-- First row: Main satellite name + timestamp -->
        <div class="flex items-center pt-0 pb-1 leading-1">
          <div class="text-sm font-medium text-primary-300 group-hover:text-primary-200 transition-colors duration-300 ease-in-out w-[60%] py-0.5">
            {{ getFormattedSatelliteName(data.satellite, noradId).primary }}
          </div>
          <span class="text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out w-[40%] text-right flex-shrink-0 mr-2">
            {{ data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown' }}
          </span>
        </div>
                <!-- Second row: Secondary name + NORAD ID (proper spacing) -->
                <div class="flex items-center gap-2 text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out mt-1 pb-2">
                  <span v-if="getFormattedSatelliteName(data.satellite, noradId).secondary">
                    {{ getFormattedSatelliteName(data.satellite, noradId).secondary }} -
                  </span>
                  <span>NORAD ID: {{ noradId }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="transform transition-transform duration-500 ease-in-out" :class="{ 'rotate-180': isSatelliteExpanded(noradId) }">
                <svg class="w-4 h-4 text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Collapsible Content -->
          <Transition
            name="slide-down"
            enter-active-class="transition-all duration-700 ease-out"
            leave-active-class="transition-all duration-500 ease-in"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-[2000px] opacity-100"
            leave-from-class="max-h-[2000px] opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div
              v-show="isSatelliteExpanded(noradId)"
              class="overflow-hidden"
            >
              <!-- Orbital Parameters Box -->
              <div v-if="getTLEData(parseInt(noradId))" class="mb-3">
                <div class="text-sm text-space-300 mb-2">🛰️ Orbital Parameters (TLE)</div>
                <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                  <div class="text-xs text-space-400 space-y-1 font-mono">
                    <div v-if="getTLEData(parseInt(noradId)).line1" class="break-all">{{ getTLEData(parseInt(noradId)).line1 }}</div>
                    <div v-if="getTLEData(parseInt(noradId)).line2" class="break-all">{{ getTLEData(parseInt(noradId)).line2 }}</div>
                  </div>
                </div>
              </div>

              <!-- Pass Predictions -->
              <div v-if="data.passPredictions && data.passPredictions.passes.length > 0" class="mb-3">
                <div class="text-sm text-space-300 mb-2">🛰️ Pass Predictions</div>
                <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                  <div class="mb-2">
                    <div class="text-primary-400 font-medium">Next Pass: {{ data.passPredictions.nextPassFormatted }}</div>
                    <div class="text-space-400">Total Passes: {{ data.passPredictions.passCount }}</div>
                  </div>

                  <!-- Upcoming Passes -->
                  <div class="space-y-1">
                    <div
                      v-for="(pass, index) in data.passPredictions.passes.slice(0, 5)"
                      :key="index"
                      class="flex justify-between items-center text-xs"
                    >
                      <div>
                        <span class="text-space-300">{{ formatPassTime(pass.startTime) }}</span>
                        <span class="text-space-400 ml-2">{{ formatPassDuration(pass.duration) }}</span>
                      </div>
                      <div class="text-green-400 font-medium">
                        {{ Math.round(pass.maxElevation) }}°
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Satellite Status -->
              <div v-if="data.satellite?.status" class="mb-3">
                <div class="text-sm text-space-300 mb-2">📊 Satellite Status</div>
                <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                  <div class="flex items-center gap-2">
                    <span :class="getStatusColor(data.satellite.status)" class="font-medium">{{ getStatusText(data.satellite.status) }}</span>
                    <span class="text-space-400">{{ data.satellite.names || 'No additional names' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
// Import satellite name utilities
import { getFullSatelliteName, formatSatelliteNameForDisplay } from '~/utils/satelliteNameUtils'

// Props
defineProps({
  combinedData: {
    type: Object,
    required: true
  },
  getTLEData: {
    type: Function,
    required: true
  },
  formatFrequency: {
    type: Function,
    required: true
  }
})

// Reactive state
const expandedSatellites = ref(new Set())

// Functions
const getFormattedSatelliteName = (satellite, noradId) => {
  return formatSatelliteNameForDisplay(satellite, noradId)
}

const toggleSatelliteData = (noradId) => {
  if (expandedSatellites.value.has(noradId)) {
    expandedSatellites.value.delete(noradId)
  } else {
    expandedSatellites.value.add(noradId)
  }
}

const isSatelliteExpanded = (noradId) => {
  return expandedSatellites.value.has(noradId)
}

const getStatusColor = (status) => {
  switch (status) {
    case 'alive':
      return 'text-green-400'
    case 'dead':
      return 'text-red-400'
    case 're-entered':
      return 'text-orange-400'
    default:
      return 'text-space-400'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'alive':
      return 'ACTIVE'
    case 'dead':
      return 'INACTIVE'
    case 're-entered':
      return 'RE-ENTERED'
    default:
      return 'UNKNOWN'
  }
}

const formatPassTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

const formatPassDuration = (durationMs) => {
  const minutes = Math.floor(durationMs / (1000 * 60))
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)
  return `${minutes}m ${seconds}s`
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
