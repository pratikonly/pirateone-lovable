
# Ad Blocker Implementation for Video Player

## Overview
Create a protective wrapper around the VideoPlayer iframe that intercepts and blocks common ad redirect techniques used by third-party video embed services.

## Technical Implementation

### 1. Create New AdBlockWrapper Component
**File:** `src/components/AdBlockWrapper.tsx`

A wrapper component that will contain all ad-blocking logic:

```text
┌─────────────────────────────────────────┐
│          AdBlockWrapper                 │
│  ┌───────────────────────────────────┐  │
│  │    Click Shield Overlay           │  │
│  │    (captures first click)         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │    VideoPlayer (iframe)           │  │
│  │    with sandbox restrictions      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 2. Protection Features

#### Click Shield
- Overlay div that requires 2 rapid clicks (within 500ms) to "unlock" the player
- After unlock, the overlay becomes transparent and allows pointer events to pass through
- Blocks sneaky first-click hijacks that open new tabs
- Shows visual feedback (pulse animation) on first click

#### Iframe Sandbox Restrictions
- Current sandbox allows too much; will restrict to only essential permissions:
  - `allow-scripts` - Required for player functionality
  - `allow-same-origin` - Required for player to work
  - Remove `allow-popups` - Prevents popup windows
  - Remove `allow-top-navigation` - Prevents navigating the parent page

#### History Protection
- Override `history.pushState` and `history.replaceState` to filter malicious URL changes
- Block `popstate` events that try to redirect via history manipulation
- Prevent hash changes that aren't initiated by the user

#### Focus/Visibility Monitoring
- Detect when focus is stolen from the page
- Catch tab-stealing attempts
- Return focus to the main window when ad attempts to steal it

#### MutationObserver
- Monitor DOM for dynamically injected elements:
  - Hidden iframes
  - Overlay divs
  - Script tags from ad networks
- Auto-remove detected ad elements

#### PostMessage Filtering
- Filter incoming `postMessage` events from the iframe
- Block suspicious cross-origin messages
- Allow only legitimate player communication

#### Dialog Overrides
- Override `window.alert`, `window.confirm`, `window.prompt` within the wrapper context
- Block ad dialogs while allowing legitimate use

### 3. File Changes

| File | Change |
|------|--------|
| `src/components/AdBlockWrapper.tsx` | **NEW** - Main ad blocking wrapper component |
| `src/components/VideoPlayer.tsx` | Wrap content with AdBlockWrapper, update sandbox attrs |
| `src/hooks/useAdBlocker.ts` | **NEW** - Custom hook for ad blocking logic |

### 4. User Experience

- First click on player shows a subtle "tap again to play" indicator
- Second tap within 500ms activates the player normally
- No interruption to normal playback once "unlocked"
- Player stays unlocked for the session (stored in state)
- Visual indicator shows protected status

### 5. Build Errors to Fix
Also need to fix the existing TypeScript errors in Watch.tsx:
- Lines 145 and 182: `mediaType === 'anime'` comparison is invalid because the schema only allows `'movie' | 'tv'`
- Will update the logic to handle anime properly or remove dead code
