<template>
  <div class="polar-plot-container">
    <!-- Title -->
    <div class="text-center mb-2">
      <h4 class="text-sm font-semibold text-primary-400">
        {{ satelliteName }} - Live Position
      </h4>
      <div class="text-xs text-space-400">
        {{ currentElevation }}° elevation | {{ currentAzimuth }}° azimuth
      </div>
    </div>

    <!-- SVG Polar Plot -->
    <svg 
      v-if="predictedPath || pastPath || futurePath || currentPosition"
      :width="size" 
      :height="size" 
      viewBox="0 0 400 400"
      class="mx-auto"
    >
      <!-- Background -->
      <circle :cx="center" :cy="center" :r="radius" fill="#0f172a" stroke="#334155" stroke-width="1" />
      
      <!-- Elevation circles (0°, 30°, 60° from horizon) -->
      <circle 
        v-for="el in [30, 60]" 
        :key="el"
        :cx="center" 
        :cy="center" 
        :r="elevationToRadius(el)" 
        fill="none" 
        stroke="#475569" 
        stroke-width="1" 
        stroke-dasharray="4,4"
      />
      
      <!-- Cardinal direction lines (N, E, S, W) -->
      <line 
        v-for="angle in [0, 90, 180, 270]" 
        :key="angle"
        :x1="center" 
        :y1="center"
        :x2="center + radius * Math.sin(degreesToRadians(angle))"
        :y2="center - radius * Math.cos(degreesToRadians(angle))"
        stroke="#475569"
        stroke-width="1"
        opacity="0.3"
      />

      <!-- Compass labels -->
      <text :x="center" :y="20" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">N</text>
      <text :x="380" :y="center + 5" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">E</text>
      <text :x="center" :y="390" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">S</text>
      <text :x="20" :y="center + 5" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">W</text>

      <!-- Elevation labels -->
      <text :x="center + 10" :y="center - elevationToRadius(30) + 5" fill="#64748b" font-size="10">30°</text>
      <text :x="center + 10" :y="center - elevationToRadius(60) + 5" fill="#64748b" font-size="10">60°</text>

      <!-- Predicted path (from pass prediction data) -->
      <path
        v-if="predictedPath"
        :d="predictedPath"
        fill="none"
        stroke="#38bdf8"
        stroke-width="2"
        stroke-dasharray="4,4"
        opacity="0.4"
      />

      <!-- Past path (where satellite has been) -->
      <path
        v-if="pastPath"
        :d="pastPath"
        fill="none"
        stroke="#10b981"
        stroke-width="3"
        stroke-linecap="round"
      />

      <!-- Future path (next 60s from API) -->
      <path
        v-if="futurePath"
        :d="futurePath"
        fill="none"
        stroke="#10b981"
        stroke-width="2"
        stroke-dasharray="6,3"
        opacity="0.7"
      />

      <!-- Current satellite position (pulsing dot) -->
      <g v-if="currentPosition">
        <!-- Outer pulse ring -->
        <circle
          :cx="currentPosition.x"
          :cy="currentPosition.y"
          r="12"
          fill="#10b981"
          opacity="0.3"
          class="satellite-pulse"
        />
        <!-- Inner satellite dot -->
        <circle
          :cx="currentPosition.x"
          :cy="currentPosition.y"
          r="6"
          fill="#10b981"
        />
        <!-- Satellite icon (simplified) -->
        <text
          :x="currentPosition.x"
          :y="currentPosition.y + 4"
          text-anchor="middle"
          fill="#0f172a"
          font-size="8"
          font-weight="bold"
        >🛰️</text>
      </g>

      <!-- Horizon marker -->
      <text :x="center" :y="center + radius + 15" text-anchor="middle" fill="#64748b" font-size="10">
        Horizon (0°)
      </text>
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

<script setup>
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
  // Path data
  pastPositions: {
    type: Array,
    default: () => []
  },
  futurePositions: {
    type: Array,
    default: () => []
  },
  // Pass prediction data for predicted path
  startAzimuth: {
    type: Number,
    default: 0
  },
  endAzimuth: {
    type: Number,
    default: 0
  },
  maxElevation: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    default: 400
  }
})

// Constants
const center = 200 // Center of SVG (400/2)
const radius = 180 // Outer radius (horizon)

/**
 * Convert degrees to radians
 */
const degreesToRadians = (degrees) => {
  return (degrees * Math.PI) / 180
}

/**
 * Convert elevation (0-90°) to radius on plot
 * 90° elevation = center (radius 0)
 * 0° elevation = outer edge (radius = max)
 */
const elevationToRadius = (elevation) => {
  return radius * (1 - elevation / 90)
}

/**
 * Convert azimuth/elevation to SVG coordinates
 * Azimuth: 0° = North (top), 90° = East, 180° = South, 270° = West
 * Elevation: 90° = center, 0° = horizon
 */
const polarToCartesian = (azimuth, elevation) => {
  const r = elevationToRadius(elevation)
  const angleRad = degreesToRadians(azimuth)
  
  return {
    x: center + r * Math.sin(angleRad),
    y: center - r * Math.cos(angleRad)
  }
}

/**
 * Current satellite position (x, y coordinates)
 */
const currentPosition = computed(() => {
  if (!props.currentElevation || !props.currentAzimuth) return null
  return polarToCartesian(props.currentAzimuth, props.currentElevation)
})

/**
 * Generate SVG path for predicted arc (from pass prediction)
 * Creates a smooth arc from start → max → end
 */
const predictedPath = computed(() => {
  // Validate required data
  if (!props.maxElevation || props.maxElevation <= 0) return null
  
  // Check for valid azimuth data
  const startAz = props.startAzimuth
  const endAz = props.endAzimuth
  
  if (startAz === null || startAz === undefined || 
      endAz === null || endAz === undefined ||
      isNaN(startAz) || isNaN(endAz) ||
      startAz < 0 || startAz > 360 ||
      endAz < 0 || endAz > 360) {
    console.warn(`⚠️ Invalid azimuth data for ${props.satelliteName}: startAz=${startAz}, endAz=${endAz}`)
    return null
  }

  const points = []
  
  // Sample points along the predicted arc
  const samples = 20
  for (let i = 0; i <= samples; i++) {
    const t = i / samples // 0 to 1
    
    // Interpolate azimuth (handle wraparound at 0°/360°)
    let azimuth
    if (Math.abs(endAz - startAz) > 180) {
      // Wraparound case
      azimuth = startAz + t * (endAz - startAz + 360)
      if (azimuth > 360) azimuth -= 360
    } else {
      azimuth = startAz + t * (endAz - startAz)
    }
    
    // Interpolate elevation (parabolic arc, peak at t=0.5)
    // Assumes elevation rises to max at midpoint, then descends
    const elevation = props.maxElevation * Math.sin(t * Math.PI)
    
    const point = polarToCartesian(azimuth, elevation)
    points.push(point)
  }

  // Create SVG path
  if (points.length === 0) return null
  
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }
  
  return path
})

/**
 * Generate SVG path for past positions (where satellite has been)
 */
const pastPath = computed(() => {
  if (!props.pastPositions || props.pastPositions.length < 2) return null

  const points = props.pastPositions.map(pos => 
    polarToCartesian(pos.azimuth, pos.elevation)
  )

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }

  return path
})

/**
 * Generate SVG path for future positions (next 60s from API)
 */
const futurePath = computed(() => {
  if (!props.futurePositions || props.futurePositions.length < 2) return null

  const points = props.futurePositions.map(pos => 
    polarToCartesian(pos.azimuth, pos.elevation)
  )

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }

  return path
})
</script>

<style scoped>
.polar-plot-container {
  @apply bg-space-900 border border-space-600 rounded-lg p-4;
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

