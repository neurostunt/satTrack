<template>
  <div class="max-w-lg mx-auto mb-6">
    <!-- Visualization Canvas -->
    <canvas
      ref="canvasRef"
      :width="canvasSize"
      :height="canvasSize"
      class="w-full h-full"
    ></canvas>

    <!-- Loading State -->
    <div v-if="isCalculating" class="absolute inset-0 flex items-center justify-center bg-space-900/80 backdrop-blur-sm">
      <div class="text-center">
        <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <div class="text-space-300 text-sm">Calculating satellite path...</div>
      </div>
    </div>

      <!-- Pass Details -->
      <div v-if="selectedPass" class="mt-4 p-3 bg-space-900 border border-space-600 rounded">
        <!-- Real-time info only when satellite is in active pass -->
        <div v-if="currentSatellitePosition" class="text-lg text-space-300 mb-2">
          <span class="text-space-400">Heading:</span>
          <span class="text-space-200 ml-1 font-semibold">{{ currentSatellitePosition.azimuth.toFixed(1) }}°</span>
          <span class="text-space-400 ml-4">Elevation:</span>
          <span class="text-space-200 ml-1 font-semibold">{{ currentSatellitePosition.elevation.toFixed(1) }}°</span>
        </div>

        <!-- Debug info -->
        <div v-if="!currentSatellitePosition" class="text-xs text-space-500 mb-2">
          No active pass - currentSatellitePosition: {{ currentSatellitePosition }}
        </div>

        <!-- Pass timing info -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-space-400">To Peak:</span>
            <span class="text-space-200 ml-1 font-semibold">{{ timeToPeak }}</span>
          </div>
          <div>
            <span class="text-space-400">To End:</span>
            <span class="text-space-200 ml-1 font-semibold">{{ timeToEnd }}</span>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  passes: {
    type: Array,
    default: () => []
  },
  userLocation: {
    type: Object,
    required: true
  }
})

const canvasRef = ref(null)
const canvasSize = ref(320)
const selectedPass = ref(null)
const animationFrame = ref(null)
const isCalculating = ref(false)
const calculatedPasses = ref([])
const currentSatellitePosition = ref(null)

// Computed properties
const activePasses = computed(() => {
  const now = new Date()
  return props.passes.filter(pass => {
    const startTime = new Date(pass.startTime)
    const endTime = new Date(pass.endTime)
    return startTime <= now && now <= endTime
  })
})

const upcomingPasses = computed(() => {
  const now = new Date()
  return props.passes.filter(pass => {
    const startTime = new Date(pass.startTime)
    return startTime > now
  })
})

const timeToPeak = computed(() => {
  if (!selectedPass.value) return 'N/A'

  const now = new Date()
  const peakTime = new Date(selectedPass.value.maxElevationTime)
  const diffMs = peakTime.getTime() - now.getTime()

  if (diffMs <= 0) return 'Peak passed'

  const minutes = Math.floor(diffMs / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
})

const timeToEnd = computed(() => {
  if (!selectedPass.value) return 'N/A'

  const now = new Date()
  const endTime = new Date(selectedPass.value.endTime)
  const diffMs = endTime.getTime() - now.getTime()

  if (diffMs <= 0) return 'Pass ended'

  const minutes = Math.floor(diffMs / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
})

// Drawing functions
const drawCircle = (ctx, centerX, centerY, radius, color, lineWidth = 1) => {
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

const drawElevationCircles = (ctx, centerX, centerY) => {
  const maxRadius = Math.min(centerX, centerY) - 20

  // Draw elevation circles (90°, 45°, 0°)
  drawCircle(ctx, centerX, centerY, maxRadius * 0.1, '#4B5563', 1) // 90° (zenith)
  drawCircle(ctx, centerX, centerY, maxRadius * 0.5, '#4B5563', 1) // 45°
  drawCircle(ctx, centerX, centerY, maxRadius, '#4B5563', 1) // 0° (horizon)

  // Draw North indicator "N" on canvas
  ctx.fillStyle = '#6B7280'
  ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', centerX, centerY - maxRadius - 15)
}

const drawSatellitePath = (ctx, centerX, centerY, pass, color, now) => {
  const startTime = new Date(pass.startTime)
  const endTime = new Date(pass.endTime)

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 2

  // Draw path based on current time
  if (now < startTime) {
    // Future pass - draw full path
    drawFullPath(ctx, centerX, centerY, pass)
  } else if (now > endTime) {
    // Past pass - draw full path
    drawFullPath(ctx, centerX, centerY, pass)
  } else {
    // Current pass - draw full path but highlight current position
    drawFullPath(ctx, centerX, centerY, pass)
  }

  ctx.stroke()
}

const drawFullPath = (ctx, centerX, centerY, pass) => {
  const steps = 50
  const startTime = new Date(pass.startTime)
  const endTime = new Date(pass.endTime)
  const duration = endTime.getTime() - startTime.getTime()

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps
    const point = calculateRealTimePosition(pass, progress, startTime, endTime)

    if (i === 0) {
      ctx.moveTo(centerX + point.x, centerY + point.y)
    } else {
      ctx.lineTo(centerX + point.x, centerY + point.y)
    }
  }
}

const drawPartialPath = (ctx, centerX, centerY, pass, now) => {
  const startTime = new Date(pass.startTime)
  const endTime = new Date(pass.maxElevationTime)
  const duration = endTime.getTime() - startTime.getTime()
  const elapsed = now.getTime() - startTime.getTime()
  const progress = elapsed / duration

  const steps = Math.floor(progress * 50)

  for (let i = 0; i <= steps; i++) {
    const stepProgress = i / 50
    const point = calculateRealTimePosition(pass, stepProgress, startTime, endTime)

    if (i === 0) {
      ctx.moveTo(centerX + point.x, centerY + point.y)
    } else {
      ctx.lineTo(centerX + point.x, centerY + point.y)
    }
  }
}

const calculatePathPoints = (pass) => {
  const points = []
  const startTime = new Date(pass.startTime)
  const endTime = new Date(pass.endTime)
  const duration = endTime.getTime() - startTime.getTime()
  const steps = 50 // More steps for smoother line

  const maxRadius = Math.min(canvasSize.value / 2, canvasSize.value / 2) - 20

  // Calculate orbital parameters for more realistic path
  const maxElevation = pass.maxElevation
  const peakTime = new Date(pass.maxElevationTime)
  const peakProgress = (peakTime.getTime() - startTime.getTime()) / duration

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps
    const currentTime = new Date(startTime.getTime() + duration * progress)

    // More realistic elevation calculation using orbital mechanics
    const elevation = calculateRealisticElevation(pass, progress, peakProgress, maxElevation)

    // Convert elevation to radius (0° = max radius, 90° = 0 radius)
    const radius = maxRadius * (1 - elevation / 90)

    // Calculate azimuth based on satellite orbital direction
    const azimuth = calculateRealisticAzimuth(pass, progress, peakProgress)

    // Convert to Cartesian coordinates (top = North, right = East)
    // Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
    const x = radius * Math.sin(azimuth * Math.PI / 180)  // East-West
    const y = -radius * Math.cos(azimuth * Math.PI / 180) // North-South (negative because canvas Y increases downward)

    points.push({ x, y, elevation, azimuth, time: currentTime })
  }

  return points
}

const calculateRealisticElevation = (pass, progress, peakProgress, maxElevation) => {
  // Use parabolic curve for elevation - peaks at the middle
  const distanceFromPeak = Math.abs(progress - peakProgress)
  const normalizedDistance = distanceFromPeak / Math.max(peakProgress, 1 - peakProgress)

  // Parabolic elevation curve
  const elevation = maxElevation * (1 - normalizedDistance * normalizedDistance)

  // Ensure elevation doesn't go below horizon
  return Math.max(elevation, 0)
}

const calculateRealisticAzimuth = (pass, progress, peakProgress) => {
  // Satellite azimuth calculation with compass orientation (top = North)
  // Azimuth: 0° = North, 90° = East, 180° = South, 270° = West

  // Add some variation based on satellite characteristics
  const noradId = parseInt(pass.noradId)
  const isRetrograde = noradId % 2 === 0 // Simple variation based on NORAD ID

  let startAzimuth, endAzimuth

  if (isRetrograde) {
    // Retrograde orbit (West to East)
    startAzimuth = 270 // West
    endAzimuth = 90    // East
  } else {
    // Prograde orbit (East to West)
    startAzimuth = 90  // East
    endAzimuth = 270   // West
  }

  // Add orbital inclination variation
  const inclination = (noradId % 180) // 0-179 degrees
  const azimuthOffset = Math.sin(inclination * Math.PI / 180) * 30 // ±30° variation

  // Linear interpolation for azimuth with offset
  const baseAzimuth = startAzimuth + (endAzimuth - startAzimuth) * progress
  const azimuth = baseAzimuth + azimuthOffset

  // Normalize to 0-360 range
  return ((azimuth % 360) + 360) % 360
}

const calculateAzimuthAtTime = (pass, progress) => {
  // Simplified azimuth calculation - assume satellite moves from East to West
  return 90 + (progress - 0.5) * 180 // Start at 90° (East), end at 270° (West)
}

const calculatePassesAsync = async () => {
  if (isCalculating.value) return

  isCalculating.value = true
  calculatedPasses.value = []

  try {
    // Calculate path points for each pass asynchronously
    const promises = props.passes.map(async (pass) => {
      return new Promise((resolve) => {
        // Use setTimeout to make it async
        setTimeout(() => {
          const pathPoints = calculatePathPoints(pass)
          resolve({ ...pass, pathPoints })
        }, 0)
      })
    })

    const results = await Promise.all(promises)
    calculatedPasses.value = results
  } finally {
    isCalculating.value = false
  }
}

const drawVisualization = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const centerX = canvasSize.value / 2
  const centerY = canvasSize.value / 2

  // Clear canvas
  ctx.clearRect(0, 0, canvasSize.value, canvasSize.value)

  // Draw elevation circles
  drawElevationCircles(ctx, centerX, centerY)

  // Reset current satellite position
  currentSatellitePosition.value = null


  // Draw satellite paths
  calculatedPasses.value.forEach((pass, index) => {
    const now = new Date()
    const startTime = new Date(pass.startTime)
    const endTime = new Date(pass.endTime)

    let color = '#6B7280' // Default gray

    if (startTime <= now && now <= endTime) {
      color = '#3B82F6' // Blue for current pass
    } else if (startTime > now) {
      color = '#10B981' // Green for upcoming pass
    } else {
      color = '#6B7280' // Gray for past pass
    }

    // Draw the path
    drawSatellitePath(ctx, centerX, centerY, pass, color, now)

    // Draw current position if pass is active and update real-time data
    if (startTime <= now && now <= endTime) {
      const passEndTime = new Date(pass.endTime)
      const progress = (now.getTime() - startTime.getTime()) / (passEndTime.getTime() - startTime.getTime())


      // Calculate real-time position instead of using pre-calculated points
      const realTimePoint = calculateRealTimePosition(pass, progress, startTime, passEndTime)

      if (realTimePoint) {
        // Update real-time position data only for selected pass
        if (selectedPass.value && selectedPass.value.noradId === pass.noradId) {
          currentSatellitePosition.value = {
            azimuth: realTimePoint.azimuth,
            elevation: realTimePoint.elevation
          }

        }

        // Draw current position on canvas
        ctx.beginPath()
        ctx.arc(centerX + realTimePoint.x, centerY + realTimePoint.y, 4, 0, 2 * Math.PI)
        ctx.fillStyle = '#F59E0B' // Orange for current position
        ctx.fill()
      }
    }
  })
}

const calculateRealTimePosition = (pass, progress, startTime, endTime) => {

  const maxRadius = Math.min(canvasSize.value / 2, canvasSize.value / 2) - 20

  // Calculate orbital parameters for more realistic path
  const maxElevation = pass.maxElevation
  const peakTime = new Date(pass.maxElevationTime)
  const peakProgress = (peakTime.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())


  // More realistic elevation calculation using orbital mechanics
  const elevation = calculateRealisticElevation(pass, progress, peakProgress, maxElevation)

  // Convert elevation to radius (0° = max radius, 90° = 0 radius)
  const radius = maxRadius * (1 - elevation / 90)

  // Calculate azimuth based on satellite orbital direction
  const azimuth = calculateRealisticAzimuth(pass, progress, peakProgress)

  // Convert to Cartesian coordinates (top = North, right = East)
  // Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
  const x = radius * Math.sin(azimuth * Math.PI / 180)  // East-West
  const y = -radius * Math.cos(azimuth * Math.PI / 180) // North-South (negative because canvas Y increases downward)

  return { x, y, elevation, azimuth }
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}


// Lifecycle
onMounted(async () => {
  // Set selectedPass to the first pass if available
  if (props.passes && props.passes.length > 0) {
    selectedPass.value = props.passes[0]
    console.log('Selected pass set to:', selectedPass.value.name)
  }

  await calculatePassesAsync()
  animate()
})

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})

// Animation loop
const animate = () => {
  drawVisualization()
  animationFrame.value = requestAnimationFrame(animate)
}

onMounted(() => {
  animate()
})
</script>
