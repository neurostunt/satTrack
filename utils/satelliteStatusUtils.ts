/**
 * Satellite Status Utilities
 * Shared functions for formatting satellite status across components
 */

export type SatelliteStatus = 'alive' | 'dead' | 're-entered' | string

/**
 * Get CSS color class for satellite status
 */
export const getStatusColor = (status: SatelliteStatus | null | undefined): string => {
  if (!status) return 'text-space-400'

  const statusLower = status.toLowerCase()
  
  if (statusLower === 'alive' || statusLower.includes('active') || statusLower.includes('operational')) {
    return 'text-green-400'
  }
  
  if (statusLower === 'dead' || statusLower.includes('inactive') || statusLower.includes('off')) {
    return 'text-red-400'
  }
  
  if (statusLower === 're-entered' || statusLower.includes('reentered')) {
    return 'text-orange-400'
  }
  
  if (statusLower.includes('unknown')) {
    return 'text-yellow-400'
  }
  
  return 'text-space-400'
}

/**
 * Get display text for satellite status
 */
export const getStatusText = (status: SatelliteStatus | null | undefined): string => {
  if (!status) return 'UNKNOWN'

  const statusLower = status.toLowerCase()
  
  if (statusLower === 'alive') return 'ACTIVE'
  if (statusLower === 'dead') return 'INACTIVE'
  if (statusLower === 're-entered' || statusLower.includes('reentered')) return 'RE-ENTERED'
  
  return 'UNKNOWN'
}

/**
 * Detect if a pass represents a geostationary satellite based on pass characteristics.
 * Geostationary satellites have:
 * - Start azimuth ≈ End azimuth (within 5 degrees)
 * - Very long duration (> 12 hours)
 */
export const isGeostationaryPass = (pass: {
  startAzimuth?: number
  endAzimuth?: number
  startTime?: number
  endTime?: number
} | null | undefined): boolean => {
  if (!pass) return false

  const azimuthDiff = Math.abs((pass.startAzimuth ?? 0) - (pass.endAzimuth ?? 0))
  if (azimuthDiff >= 5) return false

  if (pass.startTime != null && pass.endTime != null) {
    const durationHours = (pass.endTime - pass.startTime) / (1000 * 60 * 60)
    return durationHours > 12
  }

  return false
}

/**
 * Clean transmitter description by removing CTCSS information
 */
export const getCleanDescription = (description: string | null | undefined): string => {
  if (!description) return 'Unknown'
  return description.replace(/\(CTCSS:?\s*\d+(?:\.\d+)?\s*Hz\)/gi, '').trim()
}

