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
          <div class="mt-1">
            <label class="block text-xs font-medium text-space-300 mb-1">Altitude (meters)</label>
            <input
              v-model.number="settings.observationLocation.altitude"
              type="number"
              step="1"
              class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div class="text-xs text-space-500 mt-1">
            Used for accurate pass predictions and elevation calculations
          </div>
        </div>

        <!-- Update Interval -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Update Interval</label>
          <select
            v-model="settings.updateInterval"
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
            v-model="settings.distanceUnits"
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
            v-model="settings.compassType"
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
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Auto-update TLE data</label>
          <input
            v-model="settings.autoUpdateTLE"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- Sound alerts -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Sound alerts</label>
          <input
            v-model="settings.soundAlerts"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- High accuracy mode -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">High accuracy GPS</label>
          <input
            v-model="settings.highAccuracyGPS"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- Magnetometer calibration -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Auto-calibrate compass</label>
          <input
            v-model="settings.autoCalibrateCompass"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
          />
        </div>

        <!-- Transmitter Filters -->
        <div class="border-t border-space-600 pt-4 mt-4">
          <h4 class="text-sm font-semibold text-primary-400 mb-3">📡 Transmitter Filters</h4>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.amateur"
                @change="updateTransmitterFilter('amateur', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Amateur Radio</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.fm"
                @change="updateTransmitterFilter('fm', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">FM</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.cw"
                @change="updateTransmitterFilter('cw', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">CW</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.aprs"
                @change="updateTransmitterFilter('aprs', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">APRS</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.sstv"
                @change="updateTransmitterFilter('sstv', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">SSTV</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.telemetry"
                @change="updateTransmitterFilter('telemetry', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Telemetry</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.voice"
                @change="updateTransmitterFilter('voice', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Voice</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.repeater"
                @change="updateTransmitterFilter('repeater', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Repeater</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.beacon"
                @change="updateTransmitterFilter('beacon', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Beacon</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.weather"
                @change="updateTransmitterFilter('weather', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Weather</label>
            </div>
            <div class="flex items-center">
              <input
                :checked="settings.transmitterFilters.communication"
                @change="updateTransmitterFilter('communication', $event.target.checked)"
                type="checkbox"
                class="w-3 h-3 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-1 mr-2"
              />
              <label class="text-space-300">Communication</label>
            </div>
          </div>
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
import { ref } from 'vue'

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
}

// Helper function to update transmitter filter
const updateTransmitterFilter = (filterName, checked) => {
  props.updateSettings({
    transmitterFilters: {
      ...props.settings.transmitterFilters,
      [filterName]: checked
    }
  })
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
