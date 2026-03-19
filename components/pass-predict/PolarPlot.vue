<template>
  <div class="bg-space-900 border border-space-600 rounded-lg flex flex-col items-center max-w-full overflow-hidden">
    <!-- Live Position Info -->
    <div class="text-center mb-2 mt-3">
      <div class="flex items-center justify-center gap-3">
        <div class="text-xs text-space-400 font-mono">
          <span>El: {{ currentElevation !== null && currentElevation !== undefined ? currentElevation.toFixed(1).padStart(4, ' ') : 'N/A' }}°</span>
          <span class="mx-2">|</span>
          <span>Az: {{ currentAzimuth !== null && currentAzimuth !== undefined ? currentAzimuth.toFixed(1).padStart(5, ' ') : 'N/A' }}°</span>
          <span class="mx-2">|</span>
          <span>{{ formattedDistance }}</span>
        </div>
        <!-- AR Track Button (shown when satellite is passing) -->
        <NuxtLink
          v-if="isPassing && noradId"
          :to="`/ar-track?noradId=${noradId}&startTime=${passStartTime}`"
          class="ar-track-button"
          title="AR Track"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </NuxtLink>
      </div>
    </div>

    <!-- SVG Polar Plot -->
    <svg
      v-if="isGeostationary || futurePath || currentPosition || entryPoint || exitPoint || peakPoint"
      viewBox="0 0 400 400"
      overflow="visible"
      class="mx-auto block w-full max-w-[400px] h-auto"
    >
      <!-- Preloaded Background Elements -->
      <g v-html="backgroundSVG"></g>

      <!-- Predicted path arc (Entry → Peak → Exit) — static for all pass states -->
      <path
        v-if="predictedPath"
        :d="predictedPath"
        fill="none"
        stroke="#38bdf8"
        stroke-width="1.5"
        stroke-dasharray="4,4"
        opacity="0.45"
      />

      <!-- N2YO real-time path (actual + next 60s) -->
      <path
        v-if="futurePath"
        :d="futurePath"
        fill="none"
        stroke="#10b981"
        stroke-width="2"
        stroke-dasharray="6,3"
        opacity="0.9"
      />

      <!-- Pass points — rendered last so always on top -->
      <g v-if="entryPoint || exitPoint || peakPoint">
        <!-- Peak dot -->
        <circle
          v-if="peakPoint"
          :cx="peakPoint.x"
          :cy="peakPoint.y"
          r="4"
          fill="#94a3b8"
          stroke="#ffffff"
          stroke-width="1.5"
          opacity="0.85"
        />
        <!-- Entry/AOS dot — green -->
        <circle
          v-if="entryPoint"
          :cx="entryPoint.x"
          :cy="entryPoint.y"
          r="4"
          fill="#10b981"
          stroke="#ffffff"
          stroke-width="1.5"
          opacity="0.9"
        />
        <!-- Exit/LOS dot — red -->
        <circle
          v-if="exitPoint"
          :cx="exitPoint.x"
          :cy="exitPoint.y"
          r="4"
          fill="#f87171"
          stroke="#ffffff"
          stroke-width="1.5"
          opacity="0.9"
        />
      </g>

      <!-- Current satellite position -->
      <g v-if="currentPosition">
        <text
          :x="currentPosition.x"
          :y="currentPosition.y + 6"
          text-anchor="middle"
          style="font-size:16px"
        >🛰️</text>
      </g>

    </svg>

    <!-- Fallback message when no valid path data -->
    <div
      v-else
      class="flex items-center justify-center h-64 bg-space-800 border border-space-600 rounded-lg"
    >
      <div class="text-center text-space-400">
        <div class="text-sm font-medium mb-1">No Path Data Available</div>
        <div class="text-xs">
          Invalid azimuth data from N2YO API
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isGeostationaryPass } from '~/utils/satelliteStatusUtils'
/**
 * Polar Plot Component
 * Displays satellite position on a polar plot (azimuth/elevation)
 * - Center = Observer position
 * - Top = North (0°)
 * - Concentric circles = Elevation (90° center, 0° outer)
 */

const props = defineProps({
  satelliteName: {
    type: String,
    required: true
  },
  // Current real-time position
  currentElevation: {
    type: Number,
    default: 0
  },
  currentAzimuth: {
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
  // Path data
  pastPositions: {
    type: Array,
    default: () => []
  },
  futurePositions: {
    type: Array,
    default: () => []
  },
  // Pass prediction data for showing entry/exit/peak points
  startAzimuth: {
    type: Number,
    default: null
  },
  endAzimuth: {
    type: Number,
    default: null
  },
  maxElevation: {
    type: Number,
    default: null
  },
  maxAzimuth: {
    type: Number,
    default: null
  },
  noradId: {
    type: Number,
    default: null
  },
  size: {
    type: Number,
    default: 400
  },
  // Pass timing for calculating predicted path position
  passStartTime: {
    type: Number,
    default: null
  },
  passEndTime: {
    type: Number,
    default: null
  },
  // Whether satellite is currently passing
  isPassing: {
    type: Boolean,
    default: false
  },
  // Don't show predicted path when in-transit (N2YO real-time shows actual path)
  isInTransit: {
    type: Boolean,
    default: false
  }
})

const { backgroundSVG } = usePolarPlotBackground()
const {
  polarToCartesian,
  generatePathWithWraparound,
  computePeakAzimuth,
  computePredictedArcPath
} = useSatellitePath()

const isGeostationary = computed(() =>
  isGeostationaryPass({
    startAzimuth: props.startAzimuth,
    endAzimuth: props.endAzimuth,
    startTime: props.passStartTime,
    endTime: props.passEndTime
  })
)

const formattedDistance = computed(() => {
  let distance = props.currentDistance
  let unit = 'km'

  if (props.distanceUnits === 'miles') {
    distance = distance * 0.621371
    unit = 'mi'
  }

  return `${distance.toFixed(0).padStart(5, ' ')} ${unit}`
})

const currentPosition = computed(() => {
  if (props.currentElevation === null || props.currentAzimuth === null || 
      props.currentElevation === undefined || props.currentAzimuth === undefined) {
    return null
  }
  return polarToCartesian(props.currentAzimuth, props.currentElevation)
})

const entryPoint = computed(() => {
  if (isGeostationary.value) return null
  if (props.startAzimuth === null || props.startAzimuth === undefined) return null
  if (props.maxElevation === null || props.maxElevation === undefined) return null

  const entryElevation = 0
  const entryAzimuth = props.startAzimuth

  return polarToCartesian(entryAzimuth, entryElevation)
})

const exitPoint = computed(() => {
  if (isGeostationary.value) return null
  if (props.endAzimuth === null || props.endAzimuth === undefined) return null
  return polarToCartesian(props.endAzimuth, 0)
})

const peakAzimuth = computed(() =>
  computePeakAzimuth({
    startAzimuth: props.startAzimuth,
    endAzimuth: props.endAzimuth,
    maxAzimuth: props.maxAzimuth,
    maxElevation: props.maxElevation
  })
)

const peakPoint = computed(() => {
  const peakAzimuthValue = peakAzimuth.value
  if (peakAzimuthValue === null) return null
  return polarToCartesian(peakAzimuthValue, props.maxElevation)
})

// Full predicted path with the same circular arc extended beyond AOS/LOS by 40 SVG units
const predictedPath = computed(() => {
  if (isGeostationary.value) return null
  // Don't show predicted path for in-transit passes (real-time N2YO data shows actual path)
  if (props.isInTransit) return null
  if (!entryPoint.value || !peakPoint.value || !exitPoint.value) return null
  return computePredictedArcPath(entryPoint.value, peakPoint.value, exitPoint.value, 40)
})


const futurePath = computed(() => {
  if (!props.futurePositions || props.futurePositions.length < 2) return null
  const sortedPositions = [...props.futurePositions].sort((a, b) => a.timestamp - b.timestamp)
  return generatePathWithWraparound(sortedPositions)
})
</script>

<style scoped>
@keyframes satellite-pulse {
  0%, 100% {
    r: 12;
    opacity: 0.3;
  }
  50% {
    r: 16;
    opacity: 0.1;
  }
}

.satellite-pulse {
  animation: satellite-pulse 2s ease-in-out infinite;
}
</style>

