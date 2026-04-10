/** Normalize degrees to [0, 360). */
export function normalizeAzimuthDeg(deg: number): number {
  let x = deg % 360
  if (x < 0) x += 360
  return x
}

/** Shortest-path linear interpolation between two azimuths in degrees. */
export function lerpAzimuthDeg(from: number, to: number, t: number): number {
  let diff = to - from
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return normalizeAzimuthDeg(from + diff * t)
}
