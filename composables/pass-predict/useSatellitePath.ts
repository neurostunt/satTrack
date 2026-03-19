/**
 * Satellite Path Composable
 * Arc path logic for polar plot SVG (azimuth/elevation → Cartesian)
 * Extracted from PolarPlot.vue and ArPolarPlot.vue
 */

export interface PositionPoint {
  azimuth: number
  elevation: number
  timestamp?: number
}

export interface CartesianPoint {
  x: number
  y: number
}

export const useSatellitePath = () => {
  const { center, elevationToRadius } = usePolarPlotBackground()

  const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180

  const normalizeAzimuth = (azimuth: number): number =>
    ((azimuth % 360) + 360) % 360

  const polarToCartesian = (azimuth: number, elevation: number): CartesianPoint => {
    const r = elevationToRadius(elevation)
    const angleRad = degreesToRadians(azimuth)
    return {
      x: center + r * Math.sin(angleRad),
      y: center - r * Math.cos(angleRad)
    }
  }

  const getCircleCenter = (p1: CartesianPoint, p2: CartesianPoint, p3: CartesianPoint): CartesianPoint | null => {
    const ax = p1.x; const ay = p1.y
    const bx = p2.x; const by = p2.y
    const cx = p3.x; const cy = p3.y

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if (Math.abs(d) < 0.0001) return null

    const ux = (
      (ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)
    ) / d

    const uy = (
      (ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)
    ) / d

    return { x: ux, y: uy }
  }

  const generatePathWithWraparound = (positions: PositionPoint[]): string | null => {
    if (!positions || positions.length < 2) return null

    const segments: PositionPoint[][] = []
    let currentSegment: PositionPoint[] = []

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      currentSegment.push(pos)

      if (i < positions.length - 1) {
        const nextPos = positions[i + 1]
        const azDiff = Math.abs(nextPos.azimuth - pos.azimuth)
        if (azDiff > 180) {
          segments.push([...currentSegment])
          currentSegment = []
        }
      }
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment)
    }

    let path = ''
    for (const segment of segments) {
      if (segment.length < 2) continue

      const points = segment.map(pos => polarToCartesian(pos.azimuth, pos.elevation))

      if (path === '') {
        path = `M ${points[0].x} ${points[0].y}`
      } else {
        path += ` M ${points[0].x} ${points[0].y}`
      }

      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`
      }
    }

    return path || null
  }

  const computePeakAzimuth = (params: {
    startAzimuth: number | null
    endAzimuth: number | null
    maxAzimuth?: number | null
    maxElevation?: number | null
  }): number | null => {
    const { startAzimuth, endAzimuth, maxAzimuth, maxElevation } = params
    if (maxElevation == null || maxElevation === undefined) return null

    if (maxAzimuth != null && maxAzimuth !== undefined) {
      return normalizeAzimuth(maxAzimuth)
    }

    if (startAzimuth != null && endAzimuth != null) {
      let peakAzimuthValue = (startAzimuth + endAzimuth) / 2
      if (Math.abs(endAzimuth - startAzimuth) > 180) {
        if (endAzimuth > startAzimuth) {
          peakAzimuthValue = ((startAzimuth + endAzimuth + 360) / 2) % 360
        } else {
          peakAzimuthValue = ((startAzimuth + endAzimuth - 360) / 2 + 360) % 360
        }
      }
      return normalizeAzimuth(peakAzimuthValue)
    }

    return null
  }

  const computePredictedArcPath = (
    entryPoint: CartesianPoint,
    peakPoint: CartesianPoint,
    exitPoint: CartesianPoint,
    extendBy = 40
  ): string => {
    const p1 = entryPoint
    const p2 = peakPoint
    const p3 = exitPoint

    const cc = getCircleCenter(p1, p2, p3)
    if (!cc) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
    }

    const arcR = Math.hypot(p1.x - cc.x, p1.y - cc.y)

    let angle1 = Math.atan2(p1.y - cc.y, p1.x - cc.x)
    let angle2 = Math.atan2(p2.y - cc.y, p2.x - cc.x)
    let angle3 = Math.atan2(p3.y - cc.y, p3.x - cc.x)

    const unwrap = (base: number, a: number) => {
      let angle = a
      while (angle - base > Math.PI) angle -= 2 * Math.PI
      while (angle - base < -Math.PI) angle += 2 * Math.PI
      return angle
    }
    angle2 = unwrap(angle1, angle2)
    angle3 = unwrap(angle2, angle3)

    const d12 = angle2 - angle1
    const d23 = angle3 - angle2
    const sweepSign = d12 >= 0 ? 1 : -1

    const delta = extendBy / arcR
    const preAngle = angle1 - sweepSign * delta
    const postAngle = angle3 + sweepSign * delta

    const preEntry = { x: cc.x + arcR * Math.cos(preAngle), y: cc.y + arcR * Math.sin(preAngle) }
    const postExit = { x: cc.x + arcR * Math.cos(postAngle), y: cc.y + arcR * Math.sin(postAngle) }

    const sweepFlag = d12 >= 0 ? 1 : 0
    const extSpan = sweepSign > 0 ? postAngle - preAngle : preAngle - postAngle
    const largeArcFlag = (d12 * d23 < 0 || extSpan > Math.PI) ? 1 : 0

    return `M ${preEntry.x} ${preEntry.y} A ${arcR} ${arcR} 0 ${largeArcFlag} ${sweepFlag} ${postExit.x} ${postExit.y}`
  }

  return {
    center,
    polarToCartesian,
    getCircleCenter,
    generatePathWithWraparound,
    normalizeAzimuth,
    computePeakAzimuth,
    computePredictedArcPath
  }
}
