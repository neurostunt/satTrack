/**
 * Satellite Name Utilities
 * Handles extraction and formatting of satellite names
 */
/**
 * Extract the first part of a satellite name
 * Examples:
 * - "FOX-1C - AO-95Fox-1Cliff" -> "AO-95"
 * - "SAUDISAT 1C - SO-50" -> "SO-50"
 * - "ISS" -> "ISS"
 * - "NOAA-15" -> "NOAA-15"
 */
export const extractFirstSatelliteName = (name: string): string => {
  if (!name) return ''

  // Handle specific patterns first
  // Look for patterns like "AO-95", "SO-50", "NOAA-15", etc.
  const commonPatterns = [
    /([A-Z]{2,4}-\d+)/,  // AO-95, SO-50, NOAA-15, etc. (anywhere in string)
    /([A-Z]{2,4}\d+)/,   // ISS, FOX1C, etc. (anywhere in string)
    /([A-Z]+-\d+)/,      // General pattern like X-123 (anywhere in string)
  ]

  // Find all matches and prioritize the most common satellite naming patterns
  const allMatches: string[] = []

  for (const pattern of commonPatterns) {
    const matches = name.match(new RegExp(pattern.source, 'g'))
    if (matches) {
      allMatches.push(...matches)
    }
  }

  // If we found matches, prioritize common satellite patterns
  if (allMatches.length > 0) {
    // Prioritize patterns that look like common satellite names (AO-XX, SO-XX, NOAA-XX, etc.)
    // Check for higher priority patterns first
    const highPriority = allMatches.find(match =>
      /^(AO|SO|NOAA)-\d+$/.test(match)
    )

    if (highPriority) {
      return highPriority
    }

    // Then check for medium priority patterns
    const mediumPriority = allMatches.find(match =>
      /^(ISS|FOX|AMSAT)-\d+$/.test(match) ||
      /^(AO|SO|NOAA|ISS|FOX|AMSAT)\d+$/.test(match)
    )

    if (mediumPriority) {
      return mediumPriority
    }

    // Return the first match if no prioritized match found
    return allMatches[0] || ''
  }

  // If no pattern matches, split by common separators and take first meaningful part
  const parts = name.split(/[\s\-,|]+/).filter(part => part.trim() !== '')

  if (parts.length === 0) return name

  // Return the first meaningful part
  return parts[0]?.trim() || name
}

/**
 * Extract the first part from multiple satellite names
 * Handles cases where satellite has both 'name' and 'names' properties
 */
export const extractPrimarySatelliteName = (satellite: any): string => {
  if (!satellite) return 'Unknown'

  const name = satellite.name || ''
  const names = satellite.names || ''

  // Try to extract from names first (usually shorter/more common)
  if (names) {
    const extracted = extractFirstSatelliteName(names)
    if (extracted) return extracted
  }

  // Fallback to name
  if (name) {
    const extracted = extractFirstSatelliteName(name)
    if (extracted) return extracted
  }

  return 'Unknown'
}

/**
 * Format satellite name for display with primary and secondary parts
 * Returns an object with primary (main name) and secondary (additional info)
 * Primary goes on first row, secondary + NORAD ID goes on second row
 */
export const formatSatelliteNameForDisplay = (satellite: any, noradId?: string | number) => {
  if (!satellite) {
    return {
      primary: `NORAD ${noradId || 'Unknown'}`,
      secondary: null,
      noradId: noradId || 'Unknown'
    }
  }

  const name = satellite.name || ''
  const names = satellite.names || ''

  // Show full names without shortening
  if (names && name && names !== name) {
    return {
      primary: names,    // Full names (e.g., "ISS")
      secondary: name,   // Full name (e.g., "RS0")
      noradId: noradId || 'Unknown'
    }
  }

  // Return single name
  const primary = names || name || `NORAD ${noradId || 'Unknown'}`
  return {
    primary,
    secondary: null,
    noradId: noradId || 'Unknown'
  }
}

/**
 * Get full satellite name for display (combines both parts)
 */
export const getFullSatelliteName = (satellite: any, noradId?: string | number): string => {
  if (!satellite) return `NORAD ${noradId || 'Unknown'}`

  const name = satellite.name || ''
  const names = satellite.names || ''

  // Extract first parts
  const primaryFromNames = names ? extractFirstSatelliteName(names) : ''
  const primaryFromName = name ? extractFirstSatelliteName(name) : ''

  // If both exist and are different, combine them
  if (primaryFromNames && primaryFromName && primaryFromNames !== primaryFromName) {
    return `${primaryFromNames} - ${primaryFromName}`
  }

  // Return whichever exists
  return primaryFromNames || primaryFromName || `NORAD ${noradId || 'Unknown'}`
}

/**
 * Truncate satellite name if longer than reference length
 * Reference: "KUKAI: Mother (Parents) JR5YBN" (35 characters)
 * If name is longer, truncate and add "..."
 */
export const truncateSatelliteName = (name: string, maxLength: number = 35): string => {
  if (!name) return ''
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength) + '...'
}
