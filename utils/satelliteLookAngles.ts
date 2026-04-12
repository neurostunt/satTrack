import {
  propagate,
  gstime,
  twoline2satrec,
  eciToEcf,
  ecfToLookAngles,
  eciToGeodetic,
  degreesLat,
  degreesLong
} from 'satellite.js'
import type { SatRec } from 'satellite.js'
import { normalizeAzimuthDeg } from '~/utils/angleMath'

export interface LookAngleResult {
  timestamp: number
  azimuth: number
  elevation: number
  distance: number
  satLatitude: number
  satLongitude: number
  satAltitude: number
}

const rad2deg = (r: number) => (r * 180) / Math.PI

/**
 * Observer WGS84: latitude/longitude degrees, altitude meters.
 * Returns null if propagation fails (decayed orbit, bad TLE, etc.).
 */
export function computeLookAnglesFromTle(
  satrec: SatRec,
  observerLatDeg: number,
  observerLngDeg: number,
  observerAltMeters: number,
  date: Date
): LookAngleResult | null {
  const pv = propagate(satrec, date)
  if (!pv || typeof pv.position === 'boolean' || !pv.position) {
    return null
  }

  const gmst = gstime(date)
  const positionEcf = eciToEcf(pv.position, gmst)
  const positionGd = eciToGeodetic(pv.position, gmst)

  const observerGd = {
    longitude: (observerLngDeg * Math.PI) / 180,
    latitude: (observerLatDeg * Math.PI) / 180,
    height: observerAltMeters / 1000
  }

  const look = ecfToLookAngles(observerGd, positionEcf)
  const azimuth = normalizeAzimuthDeg(rad2deg(look.azimuth))
  const elevation = rad2deg(look.elevation)
  const distance = look.rangeSat

  const satLatDeg = degreesLat(positionGd.latitude)
  const satLngDeg = degreesLong(positionGd.longitude)

  return {
    timestamp: date.getTime(),
    azimuth,
    elevation,
    distance,
    satLatitude: satLatDeg,
    satLongitude: satLngDeg,
    satAltitude: positionGd.height
  }
}

export function createSatRecFromTle(line1: string, line2: string): SatRec {
  return twoline2satrec(line1, line2)
}
