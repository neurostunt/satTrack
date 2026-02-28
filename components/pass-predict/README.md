# 🛰️ Real-Time Satellite Position Visualization

## Overview

This feature provides real-time satellite tracking during passes using a polar plot visualization.

## Components

### 1. **PolarPlot.vue**
Visual component that displays satellite position on a polar coordinate system.

**What it shows:**
- Two concentric circles (elevation markers: 30°, 60°) with full N↔S / E↔W crosshair lines
- Compass labels (N, E, S, W) positioned outside the outer circle
- Predicted arc (blue dashed) — static, extends slightly beyond the horizon circle on both ends following the same curvature
- Entry/AOS dot (green) and Exit/LOS dot (red) on the horizon circle edge; Peak dot (gray) at max elevation
- N2YO future path (green dashed) — only upcoming 60s, drawn on top of the predicted arc
- Current satellite position (🛰️ emoji)

**Display logic:**
- Center = Observer (you)
- Top = North (0° azimuth)
- Outer edge = Horizon (0° elevation)
- Inner area = Higher elevation (90° at center)

### 2. **useRealTimePosition.ts**
Composable that handles API calls and position tracking.

**Key functions:**
- `startTracking()` - Begins fetching positions every 45 seconds
- `stopTracking()` - Ends tracking and cleans up
- `fetchPositions()` - Gets 60s of position data from N2YO API
- Animation loop - Smoothly updates position at 60fps

**API Usage:**
- Fetches 60 seconds of positions per call
- Updates every 45 seconds (before buffer runs out)
- ~4 API calls per 10-minute pass
- Very efficient: can track 200+ passes per day within quota

### 3. **useSatellitePath.ts**
Helper composable for path logic and formatting.

**Key functions:**
- `shouldShowRealTimeTracking()` - True when satellite is passing
- `shouldShowPredictedPath()` - True 10 min before pass
- `formatPositionInfo()` - Formats elevation/azimuth/distance for display
- `getCompassDirection()` - Converts azimuth to N/NE/E/SE/etc

## How It Works

### Phase 1: Before Pass (10 min warning)
```
User sees: Predicted path (blue dashed arc)
Data source: Pass prediction data (start/end azimuth, max elevation)
API calls: 0 ✅
```

### Phase 2: During Pass (satellite is passing)
```
User sees: Real-time tracking with all paths
- Predicted arc (blue dashed - full static arc, always visible)
- Future path (green dashed - next 60s only, no past trail)
- Current position (🛰️ emoji)
- Entry/exit/peak dots remain visible throughout

Data source: N2YO positions API
API calls: ~1 every 45 seconds
```

### Phase 3: After Pass
```
Visualization disappears
All data cleared
API tracking stopped
```

## Integration

The visualization automatically appears in the PassCard component when:
1. Card is expanded (user tapped to view details)
2. Satellite is passing OR within 10 min of pass start

**User interaction:**
- Tap satellite card → Opens details
- If passing → Starts real-time tracking
- If not passing yet but within 10 min → Shows predicted path
- Tap to collapse → Stops tracking (saves API calls)

## API Budget

**Single satellite pass (10 minutes):**
- 4 API calls (one every 45 seconds)
- 0.4% of hourly quota

**Typical daily usage (8 passes):**
- 32 API calls
- 3.2% of daily quota
- Very sustainable! ✅

**Heavy usage (20 passes watched):**
- 80 API calls
- 8% of daily quota
- Still well within limits ✅

## Performance

- **60fps smooth animation** using `requestAnimationFrame`
- **Interpolation** between API samples for smooth movement
- **SVG-based** - lightweight, scalable, no libraries needed
- **Auto-cleanup** when pass ends or card collapses

## Future Enhancements

Possible additions (not implemented yet):
- Doppler shift calculation (if transmitter selected)
- Signal strength indicator (based on elevation)
- Multi-satellite tracking (track 2-3 simultaneously)
- Export path data as KML/GPX for other apps

