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
              <h4 class="font-semibold text-primary-300 group-hover:text-primary-200 transition-colors duration-300 ease-in-out">{{ data.satellite?.name || `NORAD ${noradId}` }}</h4>
              <span class="text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out">NORAD ID: {{ noradId }}</span>
              <span v-if="data.satellite?.status" :class="getStatusColor(data.satellite.status)" class="text-xs font-medium">{{ getStatusText(data.satellite.status) }}</span>
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
              <div v-if="tleData[parseInt(noradId)]" class="mb-3">
                <div class="text-sm text-space-300 mb-2">🛰️ Orbital Parameters (TLE)</div>
                <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                  <div class="text-xs text-space-400 space-y-1 font-mono">
                    <div v-if="tleData[parseInt(noradId)].tle0" class="break-all">{{ tleData[parseInt(noradId)].tle0 }}</div>
                    <div v-if="tleData[parseInt(noradId)].tle1" class="break-all">{{ tleData[parseInt(noradId)].tle1 }}</div>
                    <div v-if="tleData[parseInt(noradId)].tle2" class="break-all">{{ tleData[parseInt(noradId)].tle2 }}</div>
                  </div>
                </div>
              </div>

              <!-- Transmitter Data -->
              <div v-if="data.transmitters && data.transmitters.length > 0">
                <div class="text-sm text-space-300 mb-2">📻 Transmitter Data ({{ data.transmitters.length }} transmitters)</div>
                <div class="space-y-2">
                  <div
                    v-for="(transmitter, index) in data.transmitters"
                    :key="index"
                    class="bg-space-800 border border-space-500 rounded p-2 text-xs"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-semibold text-primary-200">{{ transmitter.description || 'Unknown' }}</span>
                      <span class="text-space-400">{{ transmitter.type }}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-space-300">
                      <div v-if="transmitter.uplink_low">
                        <span class="text-space-400">Uplink:</span> {{ formatFrequency(transmitter.uplink_low) }}
                        <span v-if="transmitter.uplink_high"> - {{ formatFrequency(transmitter.uplink_high) }}</span>
                      </div>
                      <div v-if="transmitter.downlink_low">
                        <span class="text-space-400">Downlink:</span> {{ formatFrequency(transmitter.downlink_low) }}
                        <span v-if="transmitter.downlink_high"> - {{ formatFrequency(transmitter.downlink_high) }}</span>
                      </div>
                      <div v-if="transmitter.mode">
                        <span class="text-space-400">Mode:</span> {{ transmitter.mode }}
                      </div>
                      <div v-if="transmitter.baud">
                        <span class="text-space-400">Baud:</span> {{ transmitter.baud }}
                      </div>
                      <div v-if="transmitter.invert">
                        <span class="text-space-400">Invert:</span> {{ transmitter.invert ? 'Yes' : 'No' }}
                      </div>
                      <div v-if="transmitter.alive !== undefined">
                        <span class="text-space-400">Alive:</span>
                        <span :class="transmitter.alive ? 'text-green-400' : 'text-red-400'">
                          {{ transmitter.alive ? 'Yes' : 'No' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-sm text-space-400 italic">No transmitter data available</div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  combinedData: {
    type: Object,
    required: true
  },
  expandedSatellites: {
    type: Set,
    required: true
  },
  tleData: {
    type: Object,
    required: false,
    default: () => ({})
  },
  formatFrequency: {
    type: Function,
    required: false,
    default: (freq) => freq ? `${freq} Hz` : 'N/A'
  }
})

const emit = defineEmits(['toggle-satellite-data'])

const toggleSatelliteData = (noradId) => {
  emit('toggle-satellite-data', noradId)
}

const isSatelliteExpanded = (noradId) => {
  return props.expandedSatellites.has(noradId)
}

/**
 * Get status text based on satellite status
 * @param {string} status - Satellite status
 * @returns {string} Status text
 */
const getStatusText = (status) => {
  switch (status) {
    case 'alive':
      return 'ACTIVE'
    case 'dead':
      return 'INACTIVE'
    case 'future':
      return 'FUTURE'
    case 're-entered':
      return 'RE-ENTERED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * Get status color based on satellite status
 * @param {string} status - Satellite status
 * @returns {string} Status color class
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'alive':
      return 'text-green-400'
    case 'dead':
      return 'text-red-400'
    case 'future':
      return 'text-yellow-400'
    case 're-entered':
      return 'text-gray-400'
    default:
      return 'text-space-400'
  }
}
</script>
