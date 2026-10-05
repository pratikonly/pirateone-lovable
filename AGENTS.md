# Project architecture

- Keep streaming providers centralized in `src/lib/tmdb.ts`; the Watch page consumes ordered server metadata and URL generation from that module so numbering and playback stay synchronized.
- Keep the selected Sports match in the `/sports/:matchId` route so direct links and browser refresh restore the player.