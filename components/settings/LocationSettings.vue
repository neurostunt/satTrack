<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">Location Settings</h3>

      <div class="space-y-4">
        <!-- High accuracy mode -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">High accuracy GPS</label>
          <input
            :checked="settings.highAccuracyMode"
            @change="$emit('update:settings', { ...settings, highAccuracyMode: $event.target.checked })"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-2"
          />
        </div>

        <!-- Update Location Button -->
        <div class="border-t border-space-700 pt-4">
          <div class="mb-3">
            <button
              @click="updateLocation"
              :disabled="isUpdatingLocation"
              class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-space-600 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg v-if="!isUpdatingLocation" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isUpdatingLocation ? 'Detecting Location...' : 'Update Location (GPS → Grid Square)' }}
            </button>
            <div class="mt-1 text-xs text-space-400 text-center">
              Uses GPS once to detect location, then converts to grid square and disables GPS
            </div>
          </div>
        </div>

        <!-- Grid Square Settings -->
        <div class="border-t border-space-700 pt-4">
          <div class="flex items-center justify-between mb-3">
            <label class="text-sm text-space-300">Use Grid Square instead of GPS</label>
            <input
              :checked="settings.useGridSquare"
              @change="handleUseGridSquareChange($event.target.checked)"
              type="checkbox"
              class="w-4 h-4 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-2"
            />
          </div>

          <div v-if="settings.useGridSquare" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm text-space-300">Disable GPS completely</label>
              <input
                :checked="settings.disableGPS"
                @change="$emit('update:settings', { ...settings, disableGPS: $event.target.checked })"
                type="checkbox"
                class="w-4 h-4 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-2"
              />
            </div>

            <div v-if="settings.useGridSquare && !settings.disableGPS" class="bg-blue-900/20 border border-blue-700 rounded p-2 text-xs text-blue-300">
              ℹ️ GPS will be used as backup if grid square is invalid.
            </div>

            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">Grid Square (Maidenhead Locator)</label>
              <input
                :value="settings.gridSquare"
                @input="$emit('update:settings', { ...settings, gridSquare: $event.target.value.toUpperCase() })"
                placeholder="e.g., JN76AB12"
                maxlength="8"
                class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                :class="{ 'border-red-500': settings.gridSquare && !isValidGridSquare(settings.gridSquare) }"
              />
              <div class="mt-1 text-xs text-space-400">
                Format: 4 chars (JN76), 6 chars (JN76AB), or 8 chars (JN76AB12) for high precision
              </div>
              <div v-if="settings.gridSquare && isValidGridSquare(settings.gridSquare)" class="mt-1 text-xs text-green-400">
                ✓ Valid grid square
              </div>
              <div v-else-if="settings.gridSquare && !isValidGridSquare(settings.gridSquare)" class="mt-1 text-xs text-red-400">
                ✗ Invalid format
              </div>

              <!-- Display coordinates if grid square is valid -->
              <div v-if="settings.gridSquare && isValidGridSquare(settings.gridSquare)" class="mt-2 p-2 bg-space-800/50 border border-space-600 rounded text-xs">
                <div class="text-space-300 mb-1">Coordinates:</div>
                <div class="text-green-400 font-mono">
                  {{ getCoordinatesFromGridSquare(settings.gridSquare) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings', 'location-updated'])

const isUpdatingLocation = ref(false)

/**
 * Validate grid square format (Maidenhead locator)
 * @param {string} gridSquare - Grid square to validate
 * @returns {boolean} True if valid format
 */
const isValidGridSquare = (gridSquare) => {
  if (!gridSquare) return false

  // Remove spaces and convert to uppercase
  const clean = gridSquare.replace(/\s/g, '').toUpperCase()

  // Valid formats: 4 chars (JN76), 6 chars (JN76AB), or 8 chars (JN76AB12) for high precision
  const validPattern = /^[A-R]{2}[0-9]{2}([A-X]{2})?([A-X]{2})?$/
  return validPattern.test(clean)
}

/**
 * Convert grid square to latitude and longitude
 * @param {string} gridSquare - Grid square (4, 6, or 8 characters)
 * @returns {Object} {latitude, longitude} in decimal degrees
 */
const gridSquareToLatLng = (gridSquare) => {
  if (!isValidGridSquare(gridSquare)) {
    throw new Error('Invalid grid square format')
  }

  const clean = gridSquare.replace(/\s/g, '').toUpperCase()

  // Extract components
  const field1 = clean.charCodeAt(0) - 65 // A=0, B=1, etc.
  const field2 = clean.charCodeAt(1) - 65
  const square1 = parseInt(clean.charAt(2))
  const square2 = parseInt(clean.charAt(3))

  // Calculate base coordinates
  let longitude = (field1 * 20) - 180 + (square1 * 2)
  let latitude = (field2 * 10) - 90 + (square2 * 1)

  // Add subsquare precision if 6+ characters
  if (clean.length >= 6) {
    const subsquare1 = clean.charCodeAt(4) - 65
    const subsquare2 = clean.charCodeAt(5) - 65

    longitude += (subsquare1 * 0.083333) // 2/24 degrees
    latitude += (subsquare2 * 0.041667)  // 1/24 degrees
  }

  // Add extended subsquare precision if 8 characters
  if (clean.length >= 8) {
    const extended1 = clean.charCodeAt(6) - 65
    const extended2 = clean.charCodeAt(7) - 65

    longitude += (extended1 * 0.003472) // 2/24/24 degrees
    latitude += (extended2 * 0.001736)  // 1/24/24 degrees
  }

  return {
    latitude: latitude,
    longitude: longitude
  }
}

/**
 * Get formatted coordinates from grid square
 * @param {string} gridSquare - Grid square to convert
 * @returns {string} Formatted coordinates string
 */
const getCoordinatesFromGridSquare = (gridSquare) => {
  try {
    const coords = gridSquareToLatLng(gridSquare)
    const latDir = coords.latitude >= 0 ? 'N' : 'S'
    const lonDir = coords.longitude >= 0 ? 'E' : 'W'

    return `${Math.abs(coords.latitude).toFixed(6)}°${latDir}, ${Math.abs(coords.longitude).toFixed(6)}°${lonDir}`
  } catch (error) {
    return 'Invalid grid square'
  }
}

/**
 * Convert latitude and longitude to grid square (8-character precision)
 * @param {number} latitude - Latitude in decimal degrees
 * @param {number} longitude - Longitude in decimal degrees
 * @returns {string} Grid square (8 characters for high precision)
 */
const latLngToGridSquare = (latitude, longitude) => {
  // Ensure coordinates are within valid ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates')
  }

  // Convert to positive ranges
  const lat = latitude + 90
  const lon = longitude + 180

  // Calculate field (first 2 characters) - A to R (18 fields)
  const field1 = Math.floor(lon / 20)
  const field2 = Math.floor(lat / 10)

  // Calculate square (next 2 characters) - 0 to 9
  const square1 = Math.floor((lon % 20) / 2)
  const square2 = Math.floor(lat % 10)

  // Calculate subsquare (next 2 characters) - A to X (24 subsquares)
  const subsquare1 = Math.floor(((lon % 20) % 2) * 12)
  const subsquare2 = Math.floor((lat % 10) * 24)

  // Calculate extended subsquare (last 2 characters) - A to X (24 extended subsquares)
  const extended1 = Math.floor((((lon % 20) % 2) * 12) % 1 * 24)
  const extended2 = Math.floor(((lat % 10) * 24) % 1 * 24)

  // Convert to characters (ensure valid ranges)
  const field1Char = String.fromCharCode(65 + Math.min(field1, 17)) // A-R (0-17)
  const field2Char = String.fromCharCode(65 + Math.min(field2, 17)) // A-R (0-17)
  const subsquare1Char = String.fromCharCode(65 + Math.min(subsquare1, 23)) // A-X (0-23)
  const subsquare2Char = String.fromCharCode(65 + Math.min(subsquare2, 23)) // A-X (0-23)
  const extended1Char = String.fromCharCode(65 + Math.min(extended1, 23)) // A-X (0-23)
  const extended2Char = String.fromCharCode(65 + Math.min(extended2, 23)) // A-X (0-23)

  return `${field1Char}${field2Char}${square1}${square2}${subsquare1Char}${subsquare2Char}${extended1Char}${extended2Char}`
}

/**
 * Handle grid square checkbox change
 * @param {boolean} useGridSquare - Whether to use grid square
 */
const handleUseGridSquareChange = (useGridSquare) => {
  const newSettings = { ...props.settings, useGridSquare }

  // If enabling grid square, also enable GPS disable by default
  if (useGridSquare && !props.settings.disableGPS) {
    newSettings.disableGPS = true
  }

  emit('update:settings', newSettings)
}

/**
 * Auto-detect location using GPS and convert to grid square
 * @returns {Promise<Object>} Location data with grid square
 */
const autoDetectLocation = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const options = {
      enableHighAccuracy: props.settings.highAccuracyMode,
      timeout: 10000,
      maximumAge: 0 // Force fresh location
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords

        try {
          // Convert to grid square
          const gridSquare = latLngToGridSquare(latitude, longitude)

          resolve({
            latitude,
            longitude,
            accuracy,
            gridSquare,
            source: 'gps-auto-detected'
          })
        } catch (error) {
          reject(new Error(`Failed to convert coordinates to grid square: ${error.message}`))
        }
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        reject(new Error(errorMessage))
      },
      options
    )
  })
}

/**
 * Update location manually (GPS -> Grid Square)
 */
const updateLocation = async () => {
  try {
    isUpdatingLocation.value = true

    const locationData = await autoDetectLocation()

    // Update settings
    const newSettings = {
      ...props.settings,
      gridSquare: locationData.gridSquare,
      useGridSquare: true,
      disableGPS: true // Auto-disable GPS after detection
    }

    emit('update:settings', newSettings)
    emit('location-updated', locationData)

  } catch (error) {
    console.error('Failed to update location:', error)
    emit('location-updated', { error: error.message })
  } finally {
    isUpdatingLocation.value = false
  }
}
</script>
