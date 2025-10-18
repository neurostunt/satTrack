/**
 * Real-Time Position Composable
 * Handles fetching and interpolating satellite positions during a pass
 * 
 * Strategy: Fetch 60-180s of positions at once, interpolate for smooth animation
 * API Usage: ~4 requests per 10-minute pass
 */

import type { Ref } from 'vue'

export interface SatellitePosition {
  timestamp: number // Unix timestamp in milliseconds
  azimuth: number // Degrees (0-360)
  elevation: number // Degrees (0-90)
  distance: number // Distance to satellite (km)
}

export const useRealTimePosition = () => {
  // Current real-time position
  const currentPosition = ref<SatellitePosition | null>(null)
  
  // Position history (last 5 minutes for path drawing)
  const positionHistory = ref<SatellitePosition[]>([])
  
  // Future positions from API (buffer for smooth animation)
  const futurePositions = ref<SatellitePosition[]>([])
  
  // Tracking state
  const isTracking = ref(false)
  const lastFetchTime = ref(0)
  
  // Animation frame ID for cleanup
  let animationFrameId: number | null = null
  let fetchIntervalId: number | null = null

  /**
   * Start tracking a satellite during its pass
   * Fetches positions every 60 seconds, animates smoothly between updates
   */
  const startTracking = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    console.log(`🛰️ Starting real-time tracking for NORAD ${noradId}`)
    
    isTracking.value = true
    positionHistory.value = []
    futurePositions.value = []

    // Fetch initial positions
    await fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)

    // Start animation loop for smooth interpolation
    startAnimation()

    // Fetch new positions every 45 seconds (before running out of 60s buffer)
    fetchIntervalId = setInterval(async () => {
      await fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)
    }, 45000) as unknown as number
  }

  /**
   * Stop tracking (when pass ends or user closes visualization)
   */
  const stopTracking = () => {
    console.log('🛑 Stopping real-time tracking')
    
    isTracking.value = false
    
    // Clear animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    
    // Clear fetch interval
    if (fetchIntervalId !== null) {
      clearInterval(fetchIntervalId)
      fetchIntervalId = null
    }

    // Clear position data
    currentPosition.value = null
    positionHistory.value = []
    futurePositions.value = []
  }

  /**
   * Fetch satellite positions from N2YO API
   * Gets 60 seconds worth of positions (one position per second)
   */
  const fetchPositions = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    try {
      console.log(`📡 Fetching positions for NORAD ${noradId}`)
      
      const { getSatellitePositions } = useN2YO()
      
      const positions = await getSatellitePositions(
        noradId,
        observerLat,
        observerLng,
        observerAlt,
        60, // Get 60 seconds of positions
        apiKey
      )

      console.log(`✅ Received ${positions.length} position samples`)
      
      // Add to future positions buffer
      futurePositions.value = positions
      lastFetchTime.value = Date.now()

    } catch (error) {
      console.error('❌ Failed to fetch satellite positions:', error)
    }
  }

  /**
   * Animation loop - updates current position smoothly
   * Runs at 60fps for smooth visualization
   */
  const startAnimation = () => {
    const animate = () => {
      if (!isTracking.value) return

      const now = Date.now()
      
      // Find the current position from future positions buffer
      if (futurePositions.value.length > 0) {
        // Find position closest to current time
        const closestPosition = futurePositions.value.find(pos => pos.timestamp >= now)
        
        if (closestPosition) {
          // Update current position
          currentPosition.value = closestPosition
          
          // Move consumed positions to history
          const consumedPositions = futurePositions.value.filter(pos => pos.timestamp < now)
          if (consumedPositions.length > 0) {
            positionHistory.value.push(...consumedPositions)
            futurePositions.value = futurePositions.value.filter(pos => pos.timestamp >= now)
            
            // Keep only last 5 minutes of history (300 positions max)
            const fiveMinutesAgo = now - (5 * 60 * 1000)
            positionHistory.value = positionHistory.value.filter(pos => pos.timestamp > fiveMinutesAgo)
          }
        }
      }

      // Continue animation
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
  }

  /**
   * Interpolate between two positions for smooth animation
   * Used when we need to fill gaps between API samples
   */
  const interpolatePosition = (
    pos1: SatellitePosition,
    pos2: SatellitePosition,
    t: number // 0 to 1
  ): SatellitePosition => {
    return {
      timestamp: pos1.timestamp + (pos2.timestamp - pos1.timestamp) * t,
      azimuth: pos1.azimuth + (pos2.azimuth - pos1.azimuth) * t,
      elevation: pos1.elevation + (pos2.elevation - pos1.elevation) * t,
      distance: pos1.distance + (pos2.distance - pos1.distance) * t
    }
  }

  return {
    // State
    currentPosition,
    positionHistory,
    futurePositions,
    isTracking,
    
    // Methods
    startTracking,
    stopTracking,
    interpolatePosition
  }
}

