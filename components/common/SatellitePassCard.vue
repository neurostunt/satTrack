<template>
  <div class="card">
    <!-- Pass Header -->
    <div class="flex items-center justify-between mb-3">
      <div>
        <div class="text-sm font-semibold text-primary-300">{{ pass.name }} <span class="text-xs text-space-400">NORAD: {{ pass.noradId }}</span></div>
        <div v-if="pass.status && pass.status !== 'alive'" :class="getStatusColor(pass.status)" class="text-xs font-medium">{{ getStatusText(pass.status) }}</div>
      </div>
      <div class="text-right">
        <div class="text-xs text-space-400">{{ pass.countdown }}</div>
        <div class="text-xs text-space-500">{{ pass.date }}</div>
      </div>
    </div>

    <!-- Pass Summary -->
    <div class="flex items-center justify-between text-xs text-space-400 mb-3">
      <div class="flex space-x-4">
        <span>Duration: {{ pass.duration }}</span>
        <span>Peak: {{ pass.peak }}</span>
        <span>Elevation: {{ pass.elevation }}</span>
      </div>
      <div class="text-space-500">{{ pass.statusText }}</div>
    </div>

    <!-- Pass Details (Collapsible) -->
    <div v-if="expandedPasses.has(pass.id)" class="mt-3 pt-3 border-t border-space-700">
      <!-- Pass Timing -->
      <div class="mb-3">
        <div class="text-sm text-space-300 mb-2">🕐 Pass Timing</div>
        <div class="card p-2 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-space-400">Start:</span> {{ pass.startTime }}</div>
            <div><span class="text-space-400">End:</span> {{ pass.endTime }}</div>
            <div><span class="text-space-400">Peak:</span> {{ pass.peakTime }}</div>
            <div><span class="text-space-400">Duration:</span> {{ pass.duration }}</div>
          </div>
        </div>
      </div>

      <!-- Pass Details -->
      <div class="mb-3">
        <div class="text-sm text-space-300 mb-2">📊 Pass Details</div>
        <div class="card p-2 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-space-400">Max Elevation:</span> {{ pass.maxElevation }}°</div>
            <div><span class="text-space-400">Azimuth:</span> {{ pass.azimuth }}°</div>
            <div><span class="text-space-400">Orbit:</span> {{ pass.orbit }}</div>
            <div><span class="text-space-400">Period:</span> {{ pass.period }}</div>
          </div>
        </div>
      </div>

      <!-- Transmitter Info -->
      <div v-if="pass.transmitters && pass.transmitters.length > 0">
        <div class="text-sm text-space-300 mb-2">📡 Transmitters</div>
        <div class="space-y-2">
          <div v-for="transmitter in pass.transmitters" :key="transmitter.id" class="card p-2 text-xs">
            <div class="flex items-center justify-between mb-1">
              <div class="font-medium text-space-200">{{ transmitter.description }}</div>
              <div class="text-space-400">{{ transmitter.frequency }}</div>
            </div>
            <div class="text-space-500">{{ transmitter.mode }} • {{ transmitter.power }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expand/Collapse Button -->
    <div class="flex justify-center mt-3">
      <button
        @click="togglePass(pass.id)"
        class="text-space-400 hover:text-space-200 transition-colors"
      >
        <div class="transform transition-transform duration-300" :class="{ 'rotate-180': expandedPasses.has(pass.id) }">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Props
defineProps({
  pass: {
    type: Object,
    required: true
  }
})

// Reactive state
const expandedPasses = ref(new Set())

// Functions
const togglePass = (passId) => {
  if (expandedPasses.value.has(passId)) {
    expandedPasses.value.delete(passId)
  } else {
    expandedPasses.value.add(passId)
  }
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
</script>

<style scoped>
/* Custom styles if needed */
</style>
