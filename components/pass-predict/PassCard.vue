<template>
  <div
    class="bg-space-900 border rounded p-3"
    :class="{
      'bg-space-800': isExpanded,
      'passing-card': isPassing,
      'border-green-500': isGeostationarySatellite && isPassing,
      'border-space-600': !(isGeostationarySatellite && isPassing)
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
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 transform scale-y-0 origin-top"
      enter-to-class="opacity-100 transform scale-y-100 origin-top"
      leave-from-class="opacity-100 transform scale-y-100 origin-top"
      leave-to-class="opacity-0 transform scale-y-0 origin-top"
    >
      <div
        v-if="isExpanded"
        class="overflow-hidden"
      >
        <!-- Real-time Position Visualization (shown when passing) -->
        <div v-if="showVisualization" class="mb-4">
          <PassPredictPolarPlot
            :satellite-name="pass.satelliteName"
            :current-elevation="isGeostationarySatellite ? (geostationaryPosition?.elevation || props.pass.maxElevation) : (currentPosition?.elevation || 0)"
            :current-azimuth="isGeostationarySatellite ? (geostationaryPosition?.azimuth || props.pass.maxAzimuth) : (currentPosition?.azimuth || 0)"
            :current-distance="isGeostationarySatellite ? (geostationaryPosition?.distance || 0) : (currentPosition?.distance || 0)"
            :distance-units="settings.distanceUnits || 'km'"
            :past-positions="pastPositions"
            :future-positions="futurePositions"
            :start-azimuth="pass.startAzimuth"
            :end-azimuth="pass.endAzimuth"
            :max-elevation="pass.maxElevation"
            :max-azimuth="pass.maxAzimuth"
            :norad-id="pass.noradId"
            :pass-start-time="pass.startTime"
            :pass-end-time="pass.endTime"
          />
        </div>

        <!-- Pass Details -->
        <PassPredictPassDetails
          :pass="pass"
          :get-satellite-data="getSatelliteData"
          :format-pass-time="formatPassTime"
          :format-pass-duration="formatPassDuration"
          :format-time-until-pass="formatTimeUntilPass"
          :is-passing="isPassing"
          :is-geostationary="isGeostationarySatellite"
          :radial-velocity="radialVelocity"
          :is-parent-expanded="isExpanded"
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
  radialVelocity,
  startTracking,
  stopTracking
} = useRealTimePosition()

const { getPastPositions } = useSatellitePath()

// Get distance units from settings
const { settings } = useSettings()

// Import pass status composable for geostationary detection
const { isGeostationary: checkIsGeostationary } = usePassStatus()

// Check if satellite is geostationary based on pass characteristics
const isGeostationarySatellite = computed(() => {
  return checkIsGeostationary(props.pass)
})

// For geostationary satellites, calculate position from pass data (no API call needed)
const geostationaryPosition = computed(() => {
  if (!isGeostationarySatellite.value) return null

  // Geostationary satellites are at ~35,786 km altitude
  const GEOSTATIONARY_ALTITUDE_KM = 35786
  const EARTH_RADIUS_KM = 6371
  const observerAltKm = (settings.value.observationLocation?.altitude || 0) / 1000

  // Calculate distance from observer to satellite using elevation angle
  // Distance = sqrt((R + h)² - (R + obsAlt)² * cos²(elevation)) - (R + obsAlt) * sin(elevation)
  const elevationRad = (props.pass.maxElevation * Math.PI) / 180
  const R = EARTH_RADIUS_KM
  const h = GEOSTATIONARY_ALTITUDE_KM
  const obsR = R + observerAltKm

  const distance = Math.sqrt(
    Math.pow(R + h, 2) - Math.pow(obsR * Math.cos(elevationRad), 2)
  ) - obsR * Math.sin(elevationRad)

  return {
    azimuth: props.pass.maxAzimuth,
    elevation: props.pass.maxElevation,
    distance: distance,
    timestamp: Date.now()
  }
})

// Computed: Should we show the visualization?
const showVisualization = computed(() => {
  if (!props.isExpanded) return false

  // For geostationary: show immediately when expanded (position is already known)
  if (isGeostationarySatellite.value) {
    return true
  }

  // For regular satellites: always show when expanded
  return true
})

// Computed: Past positions for drawing
const pastPositions = computed(() => {
  return getPastPositions(positionHistory.value)
})

// Watch for card expansion and pass status
// IMPORTANT: Only track when BOTH conditions are met:
// 1. Card is expanded (user clicked to view details)
// 2. Satellite is actively passing (within pass window)
watch([() => props.isExpanded, () => props.isPassing], async ([expanded, passing]) => {
  // Special handling for geostationary satellites - no API call needed, position is already known
  if (isGeostationarySatellite.value) {
    // Position is calculated from pass data, no API call needed
    return
  }

  const shouldTrack = expanded && passing
  const wasTracking = isTracking.value

  if (shouldTrack && !wasTracking) {
    // Card is open AND satellite is passing - start real-time tracking
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
    stopTracking()
  }
}, { immediate: false })

// Cleanup when component is unmounted
onUnmounted(() => {
  if (isTracking.value) {
    stopTracking()
  }
})
</script>
