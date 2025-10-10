<template>
  <div class="performance-monitor" v-if="showMonitor">
    <div class="performance-header">
      <h3 class="text-sm font-semibold text-primary-400">Performance Monitor</h3>
      <button 
        @click="toggleMonitor"
        class="text-space-400 hover:text-space-300 text-xs"
      >
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>
    
    <div v-if="isExpanded" class="performance-content">
      <!-- Calculation Performance -->
      <div class="metric-group">
        <h4 class="metric-title">Calculations</h4>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">Time:</span>
            <span class="metric-value">{{ metrics.performance.calculationTime.toFixed(2) }}ms</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Total:</span>
            <span class="metric-value">{{ metrics.performance.totalCalculations }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Interval:</span>
            <span class="metric-value">{{ metrics.performance.updateInterval }}ms</span>
          </div>
        </div>
      </div>

      <!-- Cache Performance -->
      <div class="metric-group">
        <h4 class="metric-title">Cache Performance</h4>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">Hit Rate:</span>
            <span class="metric-value">{{ metrics.mainThread?.cacheHitRate?.toFixed(1) || 0 }}%</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">SatRec Cache:</span>
            <span class="metric-value">{{ metrics.mainThread?.satrecCacheSize || 0 }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Calc Cache:</span>
            <span class="metric-value">{{ metrics.mainThread?.calculationCacheSize || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Worker Performance -->
      <div class="metric-group" v-if="metrics.performance.workerEnabled">
        <h4 class="metric-title">Web Worker</h4>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">Status:</span>
            <span class="metric-value text-green-400">Active</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Hit Rate:</span>
            <span class="metric-value">{{ metrics.worker?.cacheHitRate?.toFixed(1) || 0 }}%</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Calculations:</span>
            <span class="metric-value">{{ metrics.worker?.calculationCount || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- TLE Data Status -->
      <div class="metric-group">
        <h4 class="metric-title">TLE Data</h4>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">Status:</span>
            <span class="metric-value" :class="{
              'text-green-400': metrics.tleData.isFresh,
              'text-yellow-400': !metrics.tleData.isFresh && metrics.tleData.age !== null,
              'text-red-400': metrics.tleData.age === null
            }">
              {{ metrics.cacheStatus }}
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Age:</span>
            <span class="metric-value">{{ metrics.tleData.age || 0 }} min</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Offline:</span>
            <span class="metric-value" :class="metrics.tleData.isOffline ? 'text-yellow-400' : 'text-green-400'">
              {{ metrics.tleData.isOffline ? 'Yes' : 'No' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Performance Actions -->
      <div class="performance-actions">
        <button 
          @click="refreshMetrics"
          class="btn-secondary text-xs px-2 py-1"
          :disabled="isRefreshing"
        >
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button 
          @click="clearCaches"
          class="text-red-300 hover:text-red-200 text-xs px-2 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
        >
          Clear Caches
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  metrics: {
    type: Object,
    required: true
  },
  onRefresh: {
    type: Function,
    required: true
  },
  onClearCaches: {
    type: Function,
    required: true
  }
})

// State
const showMonitor = ref(false)
const isExpanded = ref(false)
const isRefreshing = ref(false)

// Toggle monitor visibility
const toggleMonitor = () => {
  isExpanded.value = !isExpanded.value
}

// Refresh metrics
const refreshMetrics = async () => {
  isRefreshing.value = true
  try {
    await props.onRefresh()
  } finally {
    isRefreshing.value = false
  }
}

// Clear caches
const clearCaches = async () => {
  try {
    await props.onClearCaches()
    await refreshMetrics()
  } catch (error) {
    console.error('Failed to clear caches:', error)
  }
}

// Keyboard shortcut to toggle monitor
const handleKeyPress = (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'P') {
    event.preventDefault()
    showMonitor.value = !showMonitor.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.performance-monitor {
  @apply fixed top-4 right-4 bg-space-800 border border-space-700 rounded-lg p-3 text-xs z-50 max-w-sm;
}

.performance-header {
  @apply flex items-center justify-between mb-2;
}

.performance-content {
  @apply space-y-3;
}

.metric-group {
  @apply space-y-1;
}

.metric-title {
  @apply text-space-300 font-medium;
}

.metric-grid {
  @apply grid grid-cols-3 gap-2;
}

.metric-item {
  @apply flex flex-col space-y-0.5;
}

.metric-label {
  @apply text-space-400 text-xs;
}

.metric-value {
  @apply text-space-200 font-mono text-xs;
}

.performance-actions {
  @apply flex gap-2 pt-2 border-t border-space-700;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .performance-monitor {
    @apply top-2 right-2 max-w-xs;
  }
  
  .metric-grid {
    @apply grid-cols-2;
  }
}
</style>
