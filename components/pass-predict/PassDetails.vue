<template>
  <!-- Pass Details -->
  <div class="mb-3">
    <div class="text-sm text-space-300 mb-2">🛰️ Pass Details</div>
    <div class="bg-space-800 border border-space-500 rounded p-2 text-xs space-y-2">
      <div class="flex justify-between">
        <span class="text-space-400">Start Time:</span>
        <span class="text-space-200">{{ formatPassTime(pass.startTime) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-space-400">End Time:</span>
        <span class="text-space-200">{{ formatPassTime(pass.endTime) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-space-400">Duration:</span>
        <span class="text-space-200">{{ formatPassDuration(pass.duration) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-space-400">Max Elevation:</span>
        <span class="text-green-400 font-medium">{{ Math.round(pass.maxElevation) }}°</span>
      </div>
      <div class="flex justify-between">
        <span class="text-space-400">Start Azimuth:</span>
        <span class="text-space-200">{{ Math.round(pass.startAzimuth) }}°</span>
      </div>
      <div class="flex justify-between">
        <span class="text-space-400">End Azimuth:</span>
        <span class="text-space-200">{{ Math.round(pass.endAzimuth) }}°</span>
      </div>
      <div class="flex justify-between">
        <span class="text-space-400">Time Until Pass:</span>
        <span class="text-primary-400 font-medium">{{ formatTimeUntilPass(pass.startTime, pass.endTime, pass.noradId) }}</span>
      </div>
    </div>
  </div>

  <!-- Orbital Parameters Box -->
  <div v-if="getTLEData(pass.noradId)" class="mb-3">
    <div class="text-sm text-space-300 mb-2">🛰️ Orbital Parameters (TLE)</div>
    <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
      <div class="text-xs text-space-400 space-y-1 font-mono">
        <div v-if="getTLEData(pass.noradId).line1" class="break-all">{{ getTLEData(pass.noradId).line1 }}</div>
        <div v-if="getTLEData(pass.noradId).line2" class="break-all">{{ getTLEData(pass.noradId).line2 }}</div>
      </div>
    </div>
  </div>

  <!-- Satellite Status -->
  <div v-if="getSatelliteData(pass.noradId)?.satellite?.status" class="mb-3">
    <div class="text-sm text-space-300 mb-2">📊 Satellite Status</div>
    <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
      <div class="flex items-center gap-2">
        <span :class="getStatusColor(getSatelliteData(pass.noradId).satellite.status)" class="font-medium">
          {{ getStatusText(getSatelliteData(pass.noradId).satellite.status) }}
        </span>
        <span class="text-space-400">
          {{ getSatelliteData(pass.noradId).satellite.names || 'No additional names' }}
        </span>
      </div>
    </div>
  </div>

  <!-- Transmitter Count -->
  <div v-if="pass.transmitterCount > 0" class="mb-3">
    <div class="text-sm text-space-300 mb-2">📡 Available Transmitters</div>
    <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
      <div class="text-space-200">
        {{ pass.transmitterCount }} transmitter{{ pass.transmitterCount !== 1 ? 's' : '' }} available
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pass: {
    type: Object,
    required: true
  },
  getTLEData: {
    type: Function,
    required: true
  },
  getSatelliteData: {
    type: Function,
    required: true
  },
  formatPassTime: {
    type: Function,
    required: true
  },
  formatPassDuration: {
    type: Function,
    required: true
  },
  formatTimeUntilPass: {
    type: Function,
    required: true
  },
  getPassStatus: {
    type: Function,
    required: true
  }
})

// Helper functions for status display
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'alive':
    case 'active':
      return 'text-green-400'
    case 'dead':
    case 'inactive':
      return 'text-red-400'
    case 'decayed':
      return 'text-orange-400'
    default:
      return 'text-space-300'
  }
}

const getStatusText = (status) => {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}
</script>
