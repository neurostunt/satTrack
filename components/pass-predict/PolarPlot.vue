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
  },
  // Whether satellite is currently passing
  isPassing: {
    type: Boolean,
    default: false
  }
})

const center = 200
const { backgroundSVG, elevationToRadius } = usePolarPlotBackground()

const isGeostationary = computed(() => {
  if (props.startAzimuth !== null && props.endAzimuth !== null) {
    const azimuthDiff = Math.abs(props.startAzimuth - props.endAzimuth)
    return azimuthDiff < 5
  }
  return false
})

const formattedDistance = computed(() => {
  let distance = props.currentDistance
  let unit = 'km'

  if (props.distanceUnits === 'miles') {
    distance = distance * 0.621371
    unit = 'mi'
  }

  return `${distance.toFixed(0).padStart(5, ' ')} ${unit}`
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

/**
 * Compute SVG arc path through three points p1 → p2 → p3.
 * Uses monotonic unwrapping to correctly choose largeArcFlag and sweepFlag
 * so the arc always passes through the intermediate point p2.
 */
const computeArcPath = (p1, p2, p3) => {
  const centerPoint = getCircleCenter(p1, p2, p3)
  if (!centerPoint) {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }

  const radius = Math.hypot(p1.x - centerPoint.x, p1.y - centerPoint.y)
  let angle1 = Math.atan2(p1.y - centerPoint.y, p1.x - centerPoint.x)
  let angle2 = Math.atan2(p2.y - centerPoint.y, p2.x - centerPoint.x)
  let angle3 = Math.atan2(p3.y - centerPoint.y, p3.x - centerPoint.x)

  const unwrap = (base, angle) => {
    let a = angle
    while (a - base > Math.PI) a -= 2 * Math.PI
    while (a - base < -Math.PI) a += 2 * Math.PI
    return a
  }
  angle2 = unwrap(angle1, angle2)
  angle3 = unwrap(angle2, angle3)

  const d12 = angle2 - angle1
  const d23 = angle3 - angle2

  let sweepFlag, largeArcFlag
  if (d12 * d23 >= 0) {
    // Monotonic sequence: p2 lies on the direct arc from p1 to p3
    sweepFlag = d12 >= 0 ? 1 : 0
    largeArcFlag = Math.abs(angle3 - angle1) > Math.PI ? 1 : 0
  } else {
    // Non-monotonic: p2 is on the large arc in the direction of d12
    sweepFlag = d12 >= 0 ? 1 : 0
    largeArcFlag = 1
  }

  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${p3.x} ${p3.y}`
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

// Full predicted path with the same circular arc extended beyond AOS/LOS by 40 SVG units
const predictedPath = computed(() => {
  if (isGeostationary.value) return null
  
  // Don't show predicted path for in-transit passes
  // Real-time N2YO data will show the actual path instead
  if (props.isInTransit) return null
  
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

  // Extend the arc by 40 SVG units of arc-length on each side, along the same circle
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

