/**
 * Satellite Path Composable
 * Helper functions for managing satellite path visualization
 * Keeps past positions and combines with real-time data
 */

import type { Ref } from 'vue'
import type { SatellitePosition } from './useRealTimePosition'

export const useSatellitePath = (
  passPrediction: Ref<any>
) => {
  /**
   * Get positions for "past path" drawing
   * Returns positions where satellite has already been
   */
  const getPastPositions = (
    positionHistory: SatellitePosition[]
  ): SatellitePosition[] => {
    // Return all historical positions (already filtered to last 5 min in useRealTimePosition)
    return positionHistory
  }

  /**
   * Get positions for "future path" drawing
   * Returns next positions from API buffer (up to 300 seconds ahead)
   * Uses server-side timestamp if available for consistency
   */
  const getFuturePositions = (
    futurePositions: SatellitePosition[],
    serverTimestamp?: number,
    serverTimestampOffset?: number
  ): SatellitePosition[] => {
    // Use server-side timestamp if available, otherwise fallback to client time
    const clientNow = Date.now()
    const now = (serverTimestamp && serverTimestamp > 0 && serverTimestampOffset !== undefined)
      ? clientNow + serverTimestampOffset
      : clientNow
    
    // Return only future positions (from now onwards)
    // API provides up to 300 seconds of future data
    return futurePositions.filter(pos => pos.timestamp >= now)
  }

  /**
   * Check if we should show real-time tracking
   * Only show when satellite is currently passing
   */
  const shouldShowRealTimeTracking = (
    startTime: number,
    endTime: number
  ): boolean => {
    const now = Date.now()
    return now >= startTime && now <= endTime
  }

  /**
   * Check if we should show predicted path (before pass starts)
   * Show 10 minutes before pass until pass starts
   */
  const shouldShowPredictedPath = (
    startTime: number
  ): boolean => {
    const now = Date.now()
    const tenMinutesBeforePass = startTime - (10 * 60 * 1000)
    
    return now >= tenMinutesBeforePass && now < startTime
  }

  /**
   * Calculate time until next position update is needed
   * Returns milliseconds until we should fetch new positions
   */
  const getTimeUntilNextUpdate = (
    lastFetchTime: number,
    updateInterval: number = 270000 // 270 seconds (4.5 min) default - matches API fetch interval
  ): number => {
    const timeSinceLastFetch = Date.now() - lastFetchTime
    const timeRemaining = updateInterval - timeSinceLastFetch
    
    return Math.max(0, timeRemaining)
  }

  /**
   * Format position data for display
   */
  const formatPositionInfo = (position: SatellitePosition | null) => {
    if (!position) {
      return {
        elevation: '--',
        azimuth: '--',
        distance: '--'
      }
    }

    return {
      elevation: `${Math.round(position.elevation)}°`,
      azimuth: `${Math.round(position.azimuth)}°`,
      distance: `${Math.round(position.distance)} km`
    }
  }

  /**
   * Get compass direction from azimuth
   * Returns: N, NE, E, SE, S, SW, W, NW
   */
  const getCompassDirection = (azimuth: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
    const index = Math.round(azimuth / 45) % 8
    return directions[index] || 'N'
  }

  return {
    // Path helpers
    getPastPositions,
    getFuturePositions,
    
    // Display logic
    shouldShowRealTimeTracking,
    shouldShowPredictedPath,
    getTimeUntilNextUpdate,
    
    // Formatting
    formatPositionInfo,
    getCompassDirection
  }
}

