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
            :current-elevation="isGeostationarySatellite ? (geostationaryPosition?.elevation || 0) : (currentPosition?.elevation || 0)"
            :current-azimuth="isGeostationarySatellite ? (geostationaryPosition?.azimuth || 0) : (currentPosition?.azimuth || 0)"
            :current-distance="isGeostationarySatellite ? (geostationaryPosition?.distance || 0) : (currentPosition?.distance || 0)"
            :distance-units="settings.distanceUnits || 'km'"
            :past-positions="pastPositions"
            :future-positions="futurePositions"
            :start-azimuth="pass.startAzimuth"
            :end-azimuth="pass.endAzimuth"
            :max-elevation="pass.maxElevation"
            :max-azimuth="pass.maxAzimuth"
            :norad-id="pass.noradId"
          />
        </div>

        <!-- Pass Details -->
        <PassPredictPassDetails
          :pass="pass"
          :get-satellite-data="getSatelliteData"
          :format-pass-time="formatPassTime"
          :format-pass-duration="formatPassDuration"
          :format-time-until-pass="formatTimeUntilPass"
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

// Get distance units from settings
const { settings } = useSettings()

// Import pass status composable for geostationary detection
const { isGeostationary: checkIsGeostationary } = usePassStatus()

// Check if satellite is geostationary based on pass characteristics
const isGeostationarySatellite = computed(() => {
  return checkIsGeostationary(props.pass)
})

// For geostationary satellites, store position
const geostationaryPosition = ref(null)

// Computed: Should we show the visualization?
const showVisualization = computed(() => {
  if (!props.isExpanded) return false
  
  // For geostationary: only show if we have position and it's above horizon
  if (isGeostationarySatellite.value) {
    return geostationaryPosition.value && geostationaryPosition.value.elevation > 0
  }
  
  // For regular satellites: always show when expanded
  return true
})

// Computed: Past positions for drawing
const pastPositions = computed(() => {
  return getPastPositions(positionHistory.value)
})

// Fetch geostationary satellite position (once)
const fetchGeostationaryPosition = async () => {
  if (!settings.value.n2yoApiKey) return
  
  try {
    console.log(`🛰️ Fetching geostationary position for ${props.pass.satelliteName}`)
    const { getSatellitePositions } = useN2YO()
    
    const positions = await getSatellitePositions(
      props.pass.noradId,
      settings.value.observationLocation.latitude,
      settings.value.observationLocation.longitude,
      settings.value.observationLocation.altitude || 0,
      1, // Just 1 second (current position)
      settings.value.n2yoApiKey
    )
    
    if (positions && positions.length > 0) {
      geostationaryPosition.value = positions[0]
      console.log(`✅ Geostationary position:`, positions[0])
    }
  } catch (error) {
    console.error(`❌ Failed to fetch geostationary position:`, error)
  }
}

// Watch for card expansion and pass status
// IMPORTANT: Only track when BOTH conditions are met:
// 1. Card is expanded (user clicked to view details)
// 2. Satellite is actively passing (within pass window)
watch([() => props.isExpanded, () => props.isPassing], async ([expanded, passing], [prevExpanded, prevPassing]) => {
  // Special handling for geostationary satellites
  if (isGeostationarySatellite.value) {
    if (expanded && !geostationaryPosition.value) {
      await fetchGeostationaryPosition()
    }
    return // Don't use regular tracking for geostationary
  }
  
  const shouldTrack = expanded && passing
  const wasTracking = isTracking.value
  
  if (shouldTrack && !wasTracking) {
    // Card is open AND satellite is passing - start real-time tracking
    console.log(`🎯 Starting real-time tracking for ${props.pass.satelliteName}`)
    console.log(`   ✓ Card expanded: ${expanded}`)
    console.log(`   ✓ Satellite passing: ${passing}`)
    console.log(`   → API calls will be made every 270 seconds (4.5 min)`)
    
    // Validate settings before starting
    if (!settings.value.n2yoApiKey) {
      console.warn(`⚠️ N2YO API key not configured - cannot start tracking`)
      return
    }
    
    await startTracking(
      props.pass.noradId,
      settings.value.observationLocation.latitude,
      settings.value.observationLocation.longitude,
      settings.value.observationLocation.altitude || 0,
      settings.value.n2yoApiKey
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
