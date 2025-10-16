<template>
  <div class="card mb-6">
    <h4 class="text-sm font-semibold text-space-300 mb-1">Observation Location:</h4>
    <div class="text-space-400 text-sm">
      {{ latitude }}°N, {{ longitude }}°E <span class="text-space-500">Grid Square: {{ gridSquare }}</span>
    </div>
  </div>
</template>

<script setup>
// Props for location data
defineProps({
  latitude: {
    type: Number,
    default: 44.958341
  },
  longitude: {
    type: Number,
    default: 20.416665
  },
  gridSquare: {
    type: String,
    default: 'KN04FXQL'
  }
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
