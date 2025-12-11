/**
 * Device Orientation Composable
 * Handles DeviceOrientationEvent API for satellite tracking
 * 
 * DeviceOrientationEvent provides:
 * - alpha: Compass heading (0-360°) - uses magnetometer
 * - beta: Pitch/nagib (-180 to 180°) - uses gyroscope + accelerometer
 * - gamma: Roll/klatno (-90 to 90°) - uses gyroscope + accelerometer
 * 
 * IMPORTANT: Uses True North for compass heading (azimuth)
 * - Satellite azimuth coordinates are always in True North reference
 * - DeviceOrientationEvent.absolute flag indicates if alpha is relative to True North
 * - For accurate satellite tracking, True North alignment is required
 */

export interface DeviceOrientationData {
  alpha: number | null // Compass heading (0-360°)
  beta: number | null  // Pitch (-180 to 180°)
  gamma: number | null // Roll (-90 to 90°)
  absolute: boolean    // Whether orientation is absolute (compass-calibrated)
}

export interface DeviceOrientationState {
  isSupported: boolean
  isPermissionGranted: boolean | null // null = not requested yet
  isActive: boolean
  orientation: DeviceOrientationData | null
  error: string | null
}

export const useDeviceOrientation = () => {
  const state = ref<DeviceOrientationState>({
    isSupported: false,
    isPermissionGranted: null,
    isActive: false,
    orientation: null,
    error: null
  })

  // Event handler reference for cleanup
  let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null

  // Compass calibration state
  const calibrationState = ref({
    isCalibrating: false,
    calibrationProgress: 0, // 0-100
    calibrationSamples: [] as number[], // Store alpha values for calibration
    lastCalibrationTime: 0
  })

  /**
   * Check if DeviceOrientationEvent is supported
   */
  const checkSupport = (): boolean => {
    if (typeof window === 'undefined') return false
    
    const isSupported = 'DeviceOrientationEvent' in window
    state.value.isSupported = isSupported
    
    if (!isSupported) {
      state.value.error = 'DeviceOrientationEvent is not supported in this browser'
    }
    
    return isSupported
  }

  /**
   * Request permission for device orientation
   * On iOS 13+, this requires explicit permission
   * On Android, permission is usually granted automatically
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!checkSupport()) {
      return false
    }

    // Check if permission API is available (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        
        if (permission === 'granted') {
          state.value.isPermissionGranted = true
          state.value.error = null
          return true
        } else {
          state.value.isPermissionGranted = false
          state.value.error = 'Device orientation permission denied'
          return false
        }
      } catch (error) {
        console.error('Error requesting device orientation permission:', error)
        state.value.isPermissionGranted = false
        state.value.error = 'Failed to request device orientation permission'
        return false
      }
    } else {
      // Permission API not available - assume granted (Android, older iOS)
      state.value.isPermissionGranted = true
      return true
    }
  }

  /**
   * Start listening to device orientation events
   */
  const start = async (): Promise<boolean> => {
    if (!checkSupport()) {
      return false
    }

    // Request permission if not already granted
    if (state.value.isPermissionGranted !== true) {
      const granted = await requestPermission()
      if (!granted) {
        return false
      }
    }

    // Already active
    if (state.value.isActive) {
      return true
    }

    // Create event handler
    orientationHandler = (event: DeviceOrientationEvent) => {
      // Note: alpha (compass heading) should be in True North reference for satellite tracking
      // event.absolute === true means alpha is relative to True North (preferred)
      // event.absolute === false means alpha is relative to Magnetic North (needs conversion)
      // For satellite azimuth matching, we use True North directly
      state.value.orientation = {
        alpha: event.alpha, // Compass heading (0-360°) - True North when absolute=true
        beta: event.beta,   // Pitch (-180 to 180°)
        gamma: event.gamma, // Roll (-90 to 90°)
        absolute: event.absolute || false // True if alpha is relative to True North
      }
      state.value.error = null

      // Update calibration if active
      if (calibrationState.value.isCalibrating) {
        updateCalibration(event.alpha)
      }
    }

    // Add event listener
    window.addEventListener('deviceorientation', orientationHandler as EventListener)
    state.value.isActive = true

    return true
  }

  /**
   * Stop listening to device orientation events
   */
  const stop = (): void => {
    if (orientationHandler) {
      window.removeEventListener('deviceorientation', orientationHandler as EventListener)
      orientationHandler = null
    }
    
    state.value.isActive = false
    state.value.orientation = null
  }

  /**
   * Get current orientation data
   */
  const getOrientation = computed(() => state.value.orientation)

  /**
   * Get compass heading (alpha) in degrees
   */
  const getCompassHeading = computed(() => {
    return state.value.orientation?.alpha ?? null
  })

  /**
   * Get pitch angle (beta) in degrees
   */
  const getPitch = computed(() => {
    return state.value.orientation?.beta ?? null
  })

  /**
   * Get roll angle (gamma) in degrees
   */
  const getRoll = computed(() => {
    return state.value.orientation?.gamma ?? null
  })

  /**
   * Start compass calibration
   * User should move device in figure-8 pattern
   * Calibration collects alpha (heading) samples and checks for full rotation coverage
   */
  const startCalibration = (): void => {
    if (!state.value.isActive) {
      console.warn('Cannot calibrate: device orientation is not active')
      return
    }

    calibrationState.value.isCalibrating = true
    calibrationState.value.calibrationProgress = 0
    calibrationState.value.calibrationSamples = []
    calibrationState.value.lastCalibrationTime = Date.now()

    console.log('🧭 Starting compass calibration - move device in figure-8 pattern')
  }

  /**
   * Stop compass calibration
   */
  const stopCalibration = (): void => {
    calibrationState.value.isCalibrating = false
    calibrationState.value.calibrationProgress = 0
    calibrationState.value.calibrationSamples = []
    console.log('🧭 Compass calibration stopped')
  }

  /**
   * Update calibration progress based on orientation data
   * Called internally when orientation data is received
   */
  const updateCalibration = (alpha: number | null): void => {
    if (!calibrationState.value.isCalibrating || alpha === null) {
      return
    }

    const now = Date.now()
    const timeSinceLastSample = now - calibrationState.value.lastCalibrationTime

    // Sample every 100ms to avoid too many samples
    if (timeSinceLastSample < 100) {
      return
    }

    calibrationState.value.calibrationSamples.push(alpha)
    calibrationState.value.lastCalibrationTime = now

    // Check if we have full 360° coverage
    const samples = calibrationState.value.calibrationSamples
    if (samples.length < 10) {
      // Need at least 10 samples
      calibrationState.value.calibrationProgress = Math.min(50, (samples.length / 10) * 50)
      return
    }

    // Check for coverage across all quadrants (0-90, 90-180, 180-270, 270-360)
    const quadrants = [false, false, false, false]
    samples.forEach(sample => {
      if (sample >= 0 && sample < 90) quadrants[0] = true
      else if (sample >= 90 && sample < 180) quadrants[1] = true
      else if (sample >= 180 && sample < 270) quadrants[2] = true
      else if (sample >= 270 && sample <= 360) quadrants[3] = true
    })

    const coveredQuadrants = quadrants.filter(q => q).length
    calibrationState.value.calibrationProgress = 50 + (coveredQuadrants / 4) * 50

    // Calibration complete when all quadrants are covered
    if (coveredQuadrants === 4 && samples.length >= 20) {
      calibrationState.value.calibrationProgress = 100
      console.log('✅ Compass calibration complete!')
      
      // Auto-stop calibration after completion
      setTimeout(() => {
        stopCalibration()
      }, 1000)
    }
  }

  /**
   * Get calibration state
   */
  const getCalibrationState = computed(() => calibrationState.value)

  // Check support on initialization
  if (typeof window !== 'undefined') {
    checkSupport()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
  })

  return {
    // State
    state: readonly(state),
    isSupported: computed(() => state.value.isSupported),
    isPermissionGranted: computed(() => state.value.isPermissionGranted),
    isActive: computed(() => state.value.isActive),
    error: computed(() => state.value.error),
    
    // Orientation data
    orientation: getOrientation,
    compassHeading: getCompassHeading,
    pitch: getPitch,
    roll: getRoll,
    
    // Methods
    checkSupport,
    requestPermission,
    start,
    stop,
    
    // Calibration
    startCalibration,
    stopCalibration,
    calibrationState: getCalibrationState
  }
}
