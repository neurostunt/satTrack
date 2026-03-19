<template>
  <div class="polar-plot-container">
    <!-- SVG Polar Plot with rotation -->
    <svg
      v-if="isGeostationary || futurePath || currentPosition || entryPoint || exitPoint || peakPoint"
      viewBox="0 0 400 400"
      overflow="visible"
      class="mx-auto block w-full max-w-[400px] h-auto"
      :style="{ transform: `rotate(${rotationAngle}deg)` }"
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
      class="flex items-center justify-center h-full bg-space-800 border border-space-600 rounded-lg"
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
 * AR Polar Plot Component
 * Displays satellite position on a polar plot rotated based on device orientation
 * - Center = Observer position
 * - Top = Where phone is pointing (not North)
 * - Concentric circles = Elevation (90° center, 0° outer)
 * - Rotates based on compass heading (alpha) from DeviceOrientationEvent
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
  // Device orientation (compass heading)
  compassHeading: {
    type: Number,
    default: null
  }
})

const { backgroundSVG } = usePolarPlotBackground()
const {
  polarToCartesian,
  generatePathWithWraparound,
  computePeakAzimuth,
  computePredictedArcPath
} = useSatellitePath()

/**
 * Rotation angle for SVG based on compass heading
 * Negative because we want to rotate the plot so that top = where phone points
 * If no compass heading (desktop), rotation is 0 (normal North-up view)
 */
const rotationAngle = computed(() => {
  if (props.compassHeading === null || props.compassHeading === undefined) {
    return 0 // No rotation on desktop - show normal North-up view
  }
  // Rotate plot so that top shows where phone is pointing
  // If phone points North (0°), rotation is 0°
  // If phone points East (90°), rotation is -90° (plot rotates counter-clockwise)
  return -props.compassHeading
})

const isGeostationary = computed(() =>
  isGeostationaryPass({
    startAzimuth: props.startAzimuth,
    endAzimuth: props.endAzimuth,
    startTime: props.passStartTime,
    endTime: props.passEndTime
  })
)

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

const predictedPath = computed(() => {
  if (isGeostationary.value) return null
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
.polar-plot-container {
  background-color: #0f172a;
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Pulsing animation for current satellite position */
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


