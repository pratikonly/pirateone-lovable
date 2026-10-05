# Keep Sports Match Open After Refresh

## Goal
Give each selected live match its own `/sports/:matchId` URL so refreshing restores the same player instead of returning to the Sports list.

## Changes
- Add a Sports match route alongside the existing `/sports` route.
- Update match selections, related-match selections, and the back action to navigate through the browser URL.
- After live matches load, restore the selected match from the URL.
- If the match is no longer live or the URL is invalid, show the Sports listing rather than a broken player.

## Technical details
- Use React Router route parameters and navigation; no new storage or backend changes.
- URL-encode the match ID and preserve the existing Sports player design and direct embed behavior.
