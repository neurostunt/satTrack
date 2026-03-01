/**
 * Date and Time Utilities
 * Provides helper functions for formatting dates, times, and durations.
 */

/**
 * Format pass time for display (day/month + time).
 */
export const formatPassTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'short' })
  const time = date.toLocaleTimeString()
  return `${month} ${day}, ${time}`
}

/**
 * Format pass duration (milliseconds to "Xm Ys").
 */
export const formatPassDuration = (durationMs: number): string => {
  const minutes = Math.floor(durationMs / (1000 * 60))
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Format timestamp to locale string.
 */
export const formatTimestamp = (timestamp: number | string | null): string => {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

