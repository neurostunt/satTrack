<template>
  <div class="elevation-meter-container">
    <div class="elevation-meter-frame">
      <canvas 
        ref="elevationCanvas" 
        class="elevation-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
      />
      <div class="elevation-label">Elevation Meter</div>
    </div>
  </div>
</template>

<script setup>
const elevationCanvas = ref(null)
const canvasWidth = 400
const canvasHeight = 120
let animationId = null

// Device orientation data
const orientation = ref({
  beta: 0,  // front-to-back tilt (pitch)
  gamma: 0  // left-to-right tilt (roll)
})

// Draw elevation meter
const drawElevationMeter = () => {
  if (!elevationCanvas.value) return
  
  const canvas = elevationCanvas.value
  const ctx = canvas.getContext('2d')
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  
  // Draw horizontal line (horizon)
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(canvasWidth, centerY)
  ctx.stroke()
  
  // Draw elevation markers
  ctx.fillStyle = '#94a3b8'
  ctx.font = '14px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Draw angle markers (-90° to +90°)
  for (let angle = -90; angle <= 90; angle += 15) {
    const x = centerX + (angle / 90) * (canvasWidth / 2)
    const y = centerY - 10
    
    if (x >= 0 && x <= canvasWidth) {
      ctx.fillText(`${angle}°`, x, y)
      
      // Draw tick mark
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, centerY - 5)
      ctx.lineTo(x, centerY + 5)
      ctx.stroke()
    }
  }
  
  // Draw current elevation indicator
  const currentElevation = orientation.value.beta
  const indicatorX = centerX + (currentElevation / 90) * (canvasWidth / 2)
  
  // Clamp to canvas bounds
  const clampedX = Math.max(0, Math.min(canvasWidth, indicatorX))
  
  // Draw elevation indicator (triangle)
  ctx.fillStyle = '#0ea5e9'
  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 3
  
  ctx.beginPath()
  ctx.moveTo(clampedX, centerY - 20)
  ctx.lineTo(clampedX - 12, centerY - 8)
  ctx.lineTo(clampedX + 12, centerY - 8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  
  // Draw current elevation value
  ctx.fillStyle = '#ffffff'
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`${Math.round(currentElevation)}°`, clampedX, centerY - 35)
  
  // Draw level indicator (0°)
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(centerX - 10, centerY)
  ctx.lineTo(centerX + 10, centerY)
  ctx.stroke()
}

// Handle device orientation
const handleOrientation = (event) => {
  orientation.value = {
    beta: event.beta || 0,
    gamma: event.gamma || 0
  }
  drawElevationMeter()
}

// Animation loop
const animate = () => {
  drawElevationMeter()
  animationId = requestAnimationFrame(animate)
}

onMounted(() => {
  // Request permission for device orientation
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation)
        }
      })
  } else {
    // For browsers that don't require permission
    window.addEventListener('deviceorientation', handleOrientation)
  }
  
  // Start animation
  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('deviceorientation', handleOrientation)
})
</script>

<style scoped>
.elevation-meter-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 10px 0;
}

.elevation-meter-frame {
  position: relative;
  border: 2px dashed #64748b;
  border-radius: 8px;
  padding: 8px;
  background: rgba(30, 41, 59, 0.5);
}

.elevation-canvas {
  display: block;
  border-radius: 4px;
}

.elevation-label {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffffff;
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
}
</style>
