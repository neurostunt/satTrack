# Azimuth Wraparound Bug Fix

## Problem Description

Predicted satellite passes that crossed the 0°/360° azimuth boundary (North direction) were drawn as **two curved lines forming an "M" shape** instead of one smooth arc.

### Visual Example
```
   N (0°)
    |
    |
W---.---E  ← Observer (center)
   / \    ← Wrong: "M" shape
  /   \
 /     \
```

**Expected**: One smooth arc  
**Actual**: Two arcs forming wide "M" shape

---

## Root Cause

The predicted path was generated correctly using `interpolateAzimuth()` which handles angle wraparound, **BUT** when drawing the SVG path with continuous line segments, any consecutive points crossing the 0°/360° boundary would draw a line "the long way around" instead of splitting into segments.

### Code Analysis

**Before (Broken)**:
```javascript
// Generate points
for (let i = 0; i <= 20; i++) {
  azimuth = interpolateAzimuth(startAz, endAz, t)  // ✅ Correct interpolation
  points.push(polarToCartesian(azimuth, elevation))
}

// Draw path - BROKEN!
let path = `M ${points[0].x} ${points[0].y}`
for (let i = 1; i < points.length; i++) {
  path += ` L ${points[i].x} ${points[i].y}`  // ❌ Draws through center when crossing boundary
}
```

**Example**:
- Point 1: azimuth = 355° ✅
- Point 2: azimuth = 5° ✅ (correctly wrapped)
- SVG draws: 355° → **180° (through center)** → 5° ❌ **"M" shape!**

---

## Solution

Use the same `generatePathWithWraparound()` function that handles live position data. This function:
1. Detects when azimuth jumps > 180° (boundary crossing)
2. Splits the path into multiple segments
3. Draws each segment separately with `M` (move) commands

**After (Fixed)**:
```javascript
// Generate position objects
const positions = []
for (let i = 0; i <= 50; i++) {  // Increased samples for smoother arc
  const azimuth = interpolateAzimuth(startAz, endAz, t)
  const elevation = props.maxElevation * Math.sin(t * Math.PI)
  positions.push({ azimuth, elevation })
}

// Use segmentation logic - FIXED!
return generatePathWithWraparound(positions)
```

**generatePathWithWraparound() logic**:
```javascript
// Detect boundary crossings
if (Math.abs(nextPos.azimuth - pos.azimuth) > 180) {
  // Split into new segment
  segments.push([...currentSegment])
  currentSegment = []  // Start fresh
}

// Draw each segment separately
for (const segment of segments) {
  path += ` M ${points[0].x} ${points[0].y}`  // Move to start
  // Draw segment...
}
```

---

## Test Cases

### Case 1: Pass crossing North (NW → NE)
```
Start: 315° (NW)
End: 45° (NE)
Crossing: 0° (North)

Before: Two arcs (315°→180°→0° and 0°→180°→45°) = "M" shape ❌
After: One arc (315°→360°/0°→45°) = Smooth curve ✅
```

### Case 2: Pass crossing North (NE → NW)
```
Start: 45° (NE)
End: 315° (NW)
Crossing: 0° (North)

Before: Two arcs forming "M" shape ❌
After: One smooth arc going counter-clockwise ✅
```

### Case 3: Pass NOT crossing boundary
```
Start: 90° (E)
End: 180° (S)
No crossing

Before: One arc ✅ (worked by accident)
After: One arc ✅ (still works correctly)
```

### Case 4: Pass crossing multiple times (rare)
```
Polar orbit passing near zenith

Before: Multiple "M" shapes ❌
After: Correctly segmented path ✅
```

---

## Code Changes

**File**: `components/pass-predict/PolarPlot.vue`

### Change 1: Generate position objects instead of SVG points
```diff
- const points = []
+ const positions = []

- const samples = 20
+ const samples = 50  // Increased for smoother arc

  for (let i = 0; i <= samples; i++) {
    const azimuth = interpolateAzimuth(startAz, endAz, t)
    const elevation = props.maxElevation * Math.sin(t * Math.PI)
    
-   const point = polarToCartesian(azimuth, elevation)
-   points.push(point)
+   positions.push({ azimuth, elevation })
  }
```

### Change 2: Use segmentation function
```diff
- // Create SVG path
- if (points.length === 0) return null
- 
- let path = `M ${points[0].x} ${points[0].y}`
- for (let i = 1; i < points.length; i++) {
-   path += ` L ${points[i].x} ${points[i].y}`
- }
- 
- return path
+ // Use the same segmentation logic as live paths to handle boundary crossings
+ return generatePathWithWraparound(positions)
```

---

## Verification

### Visual Confirmation
1. **Predicted path** (dashed blue): Now matches the shape of live tracking
2. **Live path** (solid green): Already worked correctly
3. **Both paths**: Should align when satellite is passing

### Console Verification
No errors or warnings about invalid paths should appear.

### Test Satellites
Satellites that cross North (good test cases):
- ISS (ZARYA) - passes near North from many locations
- Most polar orbit satellites
- Any satellite with startAz > 270° and endAz < 90°

---

## Related Fixes

This completes the azimuth wraparound fixes:
1. ✅ **Past path** - Fixed earlier with `generatePathWithWraparound()`
2. ✅ **Future path** - Fixed earlier with `generatePathWithWraparound()`
3. ✅ **Predicted path** - Fixed now with same function
4. ✅ **interpolateAzimuth()** - Already correct for angle calculation

---

## Performance Impact

**Before**:
- 20 samples per predicted path
- Simple line drawing

**After**:
- 50 samples per predicted path (smoother)
- Segmented path drawing (slightly more complex)

**Impact**: Negligible - computed once per pass, not per frame

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Predicted path crossing North | "M" shape ❌ | Smooth arc ✅ |
| Live path crossing North | Already correct ✅ | Still correct ✅ |
| Samples per path | 20 | 50 (smoother) |
| Boundary handling | Broken | Fixed |
| Code consistency | Mixed approach | Unified approach |

**Result**: All path types (predicted, past, future) now use the **same reliable wraparound handling**! 🎉

---

**Date**: 2025-10-18  
**Commit**: Next commit  
**Related**: PolarPlot.vue, TRACKING_BEHAVIOR.md

