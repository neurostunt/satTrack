<template>
  <div class="card mb-6">
    <div class="flex items-center gap-2 mb-2">
      <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <h4 class="text-base font-bold text-primary-400 bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent">
        Observation Location
      </h4>
    </div>
    <div class="text-space-300 text-sm font-medium">
      {{ latitude.toFixed(6) }}°N, {{ longitude.toFixed(6) }}°E
      <span v-if="gridSquare" class="text-primary-400 ml-2 font-semibold">{{ gridSquare }}</span>
    </div>
    <div v-if="altitude !== undefined && altitude !== 0" class="text-space-400 text-xs mt-1">
      📏 Altitude: {{ altitude }}m ASL
    </div>
  </div>
</template>

<script setup>
// Props for location data
defineProps({
  latitude: {
    type: Number,
    default: 0
  },
  longitude: {
    type: Number,
    default: 0
  },
  altitude: {
    type: Number,
    default: 0
  },
  gridSquare: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
