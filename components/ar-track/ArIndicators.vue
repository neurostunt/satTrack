<template>
  <div class="bg-space-800 border border-space-700 rounded-lg p-4 flex flex-col gap-4">
    <!-- Heading Indicator -->
    <div v-if="headingDifference !== null" class="flex items-center gap-4">
      <div class="text-xs text-space-400 font-medium w-20">Heading</div>
      <div class="text-lg font-bold font-mono w-24" :class="getHeadingColorClass()">
        {{ formatHeadingDifference(headingDifference) }}
      </div>
      <div class="flex-1 flex items-center justify-center">
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          class="transition-transform duration-300 ease-out"
          :style="{ transform: `rotate(${headingDifference}deg)` }"
        >
          <path
            d="M 30 10 L 35 25 L 30 20 L 25 25 Z"
            fill="#10b981"
            stroke="#0f172a"
            stroke-width="1"
          />
        </svg>
      </div>
    </div>

    <!-- Elevation Indicator -->
    <div v-if="elevationDifference !== null" class="flex items-center gap-4">
      <div class="text-xs text-space-400 font-medium w-20">Elevation</div>
      <div class="text-lg font-bold font-mono w-24" :class="getElevationColorClass()">
        {{ formatElevationDifference(elevationDifference) }}
      </div>
      <div class="flex-1 flex items-center">
        <div class="w-full h-8 bg-space-700 rounded-full overflow-hidden relative">
          <div
            class="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-300 ease-out"
            :style="{ height: `${Math.min(100, Math.max(0, (elevationDifference + 90) / 180 * 100))}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Compass Quality Indicator -->
    <div class="flex items-center gap-2">
      <div class="text-xs text-space-400 font-medium w-24">Compass Quality</div>
      <div class="flex-1 h-2 bg-space-700 rounded-full overflow-hidden">
        <div
          class="h-full transition-all duration-300 ease-out"
          :class="getCompassQualityClass()"
          :style="{ width: `${compassQuality}%` }"
        />
      </div>
      <div class="text-xs font-medium w-12 text-right" :class="getCompassQualityTextClass()">
        {{ getCompassQualityText() }}
      </div>
    </div>

    <!-- Satellite Info -->
    <div class="flex flex-col gap-1 pt-2 border-t border-space-600">
      <div class="flex justify-between text-xs">
        <span class="text-space-400">Azimuth:</span>
        <span class="text-space-300 font-mono font-medium">{{ currentAzimuth.toFixed(1) }}°</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-space-400">Elevation:</span>
        <span class="text-space-300 font-mono font-medium">{{ currentElevation.toFixed(1) }}°</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-space-400">Distance:</span>
        <span class="text-space-300 font-mono font-medium">{{ formattedDistance }}</span>
      </div>
    </div>

    <!-- Transmitter Frequencies (with Doppler shift for passing satellites) -->
    <div v-if="dopplerFrequencies.length > 0" class="flex flex-col gap-2 pt-2 border-t border-space-600">
      <div class="flex items-center justify-between">
        <div class="text-xs text-space-400 uppercase tracking-wider font-semibold">
          {{ isPassing ? 'Doppler Shift' : 'Frequencies' }}
        </div>
        <div class="text-xs text-space-500">{{ dopplerFrequencies.length }} transmitter{{ dopplerFrequencies.length > 1 ? 's' : '' }}</div>
      </div>
      <div class="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
        <div
          v-for="(transmitter, index) in dopplerFrequencies"
          :key="index"
          class="flex flex-col gap-1 pb-2"
          :class="{ 'border-b border-space-700': index < dopplerFrequencies.length - 1 }"
        >
          <div class="text-xs text-space-300 font-medium">{{ transmitter.label }}</div>
          <div v-if="transmitter.uplink" class="flex justify-between text-xs">
            <span class="text-space-400">Uplink:</span>
            <div class="text-right font-mono">
              <span class="font-medium" :class="isPassing && transmitter.uplink.shift !== 0 ? 'text-orange-400' : 'text-space-200'">
                {{ transmitter.uplink.shifted }}
              </span>
              <span v-if="isPassing && transmitter.uplink.shift !== 0" class="text-space-500 text-[10px] ml-1">
                ({{ transmitter.uplink.original }})
              </span>
            </div>
          </div>
          <div v-if="transmitter.downlink" class="flex justify-between text-xs">
            <span class="text-space-400">Downlink:</span>
            <div class="text-right font-mono">
              <span class="font-medium" :class="isPassing && transmitter.downlink.shift !== 0 ? 'text-orange-400' : 'text-space-200'">
                {{ transmitter.downlink.shifted }}
              </span>
              <span v-if="isPassing && transmitter.downlink.shift !== 0" class="text-space-500 text-[10px] ml-1">
                ({{ transmitter.downlink.original }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { calculateDopplerShift } from '~/utils/dopplerCalculations'
import { formatFrequencyHighPrecision } from '~/utils/frequencyUtils'
import { matchesTransmitterFilters } from '~/utils/transmitterCategorization'
import { useSettings } from '~/composables/storage/useSettings'

const { settings } = useSettings()

const props = defineProps({
  // Current satellite position
  currentAzimuth: {
    type: Number,
    default: 0
  },
  currentElevation: {
    type: Number,
    default: 0
  },
  currentDistance: {
    type: Number,
    default: 0
  },
  distanceUnits: {
    type: String,
    default: 'km'
  },
  // Device orientation
  compassHeading: {
    type: Number,
    default: null
  },
  devicePitch: {
    type: Number,
    default: null
  },
  /** Subtract from elevation error (degrees); boom / sensor tweak */
  elevationBiasDeg: {
    type: Number,
    default: 0
  },
  // Compass quality (0-100)
  compassQuality: {
    type: Number,
    default: 50
  },
  // Radial velocity for Doppler shift
  radialVelocity: {
    type: Number,
    default: 0
  },
  // Whether satellite is passing (for Doppler calculation)
  isPassing: {
    type: Boolean,
    default: false
  },
  // NORAD ID for getting transmitter data
  noradId: {
    type: Number,
    default: null
  },
  // Function to get satellite data
  getSatelliteData: {
    type: Function,
    default: null
  }
})

// ============================================================================
// Computed Properties
// ============================================================================

/**
 * Calculate heading difference between satellite azimuth and compass heading
 * Positive = satellite is to the right, Negative = satellite is to the left
 */
const headingDifference = computed(() => {
  if (props.compassHeading === null || props.compassHeading === undefined) {
    return null
  }

  // Calculate relative azimuth (where satellite is relative to phone heading)
  let diff = props.currentAzimuth - props.compassHeading

  // Normalize to -180 to +180 range
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360

  return diff
})

/**
 * Calculate elevation difference
 * Positive = need to raise phone, Negative = need to lower phone
 * Device pitch: -90° (pointing down) to +90° (pointing up)
 * Satellite elevation: 0° (horizon) to 90° (zenith)
 */
const elevationDifference = computed(() => {
  if (props.devicePitch === null || props.devicePitch === undefined) {
    return null
  }

  // Convert device pitch to elevation angle
  // Device pitch: -90° (down) to +90° (up)
  // We want: 0° (horizon) to 90° (zenith)
  const deviceElevation = 90 + props.devicePitch // -90° pitch = 0° elevation, +90° pitch = 180° elevation

  // Clamp device elevation to 0-90° range (we can't point below horizon or above zenith)
  const clampedDeviceElevation = Math.max(0, Math.min(90, deviceElevation))
  const bias = Number(props.elevationBiasDeg) || 0

  // Calculate difference
  return props.currentElevation - clampedDeviceElevation - bias
})

/**
 * Format distance
 */
const formattedDistance = computed(() => {
  let distance = props.currentDistance
  let unit = 'km'

  if (props.distanceUnits === 'miles') {
    distance = distance * 0.621371
    unit = 'mi'
  }

  return `${distance.toFixed(0)} ${unit}`
})

/**
 * Calculate transmitter frequencies (with Doppler shift for passing satellites)
 * Shows both uplink and downlink frequencies
 * - For passing satellites: applies Doppler correction
 * - For geostationary satellites: shows original frequencies (no Doppler shift)
 * Applies same filtering as PassDetails (alive transmitters + user filters)
 */
const dopplerFrequencies = computed(() => {
  // Need satellite data
  if (!props.noradId || !props.getSatelliteData) {
    return []
  }

  try {
    const satData = props.getSatelliteData(props.noradId)
    
    // Check if satData exists and has transmitters array
    if (!satData || !satData.transmitters || !Array.isArray(satData.transmitters) || satData.transmitters.length === 0) {
      return []
    }
    
    // Filter transmitters: alive + user filters (same as PassDetails)
    const allTransmitters = satData.transmitters
    const aliveTransmitters = allTransmitters.filter(t => t.alive !== false)
    
    let filteredTransmitters = aliveTransmitters
    if (settings.value?.transmitterFilters) {
      const filters = settings.value.transmitterFilters
      filteredTransmitters = aliveTransmitters.filter(transmitter =>
        matchesTransmitterFilters(transmitter, filters)
      )
    }
    
    const transmitters = []
    
    // Check if we can calculate Doppler (passing satellites with radial velocity)
    const canCalculateDoppler = props.isPassing && 
                                props.radialVelocity !== null && 
                                props.radialVelocity !== undefined

    filteredTransmitters.forEach(transmitter => {
      if (!transmitter) return
      
      // Check if transmitter has at least one frequency
      if (!transmitter.downlink_low && !transmitter.uplink_low) return

      const transmitterData = {
        label: transmitter.description || transmitter.mode || 'Transmitter',
        uplink: null,
        downlink: null
      }

      // Process uplink frequency
      if (transmitter.uplink_low) {
        if (canCalculateDoppler) {
          // Calculate Doppler shift for passing satellites
          const dopplerUplink = calculateDopplerShift(transmitter.uplink_low, props.radialVelocity)
          transmitterData.uplink = {
            original: formatFrequencyHighPrecision(transmitter.uplink_low),
            shifted: formatFrequencyHighPrecision(dopplerUplink.shiftedFrequency),
            shift: dopplerUplink.shiftKHz
          }
        } else {
          // No Doppler shift for geostationary satellites
          transmitterData.uplink = {
            original: formatFrequencyHighPrecision(transmitter.uplink_low),
            shifted: formatFrequencyHighPrecision(transmitter.uplink_low), // Same as original
            shift: 0
          }
        }
      }

      // Process downlink frequency
      if (transmitter.downlink_low) {
        if (canCalculateDoppler) {
          // Calculate Doppler shift for passing satellites
          const dopplerDownlink = calculateDopplerShift(transmitter.downlink_low, props.radialVelocity)
          transmitterData.downlink = {
            original: formatFrequencyHighPrecision(transmitter.downlink_low),
            shifted: formatFrequencyHighPrecision(dopplerDownlink.shiftedFrequency),
            shift: dopplerDownlink.shiftKHz
          }
        } else {
          // No Doppler shift for geostationary satellites
          transmitterData.downlink = {
            original: formatFrequencyHighPrecision(transmitter.downlink_low),
            shifted: formatFrequencyHighPrecision(transmitter.downlink_low), // Same as original
            shift: 0
          }
        }
      }

      transmitters.push(transmitterData)
    })

    // Return all filtered transmitters (same as PassDetails - no artificial limit)
    return transmitters
  } catch (error) {
    // Silently fail - frequency display is optional
    console.error('Error calculating transmitter frequencies:', error)
    return []
  }
})

// ============================================================================
// Methods
// ============================================================================

const formatHeadingDifference = (diff) => {
  if (diff === null) return 'N/A'
  const absDiff = Math.abs(diff)
  const direction = diff > 0 ? 'R' : 'L'
  return `${absDiff.toFixed(1)}° ${direction}`
}

const formatElevationDifference = (diff) => {
  if (diff === null) return 'N/A'
  const absDiff = Math.abs(diff)
  const direction = diff > 0 ? '↑' : '↓'
  return `${absDiff.toFixed(1)}° ${direction}`
}

const getHeadingColorClass = () => {
  if (headingDifference.value === null) return ''
  const absDiff = Math.abs(headingDifference.value)
  if (absDiff < 5) return 'text-green-400'
  if (absDiff < 15) return 'text-yellow-400'
  return 'text-red-400'
}

const getElevationColorClass = () => {
  if (elevationDifference.value === null) return ''
  const absDiff = Math.abs(elevationDifference.value)
  if (absDiff < 5) return 'text-green-400'
  if (absDiff < 15) return 'text-yellow-400'
  return 'text-red-400'
}

const getCompassQualityClass = () => {
  if (props.compassQuality >= 80) return 'bg-green-500'
  if (props.compassQuality >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getCompassQualityTextClass = () => {
  if (props.compassQuality >= 80) return 'text-green-400'
  if (props.compassQuality >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

const getCompassQualityText = () => {
  if (props.compassQuality >= 80) return 'Good'
  if (props.compassQuality >= 50) return 'Fair'
  return 'Poor'
}
</script>

<style scoped>
</style>


