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
      <Compass ref="compassRef" />
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

        <!-- Status - Enhanced -->
        <ClientOnly>
          <div class="max-w-lg mx-auto mt-6">
            <div class="text-center text-xs text-space-400 space-y-1">
              <div v-if="!locationPermission" class="text-orange-400 mb-1">
                ⚠️ Location permission required
              </div>
              <div v-if="!orientationPermission" class="text-orange-400 mb-1">
                ⚠️ Device orientation permission required
              </div>
              <div v-if="locationPermission && userLocation.accuracy > 0" class="text-blue-400">
                📍 Location accuracy: ±{{ Math.round(userLocation.accuracy) }}m
              </div>
              <div v-if="locationPermission && userLocation.altitudeAccuracy > 0" class="text-blue-400">
                🏔️ Altitude accuracy: ±{{ Math.round(userLocation.altitudeAccuracy) }}m
              </div>
              <div v-if="tleLoading" class="text-blue-400">
                📡 Fetching TLE data...
              </div>
              <div v-if="!hasTLEData(settings.trackedSatellites.find(s => s.name === selectedSatellite)?.noradId)" class="text-orange-400">
                ⚠️ No TLE data for {{ selectedSatellite }}
              </div>
              <div v-if="locationPermission && orientationPermission && hasTLEData(settings.trackedSatellites.find(s => s.name === selectedSatellite)?.noradId)" class="text-green-400">
                ✅ Ready for tracking with real TLE data!
              </div>
              <div v-if="!settings.spaceTrackUsername || !settings.spaceTrackPassword" class="text-yellow-400">
                ⚠️ Please configure Space-Track.org credentials in settings
              </div>
            </div>
          </div>
          <template #fallback>
            <div class="max-w-lg mx-auto mt-6">
              <div class="text-center text-xs text-space-400">
                <div class="text-blue-400">🔄 Loading sensors...</div>
              </div>
            </div>
          </template>
        </ClientOnly>
  </div>
</template>

<script setup>
import { useTLEData } from '~/composables/useTLEData.js'
import { useSatelliteCalculations } from '~/composables/useSatelliteCalculations.js'

// Composables
const { 
  tleData, 
  isLoading: tleLoading, 
  fetchTLEData, 
  getTLEData, 
  hasTLEData,
  getDataFreshness 
} = useTLEData()

const { 
  calculateSatellitePosition, 
  calculateNextPass,
  getVisibilityStatus 
} = useSatelliteCalculations()

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
    { noradId: 43017, name: 'NOAA-15' },
    { noradId: 43770, name: 'NOAA-18' },
    { noradId: 43803, name: 'NOAA-19' },
    { noradId: 39444, name: 'NOAA-20' },
    { noradId: 40967, name: 'NOAA-21' },
    { noradId: 27607, name: 'NOAA-22' },
    { noradId: 24278, name: 'NOAA-23' },
    { noradId: 61781, name: 'NOAA-24' }
  ],
  updateInterval: 5000,
  distanceUnits: 'km',
  spaceTrackUsername: '',
  spaceTrackPassword: ''
})

// User location with precision
const userLocation = ref({
  latitude: 0,
  longitude: 0,
  altitude: 0,
  accuracy: 0,
  altitudeAccuracy: 0,
  heading: 0,
  speed: 0
})

// Compass reference
const compassRef = ref(null)

// Device orientation data
const deviceOrientation = ref({
  alpha: 0, // not used for compass (GPS heading used instead)
  beta: 0,  // front-to-back tilt
  gamma: 0  // left-to-right tilt
})

// Permissions
const locationPermission = ref(false)
const orientationPermission = ref(false)

// Handle device orientation (for tilt only, not compass)
const handleOrientation = (event) => {
  deviceOrientation.value = {
    alpha: event.alpha || 0,
    beta: event.beta || 0,
    gamma: event.gamma || 0
  }
  
  // Use GPS heading for azimuth, device tilt for elevation
  const currentHeading = userLocation.value.heading || 0
  azimuthDelta.value = Math.round(satelliteAzimuth.value - currentHeading)
  elevationDelta.value = Math.round(satelliteElevation.value - deviceOrientation.value.beta)
}

// Handle geolocation with enhanced data
const handleLocation = (position) => {
  userLocation.value = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    altitude: position.coords.altitude || 0,
    accuracy: position.coords.accuracy || 0,
    altitudeAccuracy: position.coords.altitudeAccuracy || 0,
    heading: position.coords.heading || 0,
    speed: position.coords.speed || 0
  }
  
  console.log('Location updated:', userLocation.value)
  
  // Update compass with GPS heading
  if (compassRef.value && userLocation.value.heading !== null) {
    compassRef.value.updateGPSHeading(userLocation.value.heading)
  }
  
  // Calculate satellite position with real location
  calculateCurrentSatellitePosition()
}

// Calculate satellite position using real TLE data
const calculateCurrentSatellitePosition = async () => {
  if (!userLocation.value.latitude || !userLocation.value.longitude) {
    console.warn('No user location available for satellite calculation')
    return
  }

  // Find selected satellite
  const selectedSat = settings.value.trackedSatellites.find(sat => sat.name === selectedSatellite.value)
  if (!selectedSat) {
    console.warn('Selected satellite not found')
    return
  }

  // Check if we have TLE data for this satellite
  if (!hasTLEData(selectedSat.noradId)) {
    console.warn(`No TLE data available for ${selectedSat.name} (${selectedSat.noradId})`)
    
    // Try to fetch TLE data if credentials are available
    if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
      try {
        await fetchTLEData([selectedSat], settings.value.spaceTrackUsername, settings.value.spaceTrackPassword)
      } catch (error) {
        console.error('Failed to fetch TLE data:', error)
      }
    }
    return
  }

  try {
    const tleData = getTLEData(selectedSat.noradId)
    const observerLocation = {
      latitude: userLocation.value.latitude,
      longitude: userLocation.value.longitude,
      altitude: userLocation.value.altitude
    }

    // Calculate satellite position
    const position = calculateSatellitePosition(tleData, observerLocation)
    
    if (position) {
      satelliteAzimuth.value = position.azimuth
      satelliteElevation.value = position.elevation
      satelliteRange.value = settings.value.distanceUnits === 'miles' ? position.rangeMiles : position.rangeKm
      
      // Calculate deltas using GPS heading for azimuth
      const currentHeading = userLocation.value.heading || 0
      azimuthDelta.value = Math.round(satelliteAzimuth.value - currentHeading)
      elevationDelta.value = Math.round(satelliteElevation.value - deviceOrientation.value.beta)
      
      // Calculate next pass
      const nextPass = calculateNextPass(tleData, observerLocation)
      if (nextPass) {
        const passTime = new Date(nextPass.startTime)
        nextPassTime.value = passTime.toUTCString().substring(17, 22) + ' UTC'
      } else {
        nextPassTime.value = 'No pass found'
      }
      
      console.log('Satellite position calculated:', position)
    } else {
      console.warn('Failed to calculate satellite position')
    }
  } catch (error) {
    console.error('Satellite calculation error:', error)
  }
}

// Request permissions with enhanced options
const requestPermissions = async () => {
  // Request geolocation with high accuracy
  if (navigator.geolocation) {
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationPermission.value = true
        handleLocation(position)
        
        // Start watching position for continuous updates
        navigator.geolocation.watchPosition(
          handleLocation,
          (error) => console.error('Watch position error:', error),
          options
        )
      },
      (error) => {
        console.error('Geolocation error:', error)
        locationPermission.value = false
        
        // Show specific error messages
        switch(error.code) {
          case error.PERMISSION_DENIED:
            console.error('Location access denied by user')
            break
          case error.POSITION_UNAVAILABLE:
            console.error('Location information unavailable')
            break
          case error.TIMEOUT:
            console.error('Location request timed out')
            break
        }
      },
      options
    )
  }
  
  // Request device orientation with enhanced permissions
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEvent.requestPermission()
      if (response === 'granted') {
        orientationPermission.value = true
        window.addEventListener('deviceorientation', handleOrientation)
        console.log('Device orientation permission granted')
      } else {
        console.error('Device orientation permission denied')
        orientationPermission.value = false
      }
    } catch (error) {
      console.error('Orientation permission error:', error)
      orientationPermission.value = false
    }
  } else {
    // For browsers that don't require permission
    orientationPermission.value = true
    window.addEventListener('deviceorientation', handleOrientation)
    console.log('Device orientation available without permission')
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
  calculateCurrentSatellitePosition()
})

onMounted(async () => {
  loadSettings()
  requestPermissions()
  
      // Load TLE data (requires credentials)
      if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
        try {
          await fetchTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword)
        } catch (error) {
          console.error('TLE data load failed:', error.message)
        }
      } else {
        console.log('No Space-Track.org credentials provided. Please configure in settings.')
      }
  
  // Update satellite position every 5 seconds
  setInterval(calculateCurrentSatellitePosition, 5000)
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