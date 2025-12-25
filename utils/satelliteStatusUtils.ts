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
 * Clean transmitter description by removing CTCSS information
 */
export const getCleanDescription = (description: string | null | undefined): string => {
  if (!description) return 'Unknown'
  return description.replace(/\(CTCSS:?\s*\d+(?:\.\d+)?\s*Hz\)/gi, '').trim()
}

