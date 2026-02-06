

# Complete Ad-Blocking Overhaul

## What's Changing

Rebuild the ad-blocking system with all techniques from the guide, including a click shield with "double-click to play" UX, visibility change detection, stricter MutationObserver patterns, and improved blocked-ad counter.

## Changes

### 1. Rewrite `src/hooks/useAdBlocker.ts`

Upgrade every protection layer:

- **window.open**: Block ALL external popups (already done, keep as-is)
- **alert/confirm/prompt**: Block ALL prompts entirely (not just suspicious ones) since they're rarely legitimate from video players. Keep alerts/confirms with expanded suspicious keyword list (`ad`, `click`, `congratulations`, `leave`, `virus`, `malware`, etc.)
- **History API**: Already good, keep as-is
- **Focus/Blur**: Add `visibilitychange` listener alongside existing blur detection. When document becomes hidden unexpectedly, force focus back and count as blocked
- **PostMessage**: Expand suspicious keywords to include `ad`, `click`, `popup`, `redirect`, `track`, `analytics`, `banner`
- **MutationObserver**: Lower z-index threshold from 9999 to 1000 for overlay detection. Also detect and remove external iframes/scripts whose `src` doesn't match the legitimate player domains. Add `sponsor` to suspicious class/id patterns

### 2. Add Click Shield to `src/components/AdBlockWrapper.tsx`

Re-introduce a smarter click shield:

- Transparent overlay sits on top of the iframe (z-index 20)
- First click is intercepted and counted as a blocked ad
- User must click twice within 2 seconds to disable the shield
- Shield re-enables after 10 seconds of no interaction
- Shows subtle "Click twice to play (ad protection)" hint at the bottom
- State: `clickShieldActive` (boolean), `clickCount` (number), `lastClickTime` (ref)

### 3. Update `src/components/VideoPlayer.tsx`

- Change `referrerPolicy` from `no-referrer-when-downgrade` to `no-referrer` (prevents iframe from knowing where user came from, blocks tracking)

### 4. Improve Protection Badge in `src/components/AdBlockWrapper.tsx`

- Show "X ads blocked" with proper singular/plural ("1 ad blocked" vs "3 ads blocked")
- Keep existing animation on increment

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useAdBlocker.ts` | Add visibilitychange detection, expand postMessage keywords, lower MutationObserver z-index threshold to 1000, remove external iframes/scripts, block all prompts |
| `src/components/AdBlockWrapper.tsx` | Add click shield overlay with double-click-to-play logic, improve counter text (singular/plural) |
| `src/components/VideoPlayer.tsx` | Change referrerPolicy to `no-referrer` |

## Technical Details

**Click Shield Flow:**
1. Component mounts with `clickShieldActive = true`
2. User clicks the overlay -- first click blocked, counter incremented
3. If user clicks again within 2 seconds, shield disables for 10 seconds
4. After 10 seconds, shield re-enables automatically
5. If more than 2 seconds between clicks, click count resets

**MutationObserver Enhancement:**
- Current: only checks z-index > 9999 for overlays
- New: checks z-index > 1000, also removes any injected `iframe` or `script` whose `src` doesn't contain known player domains (videasy, vidking, vidzee, etc.)

**Visibility Change Detection:**
- Listens to `visibilitychange` event
- If document becomes hidden unexpectedly (within 100ms), counts as ad block and forces focus back

