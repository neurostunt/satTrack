<template>
  <div class="satellite-transponder-info">
    <!-- Satellite Header -->
    <div v-if="satelliteData" class="satellite-header mb-4">
      <h3 class="text-lg font-semibold text-primary-400 mb-2">
        📡 {{ satelliteData.name || 'Unknown Satellite' }}
      </h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-space-300">NORAD ID:</span>
          <span class="text-primary-400 font-mono">{{ satelliteData.norad_cat_id || 'N/A' }}</span>
        </div>
        <div>
          <span class="text-space-300">SatNOGS ID:</span>
          <span class="text-primary-400 font-mono">{{ satelliteData.id || 'N/A' }}</span>
        </div>
        <div v-if="satelliteData.launched">
          <span class="text-space-300">Launched:</span>
          <span class="text-space-400">{{ formatDate(satelliteData.launched) }}</span>
        </div>
        <div v-if="satelliteData.status">
          <span class="text-space-300">Status:</span>
          <span :class="getStatusColor(satelliteData.status)">
            {{ satelliteData.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- Transponder Data -->
    <div v-if="transponderFrequencies" class="transponder-data">
      <h4 class="text-md font-semibold text-primary-400 mb-3">🎛️ Transponder Frequencies</h4>

      <!-- Uplinks -->
      <div v-if="transponderFrequencies.uplinks.length > 0" class="frequency-section mb-4">
        <h5 class="text-sm font-medium text-green-400 mb-2">📤 Uplinks</h5>
        <div class="space-y-2">
          <div
            v-for="uplink in transponderFrequencies.uplinks"
            :key="uplink.id"
            class="frequency-item bg-space-800 border border-space-700 rounded p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-primary-400 font-mono text-sm">
                  {{ formatFrequency(uplink.frequency) }}
                </div>
                <div class="text-xs text-space-400">
                  {{ uplink.description }} | {{ uplink.mode }}
                </div>
              </div>
              <div class="text-right text-xs">
                <div :class="getStatusColor(uplink.status)">
                  {{ uplink.status }}
                </div>
                <div v-if="uplink.baud" class="text-space-500">
                  {{ uplink.baud }} baud
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Downlinks -->
      <div v-if="transponderFrequencies.downlinks.length > 0" class="frequency-section mb-4">
        <h5 class="text-sm font-medium text-blue-400 mb-2">📥 Downlinks</h5>
        <div class="space-y-2">
          <div
            v-for="downlink in transponderFrequencies.downlinks"
            :key="downlink.id"
            class="frequency-item bg-space-800 border border-space-700 rounded p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-primary-400 font-mono text-sm">
                  {{ formatFrequency(downlink.frequency) }}
                </div>
                <div class="text-xs text-space-400">
                  {{ downlink.description }} | {{ downlink.mode }}
                </div>
              </div>
              <div class="text-right text-xs">
                <div :class="getStatusColor(downlink.status)">
                  {{ downlink.status }}
                </div>
                <div v-if="downlink.baud" class="text-space-500">
                  {{ downlink.baud }} baud
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Beacons -->
      <div v-if="transponderFrequencies.beacons.length > 0" class="frequency-section mb-4">
        <h5 class="text-sm font-medium text-yellow-400 mb-2">📡 Beacons</h5>
        <div class="space-y-2">
          <div
            v-for="beacon in transponderFrequencies.beacons"
            :key="beacon.id"
            class="frequency-item bg-space-800 border border-space-700 rounded p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-primary-400 font-mono text-sm">
                  {{ formatFrequency(beacon.frequency) }}
                </div>
                <div class="text-xs text-space-400">
                  {{ beacon.description }} | {{ beacon.mode }}
                </div>
              </div>
              <div class="text-right text-xs">
                <div :class="getStatusColor(beacon.status)">
                  {{ beacon.status }}
                </div>
                <div v-if="beacon.baud" class="text-space-500">
                  {{ beacon.baud }} baud
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Telemetry -->
      <div v-if="transponderFrequencies.telemetry.length > 0" class="frequency-section mb-4">
        <h5 class="text-sm font-medium text-purple-400 mb-2">📊 Telemetry</h5>
        <div class="space-y-2">
          <div
            v-for="telemetry in transponderFrequencies.telemetry"
            :key="telemetry.id"
            class="frequency-item bg-space-800 border border-space-700 rounded p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-primary-400 font-mono text-sm">
                  {{ formatFrequency(telemetry.frequency) }}
                </div>
                <div class="text-xs text-space-400">
                  {{ telemetry.description }} | {{ telemetry.mode }}
                </div>
              </div>
              <div class="text-right text-xs">
                <div :class="getStatusColor(telemetry.status)">
                  {{ telemetry.status }}
                </div>
                <div v-if="telemetry.baud" class="text-space-500">
                  {{ telemetry.baud }} baud
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Transponders -->
      <div v-if="!hasTransponders" class="text-center text-space-400 py-4">
        <div class="text-2xl mb-2">📡</div>
        <div>No transponder data available</div>
        <div class="text-xs text-space-500 mt-1">
          This satellite may not have active transponders or data may not be available
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-4">
      <div class="text-space-400">Loading transponder data...</div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="text-center py-4">
      <div class="text-red-400">Error: {{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { useSatnogsData } from '~/composables/useSatnogsData.js'

const props = defineProps({
  satelliteData: {
    type: Object,
    default: null
  },
  transmitters: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const { getTransponderFrequencies, formatFrequency } = useSatnogsData()

// Compute transponder frequencies
const transponderFrequencies = computed(() => {
  if (!props.transmitters || props.transmitters.length === 0) {
    return null
  }
  return getTransponderFrequencies(props.transmitters)
})

// Check if satellite has transponders
const hasTransponders = computed(() => {
  if (!transponderFrequencies.value) return false

  return transponderFrequencies.value.uplinks.length > 0 ||
         transponderFrequencies.value.downlinks.length > 0 ||
         transponderFrequencies.value.beacons.length > 0 ||
         transponderFrequencies.value.telemetry.length > 0
})

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return dateString
  }
}

// Get status color
const getStatusColor = (status) => {
  if (!status) return 'text-space-400'

  const statusLower = status.toLowerCase()
  if (statusLower.includes('active') || statusLower.includes('operational')) {
    return 'text-green-400'
  } else if (statusLower.includes('inactive') || statusLower.includes('off')) {
    return 'text-red-400'
  } else if (statusLower.includes('unknown')) {
    return 'text-yellow-400'
  }
  return 'text-space-400'
}
</script>

<style scoped>
.frequency-item {
  transition: all 0.2s ease;
}

.frequency-item:hover {
  border-color: var(--primary-500);
  background-color: var(--space-750);
}

.frequency-section h5 {
  border-bottom: 1px solid var(--space-700);
  padding-bottom: 0.5rem;
}
</style>
