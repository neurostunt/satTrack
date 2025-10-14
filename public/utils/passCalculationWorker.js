/**
 * Improved Web Worker for Satellite Pass Calculations with Debug
 * Uses proper orbital mechanics calculations
 */

// Listen for messages from main thread
self.onmessage = function(e) {
  const { tleData, observerLocation, startTime, maxDays, satelliteInfo, minimumElevation } = e.data

  console.log('🛰️ Worker received data for:', satelliteInfo.name)
  console.log('📍 Observer location:', observerLocation)
  console.log('📅 Start time:', startTime)
  console.log('📊 TLE data:', tleData)
  console.log('📐 Minimum elevation:', minimumElevation)

  try {
    const passes = calculatePasses(tleData, observerLocation, startTime, maxDays, satelliteInfo, minimumElevation)

    console.log('✅ Worker calculated passes:', passes.length)

    // Send results back to main thread
    self.postMessage({
      success: true,
      passes: passes,
      satelliteInfo: satelliteInfo
    })
  } catch (error) {
    console.error('💥 Worker error:', error)
    // Send error back to main thread
    self.postMessage({
      success: false,
      error: error.message,
      satelliteInfo: satelliteInfo
    })
  }
}

function calculatePasses(tleData, observerLocation, startTimeString, maxDays, satelliteInfo, minimumElevation = 0) {
  console.log('🔧 Starting pass calculation for:', satelliteInfo.name)
  console.log('📐 Minimum elevation filter:', minimumElevation)

  const passes = []
  const startTime = new Date(startTimeString)
  const endTime = new Date(startTime.getTime() + maxDays * 24 * 60 * 60 * 1000)

  console.log('⏰ Time range:', startTime.toISOString(), 'to', endTime.toISOString())

  // Parse TLE data
  const orbitalElements = parseTLE(tleData.tle1, tleData.tle2)
  if (!orbitalElements) {
    console.log('❌ Failed to parse TLE data')
    return passes
  }

  console.log('📊 Parsed orbital elements:', orbitalElements)

  let currentTime = new Date(startTime)
  let stepCount = 0
  const maxSteps = 200

  // Use 10 minute steps for better accuracy
  const timeStep = 10 * 60 * 1000

  console.log('🔄 Starting elevation calculations...')

  while (currentTime < endTime && stepCount < maxSteps) {
    const elevation = calculateElevation(orbitalElements, observerLocation, currentTime)

    if (stepCount % 10 === 0) { // Log every 10th step
      console.log(`📐 Step ${stepCount}: ${currentTime.toISOString()} - Elevation: ${elevation}°`)
    }

    if (elevation > minimumElevation) {
      console.log('🎯 Found visible pass at:', currentTime.toISOString(), 'Elevation:', elevation, '(above minimum:', minimumElevation, ')')

      // Found a visible pass - calculate pass details
      const pass = calculatePassDetails(orbitalElements, observerLocation, currentTime, satelliteInfo, minimumElevation)
      if (pass) {
        console.log('✅ Pass details calculated:', pass)
        passes.push(pass)
        // Skip ahead to avoid duplicate passes
        currentTime = new Date(pass.endTime.getTime() + 30 * 60 * 1000) // Skip 30 minutes
      } else {
        currentTime = new Date(currentTime.getTime() + timeStep)
      }
    } else {
      currentTime = new Date(currentTime.getTime() + timeStep)
    }

    stepCount++
  }

  console.log('🏁 Calculation complete. Found', passes.length, 'passes above', minimumElevation, 'degrees')
  return passes.slice(0, 3) // Limit to 3 passes max
}

function parseTLE(tle1, tle2) {
  try {
    console.log('📝 Parsing TLE data...')
    console.log('TLE1:', tle1)
    console.log('TLE2:', tle2)

    // Parse TLE line 1
    const noradId = parseInt(tle1.substring(2, 7))
    const epochYear = parseInt(tle1.substring(18, 20))
    const epochDay = parseFloat(tle1.substring(20, 32))
    const meanMotion1 = parseFloat(tle1.substring(52, 63))
    const meanMotion2 = parseFloat(tle1.substring(63, 68))
    const bstar = parseFloat(tle1.substring(53, 61))

    // Parse TLE line 2
    const inclination = parseFloat(tle2.substring(8, 16))
    const raan = parseFloat(tle2.substring(17, 25))
    const eccentricity = parseFloat('0.' + tle2.substring(26, 33))
    const argumentOfPerigee = parseFloat(tle2.substring(34, 42))
    const meanAnomaly = parseFloat(tle2.substring(43, 51))
    const meanMotion = parseFloat(tle2.substring(52, 63))
    const revolutionNumber = parseInt(tle2.substring(63, 68))

    // Calculate epoch
    const epochYearFull = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear
    const epoch = new Date(epochYearFull, 0, 1)
    epoch.setTime(epoch.getTime() + (epochDay - 1) * 24 * 60 * 60 * 1000)

    const elements = {
      noradId,
      epoch,
      meanMotion,
      meanMotion1,
      meanMotion2,
      bstar,
      inclination: inclination * Math.PI / 180,
      raan: raan * Math.PI / 180,
      eccentricity,
      argumentOfPerigee: argumentOfPerigee * Math.PI / 180,
      meanAnomaly: meanAnomaly * Math.PI / 180,
      revolutionNumber
    }

    console.log('✅ TLE parsed successfully:', elements)
    return elements
  } catch (error) {
    console.error('❌ TLE parsing error:', error)
    return null
  }
}

function calculateElevation(orbitalElements, observerLocation, time) {
  try {
    // Calculate time since epoch
    const timeSinceEpoch = (time - orbitalElements.epoch) / (24 * 60 * 60 * 1000) // days

    // Calculate current mean anomaly
    const meanAnomaly = orbitalElements.meanAnomaly + orbitalElements.meanMotion * timeSinceEpoch * 2 * Math.PI

    // Calculate semi-major axis
    const GM = 398600.4418 // km³/s²
    const n = orbitalElements.meanMotion * 2 * Math.PI / 86400 // rad/s
    const semiMajorAxis = Math.pow(GM / (n * n), 1/3)

    // Calculate satellite position in orbital plane
    const trueAnomaly = solveKeplerEquation(meanAnomaly, orbitalElements.eccentricity)
    const radius = semiMajorAxis * (1 - orbitalElements.eccentricity * orbitalElements.eccentricity) /
                   (1 + orbitalElements.eccentricity * Math.cos(trueAnomaly))

    // Convert to ECI coordinates
    const x = radius * (Math.cos(orbitalElements.raan) * Math.cos(trueAnomaly + orbitalElements.argumentOfPerigee) -
                       Math.sin(orbitalElements.raan) * Math.sin(trueAnomaly + orbitalElements.argumentOfPerigee) * Math.cos(orbitalElements.inclination))
    const y = radius * (Math.sin(orbitalElements.raan) * Math.cos(trueAnomaly + orbitalElements.argumentOfPerigee) +
                       Math.cos(orbitalElements.raan) * Math.sin(trueAnomaly + orbitalElements.argumentOfPerigee) * Math.cos(orbitalElements.inclination))
    const z = radius * Math.sin(trueAnomaly + orbitalElements.argumentOfPerigee) * Math.sin(orbitalElements.inclination)

    // Observer position in ECI
    const observerLatRad = observerLocation.latitude * Math.PI / 180
    const observerLonRad = observerLocation.longitude * Math.PI / 180
    const observerHeight = (observerLocation.altitude || 0) / 1000 // km

    // Calculate observer ECI position
    const observerX = (6378.137 + observerHeight) * Math.cos(observerLatRad) * Math.cos(observerLonRad)
    const observerY = (6378.137 + observerHeight) * Math.cos(observerLatRad) * Math.sin(observerLonRad)
    const observerZ = (6378.137 + observerHeight) * Math.sin(observerLatRad)

    // Calculate look vector
    const lookX = x - observerX
    const lookY = y - observerY
    const lookZ = z - observerZ

    // Calculate elevation angle
    const range = Math.sqrt(lookX * lookX + lookY * lookY + lookZ * lookZ)
    const elevation = Math.asin(lookZ / range) * 180 / Math.PI

    return elevation

  } catch (error) {
    console.error('❌ Elevation calculation error:', error)
    return -90
  }
}

function solveKeplerEquation(meanAnomaly, eccentricity) {
  // Simple Newton-Raphson method for Kepler's equation
  let eccentricAnomaly = meanAnomaly
  for (let i = 0; i < 10; i++) {
    const delta = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
    if (Math.abs(delta) < 1e-6) break
    eccentricAnomaly -= delta / (1 - eccentricity * Math.cos(eccentricAnomaly))
  }

  // Convert to true anomaly
  const trueAnomaly = 2 * Math.atan(Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(eccentricAnomaly / 2))
  return trueAnomaly
}

function calculatePassDetails(orbitalElements, observerLocation, startTime, satelliteInfo, minimumElevation = 0) {
  try {
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours max
    const timeStep = 2 * 60 * 1000 // 2 minutes for detailed calculation

    let currentTime = new Date(startTime)
    let passStart = null
    let passEnd = null
    let maxElevation = -90
    let maxElevationTime = null
    let stepCount = 0
    const maxSteps = 60 // Safety limit

    while (currentTime < endTime && stepCount < maxSteps) {
      const elevation = calculateElevation(orbitalElements, observerLocation, currentTime)

      if (elevation > minimumElevation) {
        if (!passStart) {
          passStart = new Date(currentTime)
        }

        if (elevation > maxElevation) {
          maxElevation = elevation
          maxElevationTime = new Date(currentTime)
        }
      } else if (passStart) {
        passEnd = new Date(currentTime)
        break
      }

      currentTime = new Date(currentTime.getTime() + timeStep)
      stepCount++
    }

    if (passStart && passEnd && maxElevation > minimumElevation) {
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
    console.error('❌ Pass details calculation error:', error)
    return null
  }
}
