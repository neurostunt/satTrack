<template>
  <div class="min-h-screen space-gradient p-4">
    <!-- Header - Smaller -->
    <header class="text-center mb-6">
      <div class="flex items-center justify-between mb-1">
        <div class="w-8"></div> <!-- Spacer -->
        <h1 class="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          🛰️ SatTrack
        </h1>
        <button 
          @click="goToSettings"
          class="w-8 h-8 flex items-center justify-center text-primary-400 hover:text-primary-300 transition-colors bg-space-800 hover:bg-space-700 rounded-lg"
        >
          ⚙️
        </button>
      </div>
      <p class="text-space-300 text-sm">Handheld Yagi Antenna Tracker</p>
    </header>

    <!-- Satellite Selection - Compact -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <label class="block text-xs font-medium text-space-300 mb-1">
          Satellite
        </label>
        <select 
          v-model="selectedSatellite" 
          class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
        >
          <option 
            v-for="satellite in settings.trackedSatellites" 
            :key="satellite.noradId"
            :value="satellite.name"
          >
            {{ satellite.name }} ({{ satellite.noradId }})
          </option>
        </select>
      </div>
    </div>

    <!-- Compass - Larger -->
    <div class="max-w-sm mx-auto mb-6">
      <Compass />
    </div>

    <!-- Satellite Information - Compact -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="text-xs text-space-300 mb-1">Azimuth</div>
            <div class="text-lg font-mono text-primary-400">
              {{ satelliteAzimuth }}°
            </div>
            <div class="text-xs text-space-400">
              → {{ azimuthDelta }}°
            </div>
          </div>
          <div>
            <div class="text-xs text-space-300 mb-1">Elevation</div>
            <div class="text-lg font-mono text-primary-400">
              {{ satelliteElevation }}°
            </div>
            <div class="text-xs text-space-400">
              ↑ {{ elevationDelta }}°
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Elevation Meter - Larger -->
    <div class="max-w-lg mx-auto mb-6">
      <ElevationMeter />
    </div>

    <!-- Range and Next Pass - Compact -->
    <div class="max-w-lg mx-auto">
      <div class="card p-4">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="text-xs text-space-300 mb-1">Range</div>
            <div class="text-sm font-mono text-primary-400">{{ satelliteRange }} km</div>
          </div>
          <div>
            <div class="text-xs text-space-300 mb-1">Next Pass</div>
            <div class="text-sm font-mono text-primary-400">{{ nextPassTime }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status - Smaller -->
    <div class="max-w-lg mx-auto mt-6">
      <div class="text-center text-xs text-space-400">
        <div v-if="!locationPermission" class="text-orange-400 mb-1">
          ⚠️ Location permission required
        </div>
        <div v-if="!orientationPermission" class="text-orange-400 mb-1">
          ⚠️ Device orientation permission required
        </div>
        <div v-if="locationPermission && orientationPermission" class="text-green-400">
          ✅ Ready for tracking!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Remove satellite.js import for now - we'll use mock data
// import { satellite } from 'satellite.js'

// Reactive data
const selectedSatellite = ref('ISS')
const satelliteAzimuth = ref(0)
const satelliteElevation = ref(0)
const azimuthDelta = ref(0)
const elevationDelta = ref(0)
const satelliteRange = ref(0)
const nextPassTime = ref('Calculating...')

// Settings - Load from localStorage
const settings = ref({
  trackedSatellites: [
    { noradId: 25544, name: 'ISS' },
    { noradId: 28654, name: 'NOAA-18' },
    { noradId: 33591, name: 'NOAA-19' }
  ],
  updateInterval: 5000
})

// Permissions
const locationPermission = ref(false)
const orientationPermission = ref(false)

// Device orientation data
const deviceOrientation = ref({
  alpha: 0, // compass direction
  beta: 0,  // front-to-back tilt
  gamma: 0  // left-to-right tilt
})

// User location
const userLocation = ref({
  latitude: 0,
  longitude: 0,
  altitude: 0
})

// Handle device orientation
const handleOrientation = (event) => {
  deviceOrientation.value = {
    alpha: event.alpha || 0,
    beta: event.beta || 0,
    gamma: event.gamma || 0
  }
  
  // Calculate deltas
  azimuthDelta.value = Math.round(satelliteAzimuth.value - deviceOrientation.value.alpha)
  elevationDelta.value = Math.round(satelliteElevation.value - deviceOrientation.value.beta)
}

// Handle geolocation
const handleLocation = (position) => {
  userLocation.value = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    altitude: position.coords.altitude || 0
  }
  
  // Calculate satellite position
  calculateSatellitePosition()
}

// Calculate satellite position (simplified for demo)
const calculateSatellitePosition = () => {
  // This is a simplified calculation - in real implementation,
  // you would use TLE data and satellite.js for accurate calculations
  
  // Mock data for demonstration
  satelliteAzimuth.value = Math.round(Math.random() * 360)
  satelliteElevation.value = Math.round(Math.random() * 90)
  satelliteRange.value = Math.round(400 + Math.random() * 500)
  
  // Calculate deltas
  azimuthDelta.value = Math.round(satelliteAzimuth.value - deviceOrientation.value.alpha)
  elevationDelta.value = Math.round(satelliteElevation.value - deviceOrientation.value.beta)
  
  // Mock next pass time
  const now = new Date()
  const nextPass = new Date(now.getTime() + Math.random() * 3600000) // Random time within next hour
  nextPassTime.value = nextPass.toUTCString().substring(17, 22) + ' UTC'
}

// Request permissions
const requestPermissions = async () => {
  // Request geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationPermission.value = true
        handleLocation(position)
      },
      (error) => {
        console.error('Geolocation error:', error)
        locationPermission.value = false
      }
    )
  }
  
  // Request device orientation
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEvent.requestPermission()
      if (response === 'granted') {
        orientationPermission.value = true
        window.addEventListener('deviceorientation', handleOrientation)
      }
    } catch (error) {
      console.error('Orientation permission error:', error)
    }
  } else {
    // For browsers that don't require permission
    orientationPermission.value = true
    window.addEventListener('deviceorientation', handleOrientation)
  }
}

// Load settings from localStorage
const loadSettings = () => {
  const savedSettings = localStorage.getItem('sattrack-settings')
  if (savedSettings) {
    const parsed = JSON.parse(savedSettings)
    settings.value = { ...settings.value, ...parsed }
  }
}

// Navigation
const goToSettings = () => {
  navigateTo('/settings')
}

// Watch for satellite changes
watch(selectedSatellite, () => {
  calculateSatellitePosition()
})

onMounted(() => {
  loadSettings()
  requestPermissions()
  
  // Update satellite position every 5 seconds
  setInterval(calculateSatellitePosition, 5000)
})

onUnmounted(() => {
  window.removeEventListener('deviceorientation', handleOrientation)
})

// SEO
useHead({
  title: 'SatTrack - Handheld Yagi Antenna Tracker',
  meta: [
    { name: 'description', content: 'Track satellites with your handheld Yagi antenna using this PWA application' }
  ]
})
</script>

<style scoped>
/* Additional styles if needed */
</style>