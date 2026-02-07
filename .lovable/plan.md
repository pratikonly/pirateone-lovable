

# Feature Updates: Download, Ad Badge Toggle, and Ad Popup Confirmation

## 1. Download Button for Movies, TV Shows, and Anime

Add a download button on the Watch page that opens a third-party download link in a new tab. Since direct file downloads from streaming embeds aren't possible, we'll use a download aggregator service.

### Changes to `src/pages/Watch.tsx`:
- Add a `Download` button (using the `Download` icon from lucide-react) next to the existing action buttons (watchlist, etc.)
- The button will open a download link using a service like `dl.vidsrc.vip` which provides download links by TMDB ID
- For movies: `https://dl.vidsrc.vip/movie/{id}`
- For TV: `https://dl.vidsrc.vip/tv/{id}/{season}/{episode}`
- Opens in a new tab with `noopener,noreferrer`

### New helper in `src/lib/tmdb.ts`:
- Add a `getDownloadUrl()` function that generates the download URL based on type, id, season, episode

---

## 2. Ad Blocker Badge - Hidden by Default with Toggle

The "Protected | X ads blocked" badge will be hidden by default. A small shield icon button will sit in the corner that users can click to expand/collapse the full badge.

### Changes to `src/components/AdBlockWrapper.tsx`:
- Add `badgeExpanded` state, defaulting to `false`
- When collapsed: show only a small circular shield icon button (clickable)
- When expanded: show the full badge with "Protected | X ads blocked" text
- Clicking the shield toggles between expanded and collapsed
- Smooth transition animation between states

---

## 3. Ad Popup Confirmation Dialog

Instead of silently blocking `window.open` calls, show a confirmation dialog asking the user if they want to allow the popup.

### Changes to `src/hooks/useAdBlocker.ts`:
- Modify the `window.open` override to store the blocked URL and trigger a callback
- Add a new callback option `onPopupBlocked` that passes the URL to the parent component

### Changes to `src/components/AdBlockWrapper.tsx`:
- Add state for `pendingPopupUrl` and `showPopupDialog`
- When a popup is blocked, show an AlertDialog asking "An ad is trying to open: [url]. Do you want to allow it?"
- "Block" button dismisses the dialog (default action)
- "Open Anyway" button opens the URL in a new tab
- Import and use AlertDialog components from the existing UI library

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/lib/tmdb.ts` | Add `getDownloadUrl()` function |
| `src/pages/Watch.tsx` | Add Download button with download icon |
| `src/components/AdBlockWrapper.tsx` | Hide badge by default with toggle button; add popup confirmation dialog |
| `src/hooks/useAdBlocker.ts` | Add `onPopupBlocked` callback to pass blocked URLs to parent |

## Technical Details

**Download URL Pattern:**
- Movie: `https://dl.vidsrc.vip/movie/{tmdbId}`
- TV/Anime: `https://dl.vidsrc.vip/tv/{tmdbId}/{season}/{episode}`

**Badge Toggle Flow:**
1. Component mounts with `badgeExpanded = false`
2. Only a small shield icon is visible in the top-right corner
3. User clicks the icon to expand and see "Protected | X ads blocked"
4. Clicks again to collapse back to just the icon

**Popup Confirmation Flow:**
1. Ad tries to call `window.open(url)`
2. Instead of silently blocking, `onPopupBlocked(url)` is called
3. AdBlockWrapper shows an AlertDialog with the URL
4. User chooses "Block" (default) or "Open Anyway"
5. If "Open Anyway", the original `window.open` is called with the URL

