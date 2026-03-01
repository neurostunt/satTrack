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

<script setup>
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

const center = 200
const { backgroundSVG, elevationToRadius } = usePolarPlotBackground()
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

const isGeostationary = computed(() => {
  if (props.startAzimuth !== null && props.endAzimuth !== null) {
    const azimuthDiff = Math.abs(props.startAzimuth - props.endAzimuth)
    return azimuthDiff < 5
  }
  return false
})

const degreesToRadians = (degrees) => {
  return (degrees * Math.PI) / 180
}

const normalizeAzimuth = (azimuth) => {
  return ((azimuth % 360) + 360) % 360
}

const polarToCartesian = (azimuth, elevation) => {
  const r = elevationToRadius(elevation)
  const angleRad = degreesToRadians(azimuth)

  return {
    x: center + r * Math.sin(angleRad),
    y: center - r * Math.cos(angleRad)
  }
}

const getCircleCenter = (p1, p2, p3) => {
  const ax = p1.x, ay = p1.y
  const bx = p2.x, by = p2.y
  const cx = p3.x, cy = p3.y

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  if (Math.abs(d) < 0.0001) return null

  const ux = (
    (ax * ax + ay * ay) * (by - cy) +
    (bx * bx + by * by) * (cy - ay) +
    (cx * cx + cy * cy) * (ay - by)
  ) / d

  const uy = (
    (ax * ax + ay * ay) * (cx - bx) +
    (bx * bx + by * by) * (ax - cx) +
    (cx * cx + cy * cy) * (bx - ax)
  ) / d

  return { x: ux, y: uy }
}

const generatePathWithWraparound = (positions) => {
  if (!positions || positions.length < 2) return null

  const segments = []
  let currentSegment = []

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]
    currentSegment.push(pos)

    if (i < positions.length - 1) {
      const nextPos = positions[i + 1]
      const azDiff = Math.abs(nextPos.azimuth - pos.azimuth)

      if (azDiff > 180) {
        segments.push([...currentSegment])
        currentSegment = []
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

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

const peakAzimuth = computed(() => {
  if (props.maxElevation === null || props.maxElevation === undefined) return null

  if (props.maxAzimuth !== null && props.maxAzimuth !== undefined) {
    return normalizeAzimuth(props.maxAzimuth)
  }

  if (props.startAzimuth !== null && props.endAzimuth !== null) {
    let peakAzimuthValue = (props.startAzimuth + props.endAzimuth) / 2

    if (Math.abs(props.endAzimuth - props.startAzimuth) > 180) {
      if (props.endAzimuth > props.startAzimuth) {
        peakAzimuthValue = ((props.startAzimuth + props.endAzimuth + 360) / 2) % 360
      } else {
        peakAzimuthValue = ((props.startAzimuth + props.endAzimuth - 360) / 2 + 360) % 360
      }
    }

    return normalizeAzimuth(peakAzimuthValue)
  }

  return null
})

const peakPoint = computed(() => {
  const peakAzimuthValue = peakAzimuth.value
  if (peakAzimuthValue === null) return null
  return polarToCartesian(peakAzimuthValue, props.maxElevation)
})

const predictedPath = computed(() => {
  if (isGeostationary.value) return null
  if (!entryPoint.value || !peakPoint.value || !exitPoint.value) return null

  const p1 = entryPoint.value
  const p2 = peakPoint.value
  const p3 = exitPoint.value

  const cc = getCircleCenter(p1, p2, p3)
  if (!cc) {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }

  const arcR = Math.hypot(p1.x - cc.x, p1.y - cc.y)

  let angle1 = Math.atan2(p1.y - cc.y, p1.x - cc.x)
  let angle2 = Math.atan2(p2.y - cc.y, p2.x - cc.x)
  let angle3 = Math.atan2(p3.y - cc.y, p3.x - cc.x)

  const unwrap = (base, a) => {
    while (a - base > Math.PI) a -= 2 * Math.PI
    while (a - base < -Math.PI) a += 2 * Math.PI
    return a
  }
  angle2 = unwrap(angle1, angle2)
  angle3 = unwrap(angle2, angle3)

  const d12 = angle2 - angle1
  const d23 = angle3 - angle2
  const sweepSign = d12 >= 0 ? 1 : -1

  const delta = 40 / arcR
  const preAngle = angle1 - sweepSign * delta
  const postAngle = angle3 + sweepSign * delta

  const preEntry = { x: cc.x + arcR * Math.cos(preAngle), y: cc.y + arcR * Math.sin(preAngle) }
  const postExit = { x: cc.x + arcR * Math.cos(postAngle), y: cc.y + arcR * Math.sin(postAngle) }

  const sweepFlag = d12 >= 0 ? 1 : 0
  const extSpan = sweepSign > 0 ? postAngle - preAngle : preAngle - postAngle
  const largeArcFlag = (d12 * d23 < 0 || extSpan > Math.PI) ? 1 : 0

  return `M ${preEntry.x} ${preEntry.y} A ${arcR} ${arcR} 0 ${largeArcFlag} ${sweepFlag} ${postExit.x} ${postExit.y}`
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


