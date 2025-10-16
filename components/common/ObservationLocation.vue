<template>
  <div class="card mb-6">
    <h4 class="text-sm font-semibold text-space-300 mb-1">Observation Location:</h4>
    <div class="text-space-400 text-sm">
      {{ latitude }}°N, {{ longitude }}°E
      <span v-if="gridSquare" class="text-space-500">Grid Square: {{ gridSquare }}</span>
    </div>
    <div v-if="altitude !== undefined && altitude !== 0" class="text-space-500 text-xs mt-1">
      Altitude: {{ altitude }}m
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
