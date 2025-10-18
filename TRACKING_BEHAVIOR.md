# Live Satellite Tracking Behavior

## Overview
Live satellite position tracking is **conditionally activated** to optimize API usage and preserve rate limits. The system only fetches real-time position data when the user is actively viewing a satellite pass.

---

## Tracking Activation Conditions

Real-time tracking **ONLY** starts when **ALL** of these conditions are met:

### 1. ✅ Card is Expanded
- User must **click on the pass card** to expand it
- Collapsed cards do **NOT** trigger tracking
- **Why**: No point fetching data if user isn't viewing it

### 2. ✅ Satellite is Passing
- Satellite must be **currently visible** (within pass window)
- Tracks satellite from start time to end time
- **Why**: No positions available before/after the pass

### 3. ✅ N2YO API Key is Configured
- Valid API key must be present in settings
- **Why**: Cannot make API calls without authentication

---

## Tracking State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Card Collapsed                                               │
│  OR                                                           │
│  Not Passing                         ┌──────────────┐         │
│  OR                       ┌──────────┤   INACTIVE   │         │
│  No API Key               │          │  (No Calls)  │         │
│                           │          └──────┬───────┘         │
│                           │                 │                 │
│                           │                 │                 │
│                           │                 │                 │
│  User collapses card      │                 │ User expands    │
│  OR                       │                 │ AND             │
│  Pass ends                │                 │ Satellite       │
│                           │                 │ passing         │
│                           │                 │ AND             │
│                           │                 │ API key valid   │
│                           │                 │                 │
│                           │                 ▼                 │
│                           │          ┌──────────────┐         │
│                           └──────────┤    ACTIVE    │         │
│                                      │  (Tracking)  │         │
│                                      └──────────────┘         │
│                                                               │
│  Active Tracking:                                             │
│  • Fetches 300s positions every 270s                          │
│  • Updates visualization at 60fps                             │
│  • ~13 API calls per hour                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Automatic Tracking Stop

Tracking automatically stops when **ANY** of these occur:

1. **User Collapses Card**
   - User clicks card header to collapse
   - Immediate stop, saves API quota

2. **Pass Ends**
   - Satellite drops below horizon
   - No more positions available

3. **Component Unmounted**
   - User navigates away from page
   - Cleanup prevents orphaned intervals

---

## Implementation Details

### PassCard.vue (Component)

```javascript
watch([() => props.isExpanded, () => props.isPassing], async ([expanded, passing]) => {
  const shouldTrack = expanded && passing
  
  if (shouldTrack && !isTracking.value) {
    // Both conditions met - START tracking
    await startTracking(...)
  } else if (!shouldTrack && isTracking.value) {
    // Condition no longer met - STOP tracking
    stopTracking()
  }
})
```

**Key Points:**
- ✅ Watches both `isExpanded` and `isPassing` props
- ✅ Only starts when BOTH are true
- ✅ Stops immediately when either becomes false
- ✅ Validates API key before starting

### useRealTimePosition.ts (Composable)

```javascript
const startTracking = async (noradId, lat, lng, alt, apiKey) => {
  // Safety checks
  if (isTracking.value) return        // Prevent duplicates
  if (!apiKey) return                 // Require API key
  
  // Start fetching
  isTracking.value = true
  await fetchPositions(...)           // Initial fetch (300s)
  startAnimation()                    // Start 60fps animation
  
  // Schedule periodic updates
  setInterval(() => {
    fetchPositions(...)               // Every 270s
  }, 270000)
}
```

**Safety Checks:**
- ✅ Duplicate tracking prevention
- ✅ API key validation
- ✅ Proper cleanup on stop

---

## Console Logging

The system provides detailed console logs for debugging:

### When Tracking Starts
```
🎯 Starting real-time tracking for ISS (ZARYA)
   ✓ Card expanded: true
   ✓ Satellite passing: true
   → API calls will be made every 270 seconds (4.5 min)
🛰️ Starting real-time tracking for NORAD 25544
   📍 Observer: 44.8178°, 20.4568°
   ⏱️ Fetch interval: 270s (4.5 min)
   📊 API efficiency: ~13 calls/hour per satellite
📡 Fetching positions for NORAD 25544 (300 seconds)
✅ Received 300 position samples (300s of data)
📊 Buffer status: 0 existing + 300 new = 300 total positions
```

### When Tracking Stops
```
🛑 Stopping tracking for ISS (ZARYA): Card collapsed
   → Saving API quota (was making calls every 270s)
🛑 Stopping real-time tracking
   → Saving API quota (no more position fetches)
```

### When Conditions Not Met
```
💤 ISS (ZARYA): Card collapsed - no tracking
⏳ ISS (ZARYA): Not yet passing - no tracking
```

---

## API Usage Impact

### Scenario: Multiple Satellites

| # of Satellites | Cards Expanded | Currently Passing | API Calls/Hour |
|-----------------|----------------|-------------------|----------------|
| 5               | 0              | 2                 | **0**          |
| 5               | 1              | 1                 | **13**         |
| 5               | 2              | 2                 | **26**         |
| 5               | 5              | 3                 | **39**         |
| 10              | 3              | 3                 | **39**         |

**Key Insight**: API usage scales ONLY with:
- Number of **expanded** cards
- That are **currently passing**

Collapsed cards and future passes consume **ZERO** API calls!

---

## User Behavior Patterns

### Pattern 1: Casual Monitoring (Best Case)
```
User looks at upcoming passes → No API calls
User sees ISS passing soon → No API calls
User expands ISS card → Tracking starts (13 calls/hour)
ISS pass ends (10 min) → Tracking stops (used ~2 calls)
User collapses card → Already stopped
```
**Result**: 2 API calls for entire session

### Pattern 2: Active Monitoring (Typical Case)
```
User expands 3 satellite cards
2 are passing, 1 is future → Only 2 start tracking (26 calls/hour)
User keeps cards open for 30 minutes
Passes end naturally → Tracking stops automatically
```
**Result**: ~13 API calls for 30-minute session

### Pattern 3: Power User (Heavy Case)
```
User expands 5 cards, all currently passing → 65 calls/hour
User monitors for 1 hour → 65 total calls
All passes end → 0 calls/hour
```
**Result**: 65 API calls, still well under 1000/hour limit

---

## Benefits

### 1. **API Efficiency**
- ✅ Zero calls for collapsed cards
- ✅ Zero calls for future passes
- ✅ Only active, visible passes consume quota

### 2. **User Control**
- ✅ User explicitly enables tracking by expanding
- ✅ User can disable tracking by collapsing
- ✅ Visual feedback (expanded card = tracking)

### 3. **Automatic Optimization**
- ✅ Stops tracking when pass ends
- ✅ Prevents tracking before pass starts
- ✅ Cleans up on page navigation

### 4. **Multi-Satellite Support**
- ✅ Can expand multiple cards
- ✅ Each tracks independently
- ✅ Still within API limits (77 simultaneous satellites possible)

---

## Edge Cases Handled

### 1. User Expands Card Before Pass Starts
**Behavior**: No tracking until pass actually starts
```javascript
if (expanded && !passing) {
  console.log('⏳ Not yet passing - no tracking')
}
```

### 2. Pass Ends While Card is Expanded
**Behavior**: Tracking stops automatically
```javascript
if (expanded && !passing) {
  stopTracking()  // Pass ended
}
```

### 3. User Collapses Card During Pass
**Behavior**: Tracking stops immediately
```javascript
if (!expanded && passing) {
  stopTracking()  // User closed card
}
```

### 4. User Expands Multiple Cards
**Behavior**: Each tracks independently, API calls multiply
```javascript
// 3 expanded + passing cards = 3 × 13 = 39 calls/hour
// Still well under 1000/hour limit
```

### 5. Missing API Key
**Behavior**: Tracking prevented with warning
```javascript
if (!apiKey) {
  console.warn('⚠️ N2YO API key not configured')
  return  // Don't start tracking
}
```

### 6. Duplicate Start Requests
**Behavior**: Ignored safely
```javascript
if (isTracking.value) {
  console.warn('⚠️ Already tracking - ignoring duplicate')
  return
}
```

---

## Testing Checklist

To verify correct behavior:

- [ ] Collapsed card during pass → No API calls
- [ ] Expanded card during pass → Tracking starts
- [ ] Collapse card during tracking → Tracking stops
- [ ] Expand card before pass → No tracking until pass starts
- [ ] Pass ends while expanded → Tracking stops
- [ ] Multiple expanded cards → Each tracks independently
- [ ] Navigate away → All tracking stops
- [ ] No API key configured → Warning shown, no tracking

---

## Performance Characteristics

### Memory Usage
- **Inactive Card**: ~1KB (just pass data)
- **Active Tracking**: ~10KB (300 position samples)
- **Maximum**: 77 simultaneous tracks × 10KB = ~770KB

### Network Usage
- **Inactive**: 0 bytes
- **Active**: ~15KB per fetch (300 positions × 50 bytes)
- **Per Hour**: 13 fetches × 15KB = ~195KB per satellite

### CPU Usage
- **Inactive**: Negligible
- **Active**: Animation at 60fps (~2% CPU per satellite)
- **Maximum**: 77 satellites × 2% = ~154% CPU (still manageable)

---

## Future Enhancements

### Potential Improvements
1. **Visual Indicator**: Show tracking status in card header
2. **Manual Override**: Allow user to force tracking on/off
3. **Pre-fetching**: Start fetching 30s before pass begins
4. **Shared Data**: Multiple cards for same satellite share positions
5. **Offline Mode**: Continue showing last fetched positions
6. **Rate Limit Display**: Show remaining API quota in UI

---

## Troubleshooting

### Problem: Tracking doesn't start when expanded
**Check**:
1. Is satellite currently passing? (look at pass times)
2. Is N2YO API key configured? (check settings)
3. Check console for error messages
4. Verify observer location is set

### Problem: Too many API calls
**Check**:
1. How many cards are expanded?
2. Are they all during active passes?
3. Each active card = 13 calls/hour

### Problem: Tracking doesn't stop
**Check**:
1. Is card actually collapsed? (visual check)
2. Did pass actually end? (check end time)
3. Look for error messages in console
4. Refresh page to force cleanup

---

## Summary

The live tracking system is **intelligently optimized** to only fetch data when:
- ✅ User is actively viewing (card expanded)
- ✅ Satellite is currently visible (passing)
- ✅ API credentials are configured

This design ensures:
- 🚀 **Maximum API efficiency**
- 👤 **User control and transparency**
- 🔧 **Automatic optimization**
- 📊 **Support for multiple satellites**

**Result**: Rich live tracking experience without wasting API quota!

---

**Last Updated**: 2025-10-18  
**Version**: 2.0  
**Related**: API_OPTIMIZATION_SUMMARY.md

