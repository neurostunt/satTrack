<template>
  <div class="compass-container">
    <div class="compass-frame">
      <canvas 
        ref="compassCanvas" 
        class="compass-canvas"
        :width="canvasSize"
        :height="canvasSize"
      />
      <div class="compass-label">N</div>
    </div>
  </div>
</template>

<script setup>
const compassCanvas = ref(null)
const canvasSize = 280
let animationId = null

// Device orientation data (for tilt only)
const orientation = ref({
  alpha: 0, // not used for compass (GPS heading used instead)
  beta: 0,  // front-to-back tilt
  gamma: 0  // left-to-right tilt
})

// GPS heading for compass
const gpsHeading = ref(0)

// Draw compass
const drawCompass = () => {
  if (!compassCanvas.value) return
  
  const canvas = compassCanvas.value
  const ctx = canvas.getContext('2d')
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2
  const radius = 110
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasSize, canvasSize)
  
  // Draw compass circle
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.stroke()
  
  // Draw cardinal directions
  ctx.fillStyle = '#ffffff'
  ctx.font = '20px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  const directions = ['N', 'E', 'S', 'W']
  directions.forEach((dir, index) => {
    const angle = (index * 90) * Math.PI / 180
    const x = centerX + Math.cos(angle) * (radius - 20)
    const y = centerY + Math.sin(angle) * (radius - 20)
    ctx.fillText(dir, x, y)
  })
  
  // Draw compass needle (arrow) using GPS heading
  ctx.strokeStyle = '#0ea5e9'
  ctx.fillStyle = '#0ea5e9'
  ctx.lineWidth = 3
  
  const needleAngle = (gpsHeading.value * Math.PI / 180) - Math.PI / 2
  const needleLength = 80
  
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(
    centerX + Math.cos(needleAngle) * needleLength,
    centerY + Math.sin(needleAngle) * needleLength
  )
  ctx.stroke()
  
  // Draw arrow head
  const headSize = 12
  const headAngle1 = needleAngle - Math.PI / 6
  const headAngle2 = needleAngle + Math.PI / 6
  
  ctx.beginPath()
  ctx.moveTo(
    centerX + Math.cos(needleAngle) * needleLength,
    centerY + Math.sin(needleAngle) * needleLength
  )
  ctx.lineTo(
    centerX + Math.cos(needleAngle) * needleLength + Math.cos(headAngle1) * headSize,
    centerY + Math.sin(needleAngle) * needleLength + Math.sin(headAngle1) * headSize
  )
  ctx.lineTo(
    centerX + Math.cos(needleAngle) * needleLength + Math.cos(headAngle2) * headSize,
    centerY + Math.sin(needleAngle) * needleLength + Math.sin(headAngle2) * headSize
  )
  ctx.closePath()
  ctx.fill()
}

// Handle device orientation
const handleOrientation = (event) => {
  orientation.value = {
    alpha: event.alpha || 0,
    beta: event.beta || 0,
    gamma: event.gamma || 0
  }
  drawCompass()
}

// Animation loop
const animate = () => {
  drawCompass()
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

// Update GPS heading from parent component
const updateGPSHeading = (heading) => {
  gpsHeading.value = heading
  drawCompass()
}

// Expose function to parent
defineExpose({
  updateGPSHeading
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('deviceorientation', handleOrientation)
})
</script>

<style scoped>
.compass-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 10px 0;
}

.compass-frame {
  position: relative;
  border: 2px dashed #64748b;
  border-radius: 8px;
  padding: 8px;
  background: rgba(30, 41, 59, 0.5);
}

.compass-canvas {
  display: block;
  border-radius: 4px;
}

.compass-label {
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
