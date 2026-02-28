# In-Transit Pass Visualization Fix

## Problem

When a satellite is **already passing** (in-transit) when the pass-predict card is opened:

1. **Entry/Exit points** were calculated from pass prediction data (assuming full pass from start)
2. **Predicted path** showed the full arc from entry → peak → exit
3. **Real-time N2YO positions** started from **current time** (mid-pass)

This created a mismatch:
- Entry point showed where satellite **entered** at pass start time (in the past)
- Real-time tracking started from **now** (mid-pass)
- The two paths didn't align, causing visual confusion

## Solution

Added `isInTransit` flag to detect when a pass has already started:

### Changes Made

1. **`PassCard.vue`**:
   - Added `isPassInTransit` computed property (checks if current time is between pass start/end)
   - Passed `isInTransit` prop to `PolarPlot` component

2. **`PolarPlot.vue`**:
   - Added `isInTransit` prop
   - Updated `entryPoint` computed: **hides entry point** for in-transit passes
   - Updated `predictedPath` computed: **hides predicted path** for in-transit passes

### Behavior

#### Future Passes (Not Started)
- ✅ Shows entry point at horizon (startAzimuth, 0°)
- ✅ Shows full predicted path arc (entry → peak → exit)
- ✅ Shows exit point at horizon (endAzimuth, 0°)
- ✅ Shows peak point

#### In-Transit Passes (Already Started)
- ❌ **Hides** entry point (would be in the past)
- ❌ **Hides** predicted path arc (N2YO provides actual path)
- ✅ Shows exit point at horizon (endAzimuth, 0°)
- ✅ Shows peak point
- ✅ Shows real-time N2YO position (current dot)
- ✅ Shows N2YO past path (green line from history)
- ✅ Shows N2YO future path (green line from buffer)

## Result

- In-transit passes now rely entirely on N2YO real-time data for path visualization
- No more mismatch between predicted entry and actual satellite position
- Exit point still shown (future reference)
- Peak point still shown (highest elevation reference)

## Technical Details

**Detection Logic**:
```js
const isPassInTransit = computed(() => {
  const now = Date.now()
  return now > props.pass.startTime && now < props.pass.endTime
})
```

**Entry Point Logic**:
```js
if (props.isInTransit) return null // Hide for in-transit passes
```

**Predicted Path Logic**:
```js
if (props.isInTransit) return null // Hide for in-transit passes
```

## Files Modified

- `components/pass-predict/PassCard.vue`
- `components/pass-predict/PolarPlot.vue`
