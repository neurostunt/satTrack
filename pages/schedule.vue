<template>
  <div class="min-h-screen bg-space-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Satellite Pass Schedule</h1>
        <p class="text-space-400">
          Track upcoming satellite passes for your location
        </p>
      </div>

      <!-- Pass Schedule Component -->
      <SatellitePassSchedule />
    </div>
  </div>
</template>

<script setup>
import SatellitePassSchedule from '~/components/satellite/SatellitePassSchedule.vue'

// Set page meta
useHead({
  title: 'Satellite Pass Schedule - SatTrack',
  meta: [
    { name: 'description', content: 'View upcoming satellite passes for your location with countdown timers' }
  ]
})
</script>
