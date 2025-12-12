/**
 * Polar Plot Background Composable
 * Manages preloaded SVG background elements for better performance
 */

import { ref, computed } from 'vue'

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

  // Cardinal direction lines (N, E, S, W)
  for (const angle of [0, 90, 180, 270]) {
    const x2 = center + radius * Math.sin(angle * Math.PI / 180)
    const y2 = center - radius * Math.cos(angle * Math.PI / 180)
    elements.push(`<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="1" opacity="0.3" />`)
  }

  // Compass labels
  elements.push(`<text x="${center}" y="20" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">N</text>`)
  elements.push(`<text x="380" y="${center + 5}" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">E</text>`)
  elements.push(`<text x="${center}" y="390" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">S</text>`)
  elements.push(`<text x="20" y="${center + 5}" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="bold">W</text>`)

  // Elevation labels
  elements.push(`<text x="${center + 10}" y="${center - elevationToRadius(30) + 5}" fill="#64748b" font-size="10">30°</text>`)
  elements.push(`<text x="${center + 10}" y="${center - elevationToRadius(60) + 5}" fill="#64748b" font-size="10">60°</text>`)

  // Horizon marker
  elements.push(`<text x="${center}" y="${center + radius + 15}" text-anchor="middle" fill="#64748b" font-size="10">Horizon (0°)</text>`)

  return elements.join('')
}

// Cache the background SVG - initialize immediately for preloading
const backgroundSVG = ref(generateBackgroundSVG())

export const usePolarPlotBackground = () => {
  return {
    backgroundSVG: computed(() => backgroundSVG.value),
    center,
    radius,
    elevationToRadius
  }
}

/**
 * Preload function to ensure background SVG is ready
 * Can be called during app initialization for better performance
 */
export const preloadPolarPlotBackground = () => {
  // Force generation if not already done
  if (!backgroundSVG.value) {
    backgroundSVG.value = generateBackgroundSVG()
  }
}
