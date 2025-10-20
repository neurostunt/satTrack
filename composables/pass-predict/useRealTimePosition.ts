/**
 * Real-Time Position Composable
 * Handles fetching and interpolating satellite positions during a pass
 * 
 * Strategy: Fetch 300s (5 min) of positions at once, interpolate for smooth animation
 * API Usage: ~2 requests per 10-minute pass (85% reduction from 60s strategy)
 * 
 * N2YO API Limits:
 * - 1000 requests per hour for positions endpoint
 * - Maximum 300 seconds per request
 */

import type { Ref } from 'vue'
import { calculateDistance, calculateRadialVelocity } from '~/utils/dopplerCalculations'

export interface SatellitePosition {
  timestamp: number // Unix timestamp in milliseconds
  azimuth: number // Degrees (0-360)
  elevation: number // Degrees (0-90)
  distance: number // Distance to satellite (km)
  satLatitude: number // Satellite latitude
  satLongitude: number // Satellite longitude
  satAltitude: number // Satellite altitude above Earth (km)
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
  
  // Radial velocity (km/s)
  const radialVelocity = ref<number>(0)
  
  // Observer location (stored for distance calculations)
  const observerLocation = ref<{ lat: number; lng: number; alt: number } | null>(null)
  
  // Animation frame ID for cleanup
  let animationFrameId: number | null = null
  let fetchIntervalId: number | null = null

  /**
   * Start tracking a satellite during its pass
   * 
   * ⚠️ IMPORTANT: Should only be called when:
   * 1. User has expanded the pass card (actively viewing)
   * 2. Satellite is currently passing (within pass window)
   * 
   * This prevents unnecessary API calls and saves rate limit quota.
   * Fetches 300s of position data every 270 seconds (4.5 min).
   */
  const startTracking = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    // Prevent duplicate tracking
    if (isTracking.value) {
      console.warn(`⚠️ Already tracking NORAD ${noradId} - ignoring duplicate start request`)
      return
    }
    
    // Validate API key
    if (!apiKey) {
      console.error(`❌ Cannot start tracking: N2YO API key is missing`)
      return
    }
    
    console.log(`🛰️ Starting real-time tracking for NORAD ${noradId}`)
    console.log(`   📍 Observer: ${observerLat.toFixed(4)}°, ${observerLng.toFixed(4)}°`)
    console.log(`   ⏱️ Fetch interval: 270s (4.5 min)`)
    console.log(`   📊 API efficiency: ~13 calls/hour per satellite`)
    
    isTracking.value = true
    positionHistory.value = []
    futurePositions.value = []
    radialVelocity.value = 0
    
    // Store observer location for distance calculations
    observerLocation.value = {
      lat: observerLat,
      lng: observerLng,
      alt: observerAlt
    }

    // Fetch initial positions
    await fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)

    // Start animation loop for smooth interpolation
    startAnimation()

    // Fetch new positions every 270 seconds (4.5 min) before running out of 300s buffer
    // This gives us a 30s safety margin while maximizing API efficiency
    fetchIntervalId = setInterval(async () => {
      await fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)
    }, 270000) as unknown as number // 270 seconds = 4.5 minutes
  }

  /**
   * Stop tracking (when pass ends or user closes visualization)
   * 
   * Called automatically when:
   * - User collapses the pass card
   * - Pass ends (satellite no longer visible)
   * - Component is unmounted
   */
  const stopTracking = () => {
    if (!isTracking.value) {
      // Already stopped, nothing to do
      return
    }
    
    console.log('🛑 Stopping real-time tracking')
    console.log('   → Saving API quota (no more position fetches)')
    
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
    radialVelocity.value = 0
    observerLocation.value = null
  }

  /**
   * Fetch satellite positions from N2YO API
   * Gets 300 seconds (5 minutes) worth of positions (one position per second)
   * This maximizes API efficiency while staying within the 300s limit
   */
  const fetchPositions = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    try {
      console.log(`📡 Fetching positions for NORAD ${noradId} (300 seconds)`)
      
      const { getSatellitePositions } = useN2YO()
      
      const positions = await getSatellitePositions(
        noradId,
        observerLat,
        observerLng,
        observerAlt,
        300, // Get 300 seconds (5 min) - maximum allowed by N2YO API
        apiKey
      )

      console.log(`✅ Received ${positions.length} position samples (${positions.length}s of data)`)
      
      // Calculate distance for each position
      if (observerLocation.value) {
        positions.forEach(pos => {
          pos.distance = calculateDistance(
            observerLocation.value!.lat,
            observerLocation.value!.lng,
            observerLocation.value!.alt,
            pos.satLatitude,
            pos.satLongitude,
            pos.satAltitude
          )
        })
      }
      
      // Merge with existing buffer, removing any overlaps
      // The animation loop moves consumed positions to history, so we combine remaining + new
      const now = Date.now()
      const existingFuture = futurePositions.value.filter(pos => pos.timestamp >= now)
      
      // Only add new positions that don't overlap with existing ones
      const newPositions = positions.filter(pos => 
        !existingFuture.some(existing => existing.timestamp === pos.timestamp)
      )
      
      futurePositions.value = [...existingFuture, ...newPositions]
      lastFetchTime.value = now
      
      console.log(`📊 Buffer status: ${existingFuture.length} existing + ${newPositions.length} new = ${futurePositions.value.length} total positions`)

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
          // Calculate radial velocity if we have a previous position
          if (currentPosition.value && currentPosition.value.distance > 0 && closestPosition.distance > 0) {
            const timeDiffSeconds = (closestPosition.timestamp - currentPosition.value.timestamp) / 1000
            if (timeDiffSeconds > 0) {
              radialVelocity.value = calculateRadialVelocity(
                currentPosition.value.distance,
                closestPosition.distance,
                timeDiffSeconds
              )
            }
          }
          
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
      distance: pos1.distance + (pos2.distance - pos1.distance) * t,
      satLatitude: pos1.satLatitude + (pos2.satLatitude - pos1.satLatitude) * t,
      satLongitude: pos1.satLongitude + (pos2.satLongitude - pos1.satLongitude) * t,
      satAltitude: pos1.satAltitude + (pos2.satAltitude - pos1.satAltitude) * t
    }
  }

  return {
    // State
    currentPosition,
    positionHistory,
    futurePositions,
    isTracking,
    radialVelocity,
    
    // Methods
    startTracking,
    stopTracking,
    interpolatePosition
  }
}

