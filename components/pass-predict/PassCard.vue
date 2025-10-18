<template>
  <div
    class="bg-space-900 border border-space-600 rounded p-3"
    :class="{ 
      'bg-space-800': isExpanded,
      'passing-card': isPassing
    }"
  >
    <!-- Clickable Header -->
    <PassPredictPassHeader
      :pass="pass"
      :is-expanded="isExpanded"
      :is-passing="isPassing"
      :format-time-until-pass="formatTimeUntilPass"
      :get-pass-status="getPassStatus"
      @toggle="toggleExpanded"
    />

    <!-- Collapsible Content -->
    <Transition
      name="slide-down"
      enter-active-class="transition-all duration-700 ease-out"
      leave-active-class="transition-all duration-500 ease-in"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[2000px] opacity-100"
      leave-from-class="max-h-[2000px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-show="isExpanded"
        class="overflow-hidden"
      >
        <!-- Real-time Position Visualization (shown when passing) -->
        <div v-if="showVisualization" class="mb-4">
          <PassPredictPolarPlot
            :satellite-name="pass.satelliteName"
            :current-elevation="currentPosition?.elevation || 0"
            :current-azimuth="currentPosition?.azimuth || 0"
            :past-positions="pastPositions"
            :future-positions="futurePositions"
            :start-azimuth="pass.startAzimuth"
            :end-azimuth="pass.endAzimuth"
            :max-elevation="pass.maxElevation"
          />
        </div>

        <!-- Pass Details -->
        <PassPredictPassDetails
          :pass="pass"
          :get-t-l-e-data="getTLEData"
          :get-satellite-data="getSatelliteData"
          :format-pass-time="formatPassTime"
          :format-pass-duration="formatPassDuration"
          :format-time-until-pass="formatTimeUntilPass"
          :get-pass-status="getPassStatus"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  pass: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  isPassing: {
    type: Boolean,
    default: false
  },
  formatTimeUntilPass: {
    type: Function,
    required: true
  },
  getPassStatus: {
    type: Function,
    required: true
  },
  getTLEData: {
    type: Function,
    required: true
  },
  getSatelliteData: {
    type: Function,
    required: true
  },
  formatPassTime: {
    type: Function,
    required: true
  },
  formatPassDuration: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['toggle'])

const toggleExpanded = () => {
  emit('toggle')
}

// Real-time position tracking (only when passing)
const {
  currentPosition,
  positionHistory,
  futurePositions,
  isTracking,
  startTracking,
  stopTracking
} = useRealTimePosition()

const {
  shouldShowRealTimeTracking,
  shouldShowPredictedPath,
  getPastPositions,
  getFuturePositions
} = useSatellitePath(ref(props.pass))

// Computed: Should we show the visualization?
const showVisualization = computed(() => {
  // Always show when card is expanded
  return props.isExpanded
})

// Computed: Past positions for drawing
const pastPositions = computed(() => {
  return getPastPositions(positionHistory.value)
})

// Watch for card expansion and pass status
// IMPORTANT: Only track when BOTH conditions are met:
// 1. Card is expanded (user clicked to view details)
// 2. Satellite is actively passing (within pass window)
watch([() => props.isExpanded, () => props.isPassing], async ([expanded, passing], [prevExpanded, prevPassing]) => {
  const shouldTrack = expanded && passing
  const wasTracking = isTracking.value
  
  if (shouldTrack && !wasTracking) {
    // Card is open AND satellite is passing - start real-time tracking
    console.log(`🎯 Starting real-time tracking for ${props.pass.satelliteName}`)
    console.log(`   ✓ Card expanded: ${expanded}`)
    console.log(`   ✓ Satellite passing: ${passing}`)
    console.log(`   → API calls will be made every 270 seconds (4.5 min)`)
    
    const settings = useSettings()
    await settings.loadSettings()
    
    // Validate settings before starting
    if (!settings.settings.value.n2yoApiKey) {
      console.warn(`⚠️ N2YO API key not configured - cannot start tracking`)
      return
    }
    
    await startTracking(
      props.pass.noradId,
      settings.settings.value.observationLocation.latitude,
      settings.settings.value.observationLocation.longitude,
      settings.settings.value.observationLocation.altitude || 0,
      settings.settings.value.n2yoApiKey
    )
  } else if (!shouldTrack && wasTracking) {
    // Card closed OR pass ended - stop tracking to save API calls
    const reason = !expanded ? 'Card collapsed' : 'Pass ended'
    console.log(`🛑 Stopping tracking for ${props.pass.satelliteName}: ${reason}`)
    console.log(`   → Saving API quota (was making calls every 270s)`)
    stopTracking()
  }
  
  // Debug logging for state changes without tracking changes
  if (!shouldTrack && !wasTracking && (expanded !== prevExpanded || passing !== prevPassing)) {
    if (!expanded) {
      console.log(`💤 ${props.pass.satelliteName}: Card collapsed - no tracking`)
    } else if (!passing) {
      console.log(`⏳ ${props.pass.satelliteName}: Not yet passing - no tracking`)
    }
  }
}, { immediate: false })

// Cleanup when component is unmounted
onUnmounted(() => {
  if (isTracking.value) {
    console.log(`🧹 Component unmounted - stopping tracking for ${props.pass.satelliteName}`)
    stopTracking()
  }
})
</script>
