<template>
  <div v-if="combinedData && Object.keys(combinedData).length > 0" class="max-w-lg mx-auto mb-6">
    <div class="bg-space-800 border border-space-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
        📡 Combined Satellite Data
        <span class="ml-2 text-sm text-space-300">({{ Object.keys(combinedData).length }} satellites)</span>
      </h3>

      <div class="space-y-4">
        <div
          v-for="(data, noradId) in combinedData"
          :key="noradId"
          class="bg-space-900 border border-space-600 rounded p-3"
        >
          <!-- Clickable Header -->
          <div
            @click="toggleSatelliteData(noradId)"
            class="flex items-center justify-between mb-2 cursor-pointer hover:bg-space-800 rounded p-2 transition-all duration-300 ease-in-out hover:scale-[1.01] group"
          >
            <div class="flex items-center gap-2">
              <h4 class="font-semibold text-primary-300 group-hover:text-primary-200 transition-colors duration-300 ease-in-out">
                <template v-if="getFormattedSatelliteName(data.satellite, noradId).secondary">
                  {{ getFormattedSatelliteName(data.satellite, noradId).primary }} -
                  <span class="text-xs">{{ getFormattedSatelliteName(data.satellite, noradId).secondary }}</span>
                </template>
                <template v-else>
                  {{ getFormattedSatelliteName(data.satellite, noradId).primary }}
                </template>
              </h4>
              <span class="text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out">NORAD ID: {{ noradId }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out">{{ data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown' }}</span>
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
                    <div v-if="getTLEData(parseInt(noradId)).tle0" class="break-all">{{ getTLEData(parseInt(noradId)).tle0 }}</div>
                    <div v-if="getTLEData(parseInt(noradId)).tle1" class="break-all">{{ getTLEData(parseInt(noradId)).tle1 }}</div>
                    <div v-if="getTLEData(parseInt(noradId)).tle2" class="break-all">{{ getTLEData(parseInt(noradId)).tle2 }}</div>
                  </div>
                </div>
              </div>

              <!-- Transmitter Information -->
              <div v-if="data.transmitters && data.transmitters.length > 0" class="mb-3">
                <div class="text-sm text-space-300 mb-2">📡 Transmitter Information</div>
                <div class="space-y-2">
                  <div
                    v-for="transmitter in data.transmitters"
                    :key="transmitter.id"
                    class="bg-space-800 border border-space-500 rounded p-2 text-xs"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <div class="font-medium text-space-200">{{ getCleanDescription(transmitter.description) }}</div>
                      <div class="text-space-400">{{ formatFrequency(transmitter.frequency) }}</div>
                    </div>
                    <div class="text-space-500">{{ transmitter.mode }} • {{ transmitter.power }}</div>
                    <div v-if="transmitter.callsign" class="text-purple-400 text-xs mt-1 font-medium">Callsign: {{ transmitter.callsign }}</div>
                    <div v-if="transmitter.ctcss" class="text-yellow-400 text-xs mt-1">CTCSS: {{ transmitter.ctcss }} Hz</div>
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
const getFullSatelliteName = (satellite, noradId) => {
  if (!satellite) return `NORAD ${noradId}`

  const name = satellite.name || ''
  const names = satellite.names || ''

  // If both exist and are different, combine them
  if (names && name && names !== name) {
    return `${names} - ${name}`
  }

  // Return whichever exists
  return names || name || `NORAD ${noradId}`
}

const getFormattedSatelliteName = (satellite, noradId) => {
  if (!satellite) return { primary: `NORAD ${noradId}`, secondary: null }

  const name = satellite.name || ''
  const names = satellite.names || ''

  // If both exist and are different, combine them with smaller font for second part
  if (names && name && names !== name) {
    return {
      primary: names,    // SAUDISAT 1C (main name)
      secondary: name   // SO-50 (secondary name)
    }
  }

  // Return single name
  return {
    primary: names || name || `NORAD ${noradId}`,
    secondary: null
  }
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

const getCleanDescription = (description) => {
  if (!description) return 'Unknown'
  // Remove CTCSS information from description
  return description.replace(/\(CTCSS:?\s*\d+(?:\.\d+)?\s*Hz\)/gi, '').trim()
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
