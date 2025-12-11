<template>
  <div class="polar-plot-container">
    <!-- Live Position Info -->
    <div class="text-center mb-2 mt-3">
      <div class="text-xs text-space-400 font-mono">
        <span>El: {{ currentElevation.toFixed(1).padStart(4, ' ') }}°</span>
        <span class="mx-2">|</span>
        <span>Az: {{ currentAzimuth.toFixed(1).padStart(5, ' ') }}°</span>
        <span class="mx-2">|</span>
        <span>{{ formattedDistance }}</span>
      </div>
    </div>

    <!-- SVG Polar Plot -->
    <svg
      v-if="isGeostationary || futurePath || currentPosition || entryPoint || exitPoint || peakPoint"
      viewBox="0 0 400 400"
      class="mx-auto block w-full max-w-[400px] h-auto"
    >
      <!-- Preloaded Background Elements -->
      <g v-html="backgroundSVG"></g>

      <!-- Predicted path arc (connects entry → peak → exit) -->
      <path
        v-if="predictedPath"
        :d="predictedPath"
        fill="none"
        stroke="#38bdf8"
        stroke-width="2"
        stroke-dasharray="4,4"
        opacity="0.5"
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

      <!-- Predicted pass points (entry, peak, exit) - not shown for geostationary -->
      <g v-if="entryPoint || exitPoint || peakPoint">
        <!-- Entry point (start azimuth at horizon) - hidden for geostationary -->
        <circle
          v-if="entryPoint"
          :cx="entryPoint.x"
          :cy="entryPoint.y"
          r="5"
          fill="#38bdf8"
          stroke="#ffffff"
          stroke-width="2"
          opacity="0.7"
        />
        <text
          v-if="entryPoint"
          :x="entryPoint.x"
          :y="entryPoint.y - 12"
          text-anchor="middle"
          fill="#38bdf8"
          font-size="10"
          font-weight="bold"
        >Entry</text>

        <!-- Exit point (end azimuth at horizon) - hidden for geostationary -->
        <circle
          v-if="exitPoint"
          :cx="exitPoint.x"
          :cy="exitPoint.y"
          r="5"
          fill="#38bdf8"
          stroke="#ffffff"
          stroke-width="2"
          opacity="0.7"
        />
        <text
          v-if="exitPoint"
          :x="exitPoint.x"
          :y="exitPoint.y - 12"
          text-anchor="middle"
          fill="#38bdf8"
          font-size="10"
          font-weight="bold"
        >Exit</text>

        <!-- Peak point (max elevation) - for geostationary, this is the only position -->
        <circle
          v-if="peakPoint"
          :cx="peakPoint.x"
          :cy="peakPoint.y"
          r="5"
          fill="#94a3b8"
          stroke="#ffffff"
          stroke-width="1.5"
          opacity="0.8"
        />
        <text
          v-if="peakPoint"
          :x="peakPoint.x"
          :y="peakPoint.y - 10"
          text-anchor="middle"
          fill="#94a3b8"
          font-size="9"
          font-weight="600"
        >{{ isGeostationary ? 'Position' : 'Peak' }}</text>
      </g>

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
  }
})

// ============================================================================
// Constants
// ============================================================================
const center = 200 // Center of SVG (400/2)
const radius = 180 // Outer radius (horizon)

// Use preloaded background composable
const { backgroundSVG, elevationToRadius } = usePolarPlotBackground()

// ============================================================================
// Computed Properties - Geostationary Check
// ============================================================================
const isGeostationary = computed(() => {
  // Detect geostationary based on pass characteristics
  // If we have start and end azimuth, check if they're nearly the same
  if (props.startAzimuth !== null && props.endAzimuth !== null) {
    const azimuthDiff = Math.abs(props.startAzimuth - props.endAzimuth)
    return azimuthDiff < 5 // Less than 5 degrees movement = geostationary
  }
  return false
})

// ============================================================================
// Computed Properties - Distance Formatting
// ============================================================================
const formattedDistance = computed(() => {
  let distance = props.currentDistance
  let unit = 'km'

  // Convert to miles if needed
  if (props.distanceUnits === 'miles') {
    distance = distance * 0.621371 // km to miles conversion
    unit = 'mi'
  }

  // Format with fixed width (5 chars + space + 2 char unit)
  return `${distance.toFixed(0).padStart(5, ' ')} ${unit}`
})

// ============================================================================
// Utility Functions
// ============================================================================

/** Convert degrees to radians */
const degreesToRadians = (degrees) => {
  return (degrees * Math.PI) / 180
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

/** Calculate circle center through three points */
const getCircleCenter = (p1, p2, p3) => {
  const ax = p1.x, ay = p1.y
  const bx = p2.x, by = p2.y
  const cx = p3.x, cy = p3.y

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))

  if (Math.abs(d) < 0.0001) return null // Points are collinear

  const ux = ((ax * ax + ay * ay) * (by - cy) +
              (bx * bx + by * by) * (cy - ay) +
              (cx * cx + cy * cy) * (ay - by)) / d

  const uy = ((ax * ax + ay * ay) * (cx - bx) +
              (bx * bx + by * by) * (ax - cx) +
              (cx * cx + cy * cy) * (bx - ax)) / d

  return { x: ux, y: uy }
}

/**
 * Generate SVG path with proper azimuth wraparound handling
 * Splits path into segments when crossing 0°/360° boundary
 */
const generatePathWithWraparound = (positions) => {
  if (!positions || positions.length < 2) return null

  const segments = []
  let currentSegment = []

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]
    currentSegment.push(pos)

    // Check if next position crosses 0°/360° boundary
    if (i < positions.length - 1) {
      const nextPos = positions[i + 1]
      const azDiff = Math.abs(nextPos.azimuth - pos.azimuth)

      // If azimuth jumps more than 180°, we're crossing the boundary
      if (azDiff > 180) {
        // Finish current segment
        segments.push([...currentSegment])
        // Start new segment with next position
        currentSegment = []
      }
    }
  }

  // Add final segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  // Convert segments to SVG paths
  let path = ''
  for (const segment of segments) {
    if (segment.length < 2) continue

    const points = segment.map(pos => polarToCartesian(pos.azimuth, pos.elevation))

    if (path === '') {
      path = `M ${points[0].x} ${points[0].y}`
    } else {
      path += ` M ${points[0].x} ${points[0].y}`
    }

    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`
    }
  }

  return path || null
}

// ============================================================================
// Computed Properties - Positions
// ============================================================================

/** Current satellite position (x, y coordinates) */
const currentPosition = computed(() => {
  if (!props.currentElevation || !props.currentAzimuth) return null
  return polarToCartesian(props.currentAzimuth, props.currentElevation)
})

// ============================================================================
// Computed Properties - Predicted Pass Points
// ============================================================================

/** 
 * Entry point - represents the satellite's position at pass start time (entry)
 * Always calculated at t=0 (pass start time), regardless of current time or tracking state
 * This ensures the entry dot always shows where the satellite actually entered, even during active passes
 * 
 * IMPORTANT: This is calculated from pass.startTime, NOT from when the card was opened or tracking started
 */
const entryPoint = computed(() => {
  // Don't show entry point for geostationary satellites
  if (isGeostationary.value) return null
  if (props.startAzimuth === null || props.startAzimuth === undefined) return null
  if (props.maxElevation === null || props.maxElevation === undefined) return null

  // Entry point is ALWAYS at pass start time (t=0), regardless of:
  // - Current time
  // - Whether pass has started
  // - Whether card is open
  // - Whether real-time tracking is active
  // 
  // At t=0 (pass start time): elevation = 0 (horizon), azimuth = startAzimuth
  // This is the actual satellite entry position, calculated from pass.startTime
  const entryElevation = 0
  const entryAzimuth = props.startAzimuth

  // Calculate the entry point position using the same method as predicted path
  // This ensures perfect alignment with the predicted path arc
  return polarToCartesian(entryAzimuth, entryElevation)
})

/** Exit point (end azimuth at horizon) */
const exitPoint = computed(() => {
  // Don't show exit point for geostationary satellites
  if (isGeostationary.value) return null
  if (props.endAzimuth === null || props.endAzimuth === undefined) return null
  return polarToCartesian(props.endAzimuth, 0)
})

/** Peak point (max elevation at actual azimuth from API) */
const peakPoint = computed(() => {
  if (props.maxElevation === null || props.maxElevation === undefined) return null

  // Use actual maxAzimuth from API if available, otherwise calculate as fallback
  let peakAzimuth
  if (props.maxAzimuth !== null && props.maxAzimuth !== undefined) {
    peakAzimuth = props.maxAzimuth
  } else if (props.startAzimuth !== null && props.endAzimuth !== null) {
    // Fallback: Calculate peak azimuth (midpoint between start and end)
    peakAzimuth = (props.startAzimuth + props.endAzimuth) / 2

    // Handle wraparound: if the arc crosses 0°/360°, adjust the peak
    if (Math.abs(props.endAzimuth - props.startAzimuth) > 180) {
      if (props.endAzimuth > props.startAzimuth) {
        peakAzimuth = ((props.startAzimuth + props.endAzimuth + 360) / 2) % 360
      } else {
        peakAzimuth = ((props.startAzimuth + props.endAzimuth - 360) / 2 + 360) % 360
      }
    }
  } else {
    return null
  }

  return polarToCartesian(peakAzimuth, props.maxElevation)
})

// ============================================================================
// Computed Properties - Paths
// ============================================================================

/**
 * Predicted path arc - draws circular arc through entry → peak → exit
 * Uses true circular arc calculation (like compass drawing)
 * For geostationary satellites, returns null (no path needed)
 * 
 * IMPORTANT: Path is calculated from pass start time (entry), not from tab open time
 */
const predictedPath = computed(() => {
  // Don't show path for geostationary satellites (they don't move)
  if (isGeostationary.value) return null
  if (!entryPoint.value || !peakPoint.value || !exitPoint.value) return null

  const p1 = entryPoint.value
  const p2 = peakPoint.value
  const p3 = exitPoint.value

  // Calculate circle center through three points
  const center = getCircleCenter(p1, p2, p3)

  if (!center) {
    // Points are collinear - draw straight lines
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }

  // Calculate radius and angles
  const radius = Math.hypot(p1.x - center.x, p1.y - center.y)
  const angle1 = Math.atan2(p1.y - center.y, p1.x - center.x)
  const angle2 = Math.atan2(p2.y - center.y, p2.x - center.x)
  const angle3 = Math.atan2(p3.y - center.y, p3.x - center.x)

  // Determine arc direction (counter-clockwise or clockwise)
  const isCounterClockwise = (a1, a2, a3) => {
    let diff1 = a2 - a1
    let diff2 = a3 - a2

    while (diff1 < 0) diff1 += 2 * Math.PI
    while (diff2 < 0) diff2 += 2 * Math.PI

    return (diff1 + diff2) < 2 * Math.PI
  }

  const ccw = isCounterClockwise(angle1, angle2, angle3)

  // For SVG, sweep-flag: 0 = counter-clockwise, 1 = clockwise
  const sweepFlag = ccw ? 1 : 0

  // Check if we need the large arc (> 180 degrees)
  let totalAngle = Math.abs(angle3 - angle1)
  if (totalAngle > Math.PI) {
    totalAngle = 2 * Math.PI - totalAngle
  }
  const largeArcFlag = totalAngle > Math.PI ? 1 : 0

  // ALWAYS draw the full predicted path from entry to exit
  // The predicted path represents the complete pass trajectory, regardless of:
  // - Whether the pass has started
  // - Whether the satellite is currently passing
  // - When the tab was opened
  // This ensures consistent visualization whether viewing before, during, or after the pass
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${p3.x} ${p3.y}`
})

/** 
 * Combined actual path (past + future positions from API) - dashed green line
 * When tab opens mid-pass, we need to combine past and future positions
 * to show the complete actual path the satellite has taken and will take
 * 
 * IMPORTANT: Uses timestamp to properly merge and sort positions, removing duplicates
 */
const futurePath = computed(() => {
  // Combine past and future positions to show complete actual path
  const allActualPositions = []
  const seenTimestamps = new Set()
  
  // Add past positions (already traveled path)
  if (props.pastPositions && props.pastPositions.length > 0) {
    props.pastPositions.forEach(pos => {
      // Remove duplicates based on timestamp (within 100ms tolerance)
      const roundedTimestamp = Math.round(pos.timestamp / 100) * 100
      if (!seenTimestamps.has(roundedTimestamp)) {
        seenTimestamps.add(roundedTimestamp)
        allActualPositions.push(pos)
      }
    })
  }
  
  // Add future positions (upcoming path)
  if (props.futurePositions && props.futurePositions.length > 0) {
    props.futurePositions.forEach(pos => {
      // Remove duplicates based on timestamp (within 100ms tolerance)
      const roundedTimestamp = Math.round(pos.timestamp / 100) * 100
      if (!seenTimestamps.has(roundedTimestamp)) {
        seenTimestamps.add(roundedTimestamp)
        allActualPositions.push(pos)
      }
    })
  }
  
  // Need at least 2 positions to draw a path
  if (allActualPositions.length < 2) return null
  
  // Sort by timestamp to ensure proper path order (chronological)
  const sortedPositions = [...allActualPositions].sort((a, b) => a.timestamp - b.timestamp)
  
  return generatePathWithWraparound(sortedPositions)
})
</script>

<style scoped>
.polar-plot-container {
  @apply bg-space-900 border border-space-600 rounded-lg p-4;
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

