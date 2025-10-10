/**
 * Satellite Calculation Web Worker
 * Handles heavy satellite calculations in a separate thread
 */

// Import satellite.js functions (Web Workers need explicit imports)
importScripts('https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/dist/satellite.min.js')

// Cache for parsed satellite records
const satrecCache = new Map()
const calculationCache = new Map()

// Performance tracking
let calculationCount = 0
let cacheHits = 0

/**
 * Get or create cached satellite record
 */
function getCachedSatrec(tleData) {
  const cacheKey = `${tleData.noradId}-${tleData.epoch}`
  
  if (satrecCache.has(cacheKey)) {
    cacheHits++
    return satrecCache.get(cacheKey)
  }

  const satrec = satellite.twoline2satrec(tleData.tle1, tleData.tle2)
  satrecCache.set(cacheKey, satrec)
  
  // Limit cache size
  if (satrecCache.size > 100) {
    const firstKey = satrecCache.keys().next().value
    satrecCache.delete(firstKey)
  }
  
  return satrec
}

/**
 * Generate calculation cache key
 */
function getCalculationCacheKey(tleData, observerLocation, time) {
  const timeKey = Math.floor(time.getTime() / 30000) * 30000 // 30-second buckets
  return `${tleData.noradId}-${observerLocation.latitude.toFixed(4)}-${observerLocation.longitude.toFixed(4)}-${timeKey}`
}

/**
 * Calculate satellite position
 */
function calculateSatellitePosition(tleData, observerLocation, time = new Date()) {
  const startTime = performance.now()
  
  if (!tleData || !tleData.tle1 || !tleData.tle2) {
    return { error: 'Invalid TLE data' }
  }

  if (!observerLocation || !observerLocation.latitude || !observerLocation.longitude) {
    return { error: 'Invalid observer location' }
  }

  // Check calculation cache
  const cacheKey = getCalculationCacheKey(tleData, observerLocation, time)
  if (calculationCache.has(cacheKey)) {
    cacheHits++
    const cached = calculationCache.get(cacheKey)
    return { ...cached, cached: true, calculationTime: performance.now() - startTime }
  }

  try {
    // Use cached satellite record
    const satrec = getCachedSatrec(tleData)
    
    // Calculate satellite position
    const positionAndVelocity = satellite.propagate(satrec, time)
    
    if (positionAndVelocity.position === false) {
      return { error: 'Satellite position calculation failed' }
    }

    const positionEci = positionAndVelocity.position
    
    // Observer position in ECI
    const observerGd = {
      latitude: observerLocation.latitude * Math.PI / 180,
      longitude: observerLocation.longitude * Math.PI / 180,
      height: (observerLocation.altitude || 0) / 1000
    }
    
    const observerEci = satellite.eciToGeodetic(satellite.geodeticToEcf(observerGd, time), time)
    
    // Calculate look angles
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEci, time)
    
    if (!lookAngles) {
      return { error: 'Look angles calculation failed' }
    }

    // Calculate range (optimized)
    const dx = positionEci.x - observerEci.x
    const dy = positionEci.y - observerEci.y
    const dz = positionEci.z - observerEci.z
    const range = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // Convert angles to degrees
    const azimuth = (lookAngles.azimuth * 180 / Math.PI + 360) % 360
    const elevation = lookAngles.elevation * 180 / Math.PI

    const result = {
      azimuth: Math.round(azimuth * 100) / 100,
      elevation: Math.round(elevation * 100) / 100,
      range: Math.round(range * 100) / 100,
      rangeKm: Math.round(range * 100) / 100,
      rangeMiles: Math.round(range * 0.621371 * 100) / 100,
      isVisible: elevation > 0,
      time: time.toISOString(),
      noradId: tleData.noradId,
      name: tleData.name,
      cached: false,
      calculationTime: performance.now() - startTime
    }

    // Cache the result
    calculationCache.set(cacheKey, result)
    
    // Limit cache size
    if (calculationCache.size > 1000) {
      const firstKey = calculationCache.keys().next().value
      calculationCache.delete(firstKey)
    }

    calculationCount++
    return result

  } catch (error) {
    return { error: error.message }
  }
}

/**
 * Calculate multiple satellites
 */
function calculateMultipleSatellites(satellites, observerLocation, time = new Date()) {
  const results = []
  
  for (const satellite of satellites) {
    const position = calculateSatellitePosition(satellite, observerLocation, time)
    if (!position.error) {
      results.push(position)
    }
  }
  
  return results
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics() {
  return {
    calculationCount,
    cacheHits,
    cacheHitRate: calculationCount > 0 ? (cacheHits / calculationCount) * 100 : 0,
    satrecCacheSize: satrecCache.size,
    calculationCacheSize: calculationCache.size
  }
}

/**
 * Clear caches
 */
function clearCaches() {
  satrecCache.clear()
  calculationCache.clear()
  calculationCount = 0
  cacheHits = 0
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data
  
  try {
    let result
    
    switch (type) {
      case 'CALCULATE_POSITION':
        result = calculateSatellitePosition(data.tleData, data.observerLocation, data.time)
        break
        
      case 'CALCULATE_MULTIPLE':
        result = calculateMultipleSatellites(data.satellites, data.observerLocation, data.time)
        break
        
      case 'GET_METRICS':
        result = getPerformanceMetrics()
        break
        
      case 'CLEAR_CACHES':
        clearCaches()
        result = { success: true }
        break
        
      default:
        result = { error: 'Unknown message type' }
    }
    
    self.postMessage({
      id: e.data.id,
      type: 'RESULT',
      data: result
    })
    
  } catch (error) {
    self.postMessage({
      id: e.data.id,
      type: 'ERROR',
      error: error.message
    })
  }
}
