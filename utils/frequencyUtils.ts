/**
 * Frequency Formatting Utilities
 * Shared functions for formatting frequencies across components
 */

/**
 * Format frequency value for display
 * Supports both number and string inputs
 */
export const formatFrequencyValue = (frequency: number | string | null | undefined, precision: number = 3): string => {
  if (!frequency) return 'Unknown'

  if (typeof frequency === 'string') {
    return frequency
  }

  if (typeof frequency === 'number') {
    if (frequency >= 1000000) {
      return `${(frequency / 1000000).toFixed(precision)} MHz`
    } else if (frequency >= 1000) {
      return `${(frequency / 1000).toFixed(precision)} kHz`
    } else {
      return `${frequency} Hz`
    }
  }

  return String(frequency)
}

/**
 * Format frequency with high precision (for Doppler calculations)
 */
export const formatFrequencyHighPrecision = (frequency: number | null | undefined): string => {
  return formatFrequencyValue(frequency, 6)
}

/**
 * Format frequency with standard precision
 */
export const formatFrequencyStandard = (frequency: number | null | undefined): string => {
  return formatFrequencyValue(frequency, 3)
}

