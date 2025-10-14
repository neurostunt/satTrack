/**
 * Web Worker for Satellite Pass Calculations
 * Runs calculations in background without blocking UI
 */

// Listen for messages from main thread
self.onmessage = function(e) {
  console.log('🔧 Web Worker received message:', e.data)

  const { tleData, observerLocation, startTime, maxDays, satelliteInfo } = e.data

  try {
    console.log('🔧 Starting pass calculation for:', satelliteInfo.name)
    const passes = calculatePasses(tleData, observerLocation, startTime, maxDays, satelliteInfo)

    // Send results back to main thread
    self.postMessage({
      success: true,
      passes: passes,
      satelliteInfo: satelliteInfo
    })
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      success: false,
      error: error.message,
      satelliteInfo: satelliteInfo
    })
  }
}

function calculatePasses(tleData, observerLocation, startTime, maxDays, satelliteInfo) {
  const passes = []
  const endTime = new Date(startTime.getTime() + maxDays * 24 * 60 * 60 * 1000)

  let currentTime = new Date(startTime)
  let stepCount = 0
  const maxSteps = 200 // Very conservative limit

  // Use larger time steps for faster calculation
  const timeStep = 15 * 60 * 1000 // 15 minutes

  while (currentTime < endTime && stepCount < maxSteps) {
    const position = calculateSatellitePosition(tleData, observerLocation, currentTime)

    if (position && position.elevation > 0) {
      // Found a visible pass - calculate its details
      const pass = calculatePassDetails(tleData, observerLocation, currentTime, satelliteInfo)
      if (pass) {
        passes.push(pass)
        // Skip ahead to avoid duplicate passes
        currentTime = new Date(pass.endTime.getTime() + 60 * 60 * 1000) // Skip 1 hour
      } else {
        currentTime = new Date(currentTime.getTime() + timeStep)
      }
    } else {
      currentTime = new Date(currentTime.getTime() + timeStep)
    }

    stepCount++
  }

  return passes.slice(0, 5) // Limit to 5 passes max
}

function calculatePassDetails(tleData, observerLocation, startTime, satelliteInfo) {
  try {
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours max
    const timeStep = 5 * 60 * 1000 // 5 minutes for detailed calculation

    let currentTime = new Date(startTime)
    let passStart = null
    let passEnd = null
    let maxElevation = -90
    let maxElevationTime = null
    let stepCount = 0
    const maxSteps = 50 // Safety limit

    while (currentTime < endTime && stepCount < maxSteps) {
      const position = calculateSatellitePosition(tleData, observerLocation, currentTime)

      if (position) {
        if (position.elevation > 0) {
          if (!passStart) {
            passStart = new Date(currentTime)
          }

          if (position.elevation > maxElevation) {
            maxElevation = position.elevation
            maxElevationTime = new Date(currentTime)
          }
        } else if (passStart) {
          passEnd = new Date(currentTime)
          break
        }
      }

      currentTime = new Date(currentTime.getTime() + timeStep)
      stepCount++
    }

    if (passStart && passEnd && maxElevation > 0) {
      return {
        startTime: passStart,
        endTime: passEnd,
        maxElevationTime: maxElevationTime,
        maxElevation: Math.round(maxElevation * 100) / 100,
        duration: Math.round((passEnd - passStart) / 1000 / 60), // minutes
        noradId: satelliteInfo.noradId,
        name: satelliteInfo.name,
        status: satelliteInfo.status || 'alive'
      }
    }

    return null
  } catch (error) {
    console.error('Pass details calculation error:', error)
    return null
  }
}

function calculateSatellitePosition(tleData, observerLocation, time) {
  if (!tleData || !tleData.tle1 || !tleData.tle2) {
    return null
  }

  try {
    // Parse TLE data
    const satrec = twoline2satrec(tleData.tle1, tleData.tle2)

    // Calculate satellite position
    const positionAndVelocity = propagate(satrec, time)

    if (positionAndVelocity.position === false) {
      return null
    }

    // Convert position to ECI coordinates
    const positionEci = positionAndVelocity.position

    // Observer position in ECI
    const observerGd = {
      latitude: observerLocation.latitude * Math.PI / 180,
      longitude: observerLocation.longitude * Math.PI / 180,
      height: (observerLocation.altitude || 0) / 1000 // Convert to km
    }

    const observerEci = eciToGeodetic(geodeticToEcf(observerGd, time), time)

    // Calculate look angles
    const lookAngles = ecfToLookAngles(observerGd, positionEci, time)

    if (!lookAngles) {
      return null
    }

    // Convert angles to degrees
    const azimuth = (lookAngles.azimuth * 180 / Math.PI + 360) % 360
    const elevation = lookAngles.elevation * 180 / Math.PI

    return {
      azimuth: Math.round(azimuth * 100) / 100,
      elevation: Math.round(elevation * 100) / 100,
      time: time.toISOString()
    }

  } catch (error) {
    return null
  }
}
