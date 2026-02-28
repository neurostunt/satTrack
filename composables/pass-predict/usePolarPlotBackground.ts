/**
 * Polar Plot Background Composable
 * Manages preloaded SVG background elements for better performance
 */


// Constants
const center = 200 // Center of SVG (400/2)
const radius = 180 // Outer radius (horizon)

/**
 * Convert elevation (0-90°) to radius on plot
 */
const elevationToRadius = (elevation: number): number => {
  return radius * (1 - elevation / 90)
}

/**
 * Generate static SVG background elements as a string
 * This can be preloaded and cached
 */
const generateBackgroundSVG = () => {
  const elements = []

  // Background circle
  elements.push(`<circle cx="${center}" cy="${center}" r="${radius}" fill="#0f172a" stroke="#334155" stroke-width="1" />`)

  // Elevation circles (30°, 60°)
  for (const el of [30, 60]) {
    const r = elevationToRadius(el)
    elements.push(`<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#475569" stroke-width="1" stroke-dasharray="4,4" />`)
  }

  // Crosshair lines: full N↔S and E↔W through center
  elements.push(`<line x1="${center}" y1="${center - radius}" x2="${center}" y2="${center + radius}" stroke="#475569" stroke-width="1" opacity="0.5" />`)
  elements.push(`<line x1="${center - radius}" y1="${center}" x2="${center + radius}" y2="${center}" stroke="#475569" stroke-width="1" opacity="0.5" />`)

  // Compass labels — inline style overrides any CSS reset that would override SVG presentation attributes
  elements.push(`<text x="${center}" y="14" text-anchor="middle" fill="#94a3b8" style="font-size:9px" font-weight="bold">N</text>`)
  elements.push(`<text x="393" y="${center + 4}" text-anchor="middle" fill="#94a3b8" style="font-size:9px" font-weight="bold">E</text>`)
  elements.push(`<text x="${center}" y="393" text-anchor="middle" fill="#94a3b8" style="font-size:9px" font-weight="bold">S</text>`)
  elements.push(`<text x="7" y="${center + 4}" text-anchor="middle" fill="#94a3b8" style="font-size:9px" font-weight="bold">W</text>`)

  // Elevation labels — placed just below each ring's south point to avoid interfering with satellite paths
  const r30 = elevationToRadius(30)
  const r60 = elevationToRadius(60)
  elements.push(`<text x="${center + 6}" y="${center + r30 + 14}" fill="#475569" style="font-size:12px">30°</text>`)
  elements.push(`<text x="${center + 6}" y="${center + r60 + 14}" fill="#475569" style="font-size:12px">60°</text>`)

  return elements.join('')
}

export const usePolarPlotBackground = () => {
  const backgroundSVG = generateBackgroundSVG()
  return {
    backgroundSVG,
    center,
    radius,
    elevationToRadius
  }
}

