

# Fix Video Player Sandbox Issue & Improve Ad Block Counter

## Problem
The iframe `sandbox` attribute is too restrictive. The video player embed service detects sandbox restrictions and shows an error:
> "Iframe Sandbox Detected - This iframe has sandbox restrictions that prevent proper functionality."

## Solution

### 1. Remove Iframe Sandbox Restrictions
**File:** `src/components/VideoPlayer.tsx`

The sandbox attribute needs to be removed entirely. Many video player services require full browser capabilities to function (popups for quality settings, navigation for certain features, etc.).

**Before:**
```tsx
sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
```

**After:**
Remove the sandbox attribute completely. The other protections (click shield, history blocking, mutation observer) will still provide security without breaking the player.

### 2. Improve the Ad Blocked Counter Display
**File:** `src/components/AdBlockWrapper.tsx`

Make the blocked count more prominent and always visible:
- Show "0 blocked" when nothing is blocked (so users know protection is active)
- Add a subtle animation when the count increases
- Improve styling for better visibility

### File Changes

| File | Change |
|------|--------|
| `src/components/VideoPlayer.tsx` | Remove `sandbox` attribute from iframe |
| `src/components/AdBlockWrapper.tsx` | Always show blocked count, add animation on increment |

### Why This Works
- The click shield still prevents first-click hijacks
- History manipulation protection remains active
- MutationObserver still removes injected ad elements
- PostMessage filtering still blocks suspicious messages
- Dialog overrides still block ad popups
- The player can now function normally without sandbox restrictions

