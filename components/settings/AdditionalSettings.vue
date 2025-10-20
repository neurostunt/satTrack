<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">Tracking Settings</h3>

      <div class="space-y-4">
        <!-- Observer Location -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">Observer Location</h4>

          <!-- GPS Location Button -->
          <div class="mb-3">
            <button
              @click="getLocationFromGPS"
              :disabled="isGettingLocation"
              class="w-full bg-green-600 hover:bg-green-700 disabled:bg-space-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg v-if="isGettingLocation" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span>{{ isGettingLocation ? 'Getting Location...' : 'Get Location from GPS' }}</span>
            </button>
            <div v-if="locationError" class="text-red-400 text-xs mt-1">
              {{ locationError }}
            </div>
            <div v-if="locationSuccess" class="text-green-400 text-xs mt-1">
              {{ locationSuccess }}
            </div>
          </div>

          <!-- Manual Location Inputs -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">Latitude</label>
              <input
                v-model.number="settings.observationLocation.latitude"
                type="number"
                step="0.000001"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none"
                placeholder="44.958341"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">Longitude</label>
              <input
                v-model.number="settings.observationLocation.longitude"
                type="number"
                step="0.000001"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none"
                placeholder="20.416665"
              />
            </div>
          </div>
          <div class="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">Altitude (meters)</label>
              <input
                v-model.number="settings.observationLocation.altitude"
                type="number"
                step="1"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div class="flex items-end">
              <button
                @click="getAltitudeFromCoordinates"
                :disabled="isFetchingAltitude || !settings.observationLocation?.latitude || !settings.observationLocation?.longitude"
                class="bg-blue-600 hover:bg-blue-700 disabled:bg-space-600 disabled:cursor-not-allowed text-white text-xs font-medium py-1 px-3 rounded transition-colors duration-200 flex items-center gap-1 whitespace-nowrap h-[26px]"
                title="Fetch altitude from coordinates"
              >
                <svg v-if="isFetchingAltitude" class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                </svg>
                <span>{{ isFetchingAltitude ? 'Fetching...' : 'Get Altitude' }}</span>
              </button>
            </div>
          </div>
          <div v-if="altitudeError" class="text-red-400 text-xs mt-1">
            {{ altitudeError }}
          </div>
          <div v-if="altitudeSuccess" class="text-green-400 text-xs mt-1">
            {{ altitudeSuccess }}
          </div>
          <div class="text-xs text-space-500 mt-1">
            Used for accurate pass predictions and elevation calculations
          </div>
        </div>

        <!-- Update Interval -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Update Interval</label>
          <select
            v-model="updateInterval"
            class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="1000">1 second</option>
            <option value="2000">2 seconds</option>
            <option value="5000">5 seconds</option>
            <option value="10000">10 seconds</option>
          </select>
        </div>

        <!-- Units -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Distance Units</label>
          <select
            v-model="distanceUnits"
            class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="km">Kilometers</option>
            <option value="miles">Miles</option>
          </select>
        </div>

        <!-- Compass Type -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Compass Type</label>
          <select
            v-model="compassType"
            class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="magnetic">Magnetic</option>
            <option value="true">True North</option>
          </select>
          <div class="text-xs text-space-500 mt-1">
            Uses GPS heading for maximum accuracy
          </div>
        </div>

        <!-- Auto-update TLE -->
        <div>
          <div class="flex items-center justify-between">
            <label class="text-sm text-space-300">Auto-update pass predictions</label>
            <input
              v-model="autoUpdateTLE"
              type="checkbox"
              class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
            />
          </div>
          <div class="text-xs text-space-500 mt-1">
            Automatically refresh pass predictions every 2 hours
          </div>
        </div>

        <!-- Sound alerts -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Sound alerts</label>
          <input
            v-model="soundAlerts"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- High accuracy mode -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">High accuracy GPS</label>
          <input
            v-model="highAccuracyGPS"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- Magnetometer calibration -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Auto-calibrate compass</label>
          <input
            v-model="autoCalibrateCompass"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- Save Settings Button -->
        <div class="border-t border-space-600 pt-4 mt-4">
          <button
            @click="$emit('save-settings')"
            :disabled="isSavingSettings"
            class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-space-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg v-if="isSavingSettings" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
            </svg>
            {{ isSavingSettings ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  isSavingSettings: {
    type: Boolean,
    default: false
  },
  updateSettings: {
    type: Function,
    required: true
  }
})

// Emits
defineEmits(['save-settings'])

// Reactive state for GPS location
const isGettingLocation = ref(false)
const locationError = ref('')
const locationSuccess = ref('')

// Reactive state for altitude fetching
const isFetchingAltitude = ref(false)
const altitudeError = ref('')
const altitudeSuccess = ref('')

// Computed properties for form fields
const distanceUnits = computed({
  get: () => props.settings.distanceUnits || 'km',
  set: (value) => props.updateSettings({ distanceUnits: value })
})

const compassType = computed({
  get: () => props.settings.compassType || 'magnetic',
  set: (value) => props.updateSettings({ compassType: value })
})

const updateInterval = computed({
  get: () => props.settings.updateInterval || 5000,
  set: (value) => props.updateSettings({ updateInterval: parseInt(value) })
})

const autoUpdateTLE = computed({
  get: () => props.settings.autoUpdateTLE || false,
  set: (value) => props.updateSettings({ autoUpdateTLE: value })
})

const soundAlerts = computed({
  get: () => props.settings.soundAlerts || false,
  set: (value) => props.updateSettings({ soundAlerts: value })
})

const highAccuracyGPS = computed({
  get: () => props.settings.highAccuracyGPS || false,
  set: (value) => props.updateSettings({ highAccuracyGPS: value })
})

const autoCalibrateCompass = computed({
  get: () => props.settings.autoCalibrateCompass || false,
  set: (value) => props.updateSettings({ autoCalibrateCompass: value })
})

// GPS location function
const getLocationFromGPS = async () => {
  if (!navigator.geolocation) {
    locationError.value = 'Geolocation is not supported by this browser'
    return
  }

  isGettingLocation.value = true
  locationError.value = ''
  locationSuccess.value = ''

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })

    const { latitude, longitude, altitude } = position.coords

    // Update settings with GPS coordinates
    props.updateSettings({
      observationLocation: {
        latitude: latitude,
        longitude: longitude,
        altitude: altitude || 0
      }
    })

    locationSuccess.value = `Location updated: ${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E${altitude ? `, ${Math.round(altitude)}m` : ''}`

    // Clear success message after 3 seconds
    setTimeout(() => {
      locationSuccess.value = ''
    }, 3000)

  } catch (error) {
    console.error('GPS location error:', error)

    switch (error.code) {
      case error.PERMISSION_DENIED:
        locationError.value = 'Location access denied. Please allow location access and try again.'
        break
      case error.POSITION_UNAVAILABLE:
        locationError.value = 'Location information unavailable. Please check your GPS settings.'
        break
      case error.TIMEOUT:
        locationError.value = 'Location request timed out. Please try again.'
        break
      default:
        locationError.value = 'An unknown error occurred while retrieving location.'
        break
    }

    // Clear error message after 5 seconds
    setTimeout(() => {
      locationError.value = ''
    }, 5000)
  } finally {
    isGettingLocation.value = false
  }

  // After successfully getting GPS location, also fetch altitude
  if (locationSuccess.value) {
    // Small delay to let the UI update
    setTimeout(() => {
      getAltitudeFromCoordinates()
    }, 500)
  }
}

// Fetch altitude from Open-Elevation API
const getAltitudeFromCoordinates = async () => {
  if (!props.settings.observationLocation?.latitude || !props.settings.observationLocation?.longitude) {
    altitudeError.value = 'Please enter latitude and longitude first'
    setTimeout(() => {
      altitudeError.value = ''
    }, 3000)
    return
  }

  isFetchingAltitude.value = true
  altitudeError.value = ''
  altitudeSuccess.value = ''

  try {
    const lat = props.settings.observationLocation.latitude
    const lng = props.settings.observationLocation.longitude

    console.log(`🏔️ Fetching altitude for coordinates: ${lat}, ${lng}`)

    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }

    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const altitude = Math.round(data.results[0].elevation)

      // Update settings with fetched altitude
      props.updateSettings({
        observationLocation: {
          ...props.settings.observationLocation,
          altitude: altitude
        }
      })

      altitudeSuccess.value = `Altitude updated: ${altitude}m above sea level`
      console.log(`✅ Altitude fetched successfully: ${altitude}m`)

      // Clear success message after 3 seconds
      setTimeout(() => {
        altitudeSuccess.value = ''
      }, 3000)
    } else {
      throw new Error('No elevation data found for these coordinates')
    }

  } catch (error) {
    console.error('Altitude fetch error:', error)
    altitudeError.value = error.message || 'Failed to fetch altitude. Please try again or enter manually.'

    // Clear error message after 5 seconds
    setTimeout(() => {
      altitudeError.value = ''
    }, 5000)
  } finally {
    isFetchingAltitude.value = false
  }
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
