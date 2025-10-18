/**
 * Pass Cleanup Composable
 * Handles cleanup of expired and passed satellite passes
 */

import type { Ref } from 'vue'

export const usePassCleanup = (
  passPredictions: Ref<Map<number, any[]>>,
  isGeostationary: (noradId: number) => boolean
) => {
  /**
   * Clean up expired passes from the current data
   */
  const cleanupExpiredPasses = () => {
    const currentTime = Date.now()
    
    const updatedPredictions = new Map()
    let totalRemoved = 0
    let satellitesRemoved = 0
    
    passPredictions.value.forEach((passes, noradId) => {
      if (isGeostationary(noradId)) {
        // Keep all passes for geostationary satellites
        updatedPredictions.set(noradId, passes)
      } else {
        // Filter out expired passes
        const validPasses = passes.filter(pass => pass.endTime > currentTime)
        const removedCount = passes.length - validPasses.length
        
        if (removedCount > 0) {
          totalRemoved += removedCount
        }
        
        if (validPasses.length > 0) {
          updatedPredictions.set(noradId, validPasses)
        } else {
          satellitesRemoved++
        }
      }
    })
    
    if (totalRemoved > 0 || satellitesRemoved > 0) {
      passPredictions.value = updatedPredictions
    }
  }

  /**
   * Handle auto-removal of passed satellites after 10 seconds
   */
  const handleAutoRemoval = () => {
    const currentTime = Date.now()
    
    // Check for passes that ended more than 10 seconds ago
    const updatedPredictions = new Map()
    let removedCount = 0
    
    passPredictions.value.forEach((passes, noradId) => {
      if (isGeostationary(noradId)) {
        // Keep all passes for geostationary satellites
        updatedPredictions.set(noradId, passes)
      } else {
        // Filter out passes that ended more than 10 seconds ago
        const validPasses = passes.filter(pass => {
          const timeSinceEnd = currentTime - pass.endTime
          return timeSinceEnd < 10000 // Keep passes that ended less than 10 seconds ago
        })
        
        const removedPasses = passes.length - validPasses.length
        if (removedPasses > 0) {
          removedCount += removedPasses
        }
        
        if (validPasses.length > 0) {
          updatedPredictions.set(noradId, validPasses)
        }
      }
    })
    
    if (removedCount > 0) {
      passPredictions.value = updatedPredictions
    }
  }

  return {
    cleanupExpiredPasses,
    handleAutoRemoval
  }
}
