# PirateOne Website — Complete Functional Feature Reference

This document describes the website's current uses, user-facing features, data behavior, integrations, and known implementation limitations. It intentionally excludes visual and design details.

## 1. What the website is for

PirateOne is a movie, TV-series, and anime discovery and streaming web application. It lets visitors:

- Discover trending, popular, top-rated, now-playing, TV, anime, and recommended content.
- Search by title or by TMDB ID.
- Open a title's details page and watch it through external streaming providers.
- Choose between multiple playback servers.
- Watch trailers, browse related content, read TMDB reviews, and inspect movie collections.
- Add titles to a watchlist.
- Sign in to synchronize watchlist and other cloud-backed data.
- Track watch progress for supported players.
- Continue watching unfinished movies and episodes.
- Create private or public collections when signed in.
- Check the availability of the configured streaming servers.
- Submit feedback and read help/FAQ information.

The application does not host or store video files. Video playback and downloads are delegated to third-party providers.

## 2. Routes and entry points

### Main application routes

These routes use the shared application layout and navigation:

| Route | Function |
|---|---|
| `/` | Home/discovery page |
| `/movies` | Movie catalog with Popular, Now Playing, and Top Rated tabs |
| `/series` | TV-series catalog with Popular and Top Rated tabs |
| `/anime` | Anime discovery catalog |
| `/search` | Title, movie/TV, filter, and TMDB ID search |
| `/watchlist` | Local/cloud watchlist and signed-in collections |
| `/settings` | Identity, profile, playback preferences, statistics, notifications, and data clearing |
| `/help` | Feedback form, FAQs, tips, feature information, and server guidance |
| `/sports` | Opens the separate Strike sports application |
| `/watch/:type/:id` | Movie or TV title details and playback |

### Standalone routes

These routes do not use the normal shared layout:

| Route | Function |
|---|---|
| `/auth` | Sign in, sign up, and password-reset request |
| `/reset-password` | Set a new password after a valid recovery link |
| `/server` | Streaming-provider health/status monitor |
| Any unmatched path | Not-found page |

### Valid watch route types

- `movie`
- `tv`

The watch route validates that the ID is a positive integer. Invalid route parameters are converted internally to an invalid movie lookup and result in the Content not found state rather than a dedicated redirect.

Anime catalog items use the media type returned by TMDB, normally movie or TV. There is no separate `/watch/anime/:id` route.

## 3. Global navigation and application behavior

### Navigation

The floating navigation provides:

- Home
- Movies
- Series
- Anime
- Live (coming soon)

The active route is highlighted. Live is currently a placeholder button and does not open a page.

A separate floating quick-actions button links to Help, Watchlist, and Sports.
The shared navbar contracts into a floating bar while scrolling down, expands back while scrolling up, and returns to its hero-top position at the top of the page. It is shown across all routes.

The account/header area provides:

- Global search button.
- Profile button that opens sign-up for guests.
- Avatar/account menu for signed-in users.
- Get New Identity.
- Settings.
- Sign Out.

Route changes use client-side React Router navigation. The shared layout remains mounted, and route content uses a page transition instead of a full browser reload.

A large PirateOne wordmark is centered in the footer on every route.

### Global search shortcut

- Press `/` outside an input, textarea, or editable element to open search.
- `Escape` closes the header search overlay.
- The header search overlay shows up to eight matching results.
- Selecting a result opens its watch page.
- A See all action opens `/search?q=...`.

The layout also has a separate `/` keyboard handler that navigates to `/search`, so the exact result can depend on which handler processes the key first.

### F4 overlay

The application globally listens for `F4`:

- Pressing `F4` prevents the browser's default behavior.
- It toggles a full-screen “Please wait...” overlay.
- The overlay is only a manual status display; it is not connected to actual loading state.

### Welcome notice

On normal layout-backed routes, a first-visit notice appears after a one-second delay unless the current notification version has already been dismissed.

It explains:

- A player click may open a new tab or advertisement.
- The new tab should be closed before returning to PirateOne.
- A VPN may be needed for geo-restricted or unavailable content.

The notice can be dismissed by:

- The confirmation button.
- Closing the dialog.
- Pressing Escape.
- Clicking outside the dialog.

Dismissal stores notification version `5` in local storage. Settings includes a reset action that removes this stored value.

### Backdrop service

Pages can publish a current content backdrop to a shared in-memory backdrop context. The shared layer:

- Shows the selected backdrop while a page is active.
- Loads it lazily.
- Applies a readable overlay.
- Clears it when the page/effect is cleaned up.

Backdrop state is not persisted across reloads.

### Disclaimer

The catalog, search, and discovery pages display the functional disclaimer:

> This site does not store any files on the server — media is hosted on 3rd party services.

## 4. Home page (`/`)

The home page loads and displays:

1. Trending Now hero carousel.
2. Continue Watching for signed-in users with unfinished progress.
3. Now Playing.
4. Top Rated Movies.
5. Popular TV Shows.
6. Top Rated TV Shows.
7. Anime.
8. Popular Movies.

### Hero carousel

The hero:

- Uses the first five trending results.
- Rotates automatically every eight seconds.
- Pauses rotation while the pointer is over the hero.
- Shows title, media type, rating, year, overview, poster, watch action, watchlist action, and trailer action when available.
- Uses TMDB logo artwork when an English or language-neutral logo exists.
- Falls back to the title text when TMDB has no logo.
- Preloads the selected logo before deciding whether to show the logo or title text.
- Keeps the skeleton visible until the current title's logo lookup/image readiness is resolved.
- Opens `/watch/{movie|tv}/{id}` from Watch.
- Opens a YouTube trailer modal when a trailer is available.
- Adds the current title to the local or cloud watchlist.

The hero's featured metadata and logo/trailer requests are cached/deduplicated in memory where applicable.

### Content loading behavior

Trending content is requested independently from the lower catalog rows. This allows the hero to become available while the other rows continue using skeleton loading states.

The home page also:

- Loads the signed-in user's watch-progress rows.
- Hides completed progress and progress at or above 90% from Continue Watching.
- Sorts remaining progress by most recently updated.
- Limits Continue Watching to ten entries.
- Searches four anime queries and deduplicates results by TMDB ID.

Home data requests are cached for five minutes in the browser and identical concurrent TMDB requests are deduplicated. The cache is lost on a full browser reload.

## 5. Catalog and discovery pages

### Movies (`/movies`)

The Movies page provides:

- Popular tab.
- Now Playing tab.
- Top Rated tab.
- Initial loading for the first two pages of each category.
- Infinite loading using an intersection observer near the end of the list.
- Page counters and total-page tracking.
- Loading-more indicator.
- End-of-list message after the active category is exhausted.
- Backdrop rotation based on the first ten popular movies.
- Movie cards with watchlist and watch actions.

A successful but empty API response renders an empty grid. API failures are logged and do not produce a dedicated error panel.

### Series (`/series`)

The Series page provides:

- Popular tab.
- Top Rated tab.
- Initial loading for the first two pages of each category.
- Infinite loading near the end of the list.
- End-of-list message after the active category is exhausted.
- Backdrop rotation based on the first ten popular TV titles.
- All displayed entries are treated as TV media.
- Movie-card interactions for playback and watchlist actions.

### Anime (`/anime`)

The Anime page builds its catalog from multi-search queries for:

- `anime`
- `one piece`
- `naruto`
- `demon slayer`
- `attack on titan`
- `jujutsu kaisen`

It provides:

- Initial results from page one and page two of all six searches.
- Global deduplication by TMDB ID.
- Infinite loading across the query set.
- A loading-more indicator.
- An end-of-list message.
- Backdrop rotation based on the first ten results.
- Movie-card interactions.

Anime results are still routed to the supported movie/TV watch types returned by TMDB.

### Movie cards

Cards are used across home rows, catalogs, search, recommendations, watchlist, and collection displays. A card can:

- Open the title's watch page.
- Show title, media type, year, rating, poster, and overview.
- Show a hover/expanded information panel.
- Show a larger backdrop or poster preview.
- Play the title.
- Add or remove the title from the local or cloud watchlist.
- Show a plus/check state for watchlist membership.
- Show a fallback when no poster or backdrop exists.

Watchlist membership is checked separately for each title ID and media type.

### Horizontal content rows

Home rows provide:

- Horizontal scrolling.
- Previous/next controls.
- Smooth scroll behavior.
- Disabled controls at the beginning/end.
- Skeleton card rows while the data is loading.
- Empty-row suppression when a loaded row has no items.

## 6. Search (`/search`)

The Search page has two modes:

1. Name search.
2. TMDB ID search.

### Name search

Name search provides:

- 300 ms debounced multi-search.
- Movie/TV filter tabs.
- All, Movies, and TV result tabs.
- Search result cards.
- Minimum two-character input requirement.
- Clear-search action.
- Loading skeletons and progress indicators.
- No-results messages.
- Suggestion to use ID search when a title search has no match.

Search requests are abortable. A previous request is cancelled when a newer query starts, and stale responses are ignored.

### Filter search

Filter search can discover movies or TV titles using:

- Genre.
- Release year.
- Minimum rating.
- Sort order.

TMDB parameters are mapped appropriately:

- Movies use `primary_release_year`.
- TV uses `first_air_date_year`.
- Rating uses `vote_average.gte`.
- Sort is passed through as the selected `sort_by` value.

The page displays result counts and a no-results message after filters settle.

### TMDB ID search

ID search provides:

- Movie, TV, or Auto type selection.
- Numeric TMDB ID input.
- Debounced lookup.
- Movie details lookup.
- TV details lookup.
- Auto mode that tries movie and then TV.
- Validation for empty, nonnumeric, and non-positive IDs.
- A direct result card when found.
- Type-specific not-found messaging.
- Clear/reset action.

The source contains a parser for prefixes such as `movie:550` and `tv:1396`, but the active input path currently accepts numeric values only.

### Header search

The global header search is separate from the full Search page. It:

- Opens from the search icon or `/`.
- Debounces input.
- Requires at least two characters.
- Searches TMDB multi-search.
- Displays up to eight results.
- Navigates directly to a watch page.
- Provides a See all link to the full search page.

## 7. Watch page (`/watch/:type/:id`)

The watch page loads TMDB details for a movie or TV title and provides:

- Title, logo, poster, backdrop, rating, year, runtime, media type, status, genres, and overview.
- Fallback text when no overview exists.
- Director, cast, production-company, and other credits when supplied by TMDB.
- Movie collection information where applicable.
- Trailer and related content sections.
- Community reviews.
- Watchlist controls.
- Collection membership controls for signed-in users.
- Server selection.
- Download links.
- Theater mode.
- TV season and episode selection.
- Progress/resume handling for supported providers.
- Local watch history recording.

### Movie and TV metadata

Details are loaded from TMDB. If details cannot be loaded, the page shows Content not found and offers a Go Home action.

The page also loads:

- English-first or language-neutral title logos.
- Movie/TV videos where needed.
- Collection details for movies.
- Recommendations and similar titles.
- Reviews.

### TV seasons and episodes

For TV titles:

- The page loads available seasons.
- A season selector changes the selected season.
- Changing season resets the episode to episode 1.
- Episode buttons select the active episode.
- While season data is pending, placeholder episode entries are shown.
- The selected season/episode is passed to supported player providers.

### Watchlist controls on the watch page

The watch page supports:

- Add to list.
- Remove from list.
- Local watchlist operations for guests.
- Supabase watchlist operations for signed-in users.
- A checked/plus state.

For signed-in users, the watchlist menu also:

- Loads their collections.
- Shows whether the current title belongs to each collection.
- Adds/removes the title from a collection.
- Creates collection-item records containing title metadata.
- Shows collection operation feedback.

### Streaming server selector

The server menu:

- Lists providers appropriate for the current media type.
- Lets the user switch providers without leaving the page.
- Closes after selection.
- Rebuilds the player URL for the selected provider.
- Re-reads saved progress for the selected server when applicable.
- Does not persist the selected server across visits.

The watch page marks one anime-capable provider as unavailable in its server list. The movie/TV providers are otherwise exposed as available by the current UI.

### Download actions

The download menu opens external provider links for:

- VidSrc Download.
- BunnyDDL.

Movie links use the movie ID. TV links include the selected show, season, and episode. The app does not download, store, or manage the resulting file itself.

### Theater mode

Theater mode:

- Expands the player area.
- Hides the shared site header through a body class.
- Stores a `watch_theater_mode` local-storage value.
- Exits with a button or `Escape`.

The stored value is written but is not currently read to initialize theater mode on a future visit.

### Watch history

Opening a loaded movie or selected TV episode records a local history entry. The entry is created when details are available, not when playback actually starts.

The local history:

- Uses `pirateone_watch_history`.
- Keeps up to 50 entries.
- Moves repeated media/type entries to the top.
- Stores TV season/episode information.
- Groups entries conceptually into today, last seven days, and earlier.

There is no dedicated history route or history page in the current application.

### Watch progress and resume

Progress tracking is authenticated-only and cloud-backed:

- Signed-in users can have progress saved to Supabase.
- Guests do not save or load cloud progress.
- Progress is keyed by user, TMDB title, media type, provider/server, season, and episode.
- Movies use a movie sentinel for season/episode.
- Progress at or above 90% is considered complete.
- Completed rows remain in storage but are hidden from Continue Watching.
- Metadata snapshots such as title, poster, backdrop, overview, and rating are stored with progress.

The watch page listens for trusted postMessage events from:

- `player.videasy.net`
- `vidstuck.xyz`

It accepts supported player time-update payloads and saves progress at most once per ten seconds while playback is below 90%. At or above 90%, a completion save is allowed.

Other configured providers do not currently send recognized progress events, so they do not provide the same progress/resume behavior.

### Continue Watching

The home page shows Continue Watching only for signed-in users with incomplete progress. Each item includes:

- Poster/thumbnail.
- Title.
- Progress percentage.
- Progress bar.
- TV season/episode label when present.
- Resume navigation.

The current Watch page does not parse the `s` and `e` query parameters generated by Continue Watching. As a result, TV resume links can open the default season/episode instead of the stored one.

## 8. Trailer, collection, recommendations, and reviews

### Trailers

The hero and watch-related flows use TMDB video metadata to find an official YouTube trailer first, then a non-official trailer, teaser, or clip. The trailer opens in a modal YouTube embed with autoplay and fullscreen permissions.

### Movie collections

For movies associated with a TMDB collection:

- The collection is loaded.
- Parts are sorted by release date.
- Collection members are displayed.
- The current movie is marked as playing and disabled.
- Other members navigate to their watch pages.
- Collections with one or fewer parts are hidden.

### Recommendations and similar titles

The watch page loads both:

- TMDB recommendations.
- TMDB similar titles.

The More Like This section:

- Switches between Recommended and Similar tabs.
- Shows up to twelve items for the selected tab.
- Navigates to another watch page.
- Hides itself if both lists are empty.
- Shows an empty message if one selected tab has no entries.

### TMDB reviews

The Community Reviews section:

- Loads movie or TV reviews from TMDB.
- Shows author, avatar, author rating, date, and review text.
- Truncates reviews longer than 400 characters.
- Provides Read More/Show Less.
- Links to the original review on TMDB.
- Shows the first three reviews initially.
- Provides Show All/Show Less when more than three reviews exist.
- Hides the section when no reviews are returned.

## 9. Watchlist and library

### Guest/local watchlist

Guests use local browser storage:

- Storage key: `pirateone_watchlist`.
- Add, remove, check, and clear operations are local.
- Entries are deduplicated by TMDB ID and media type.
- The watchlist page can remove individual titles or clear everything.

### Signed-in/cloud watchlist

Signed-in users use Supabase:

- Watchlist rows are associated with the current user.
- Rows are ordered newest first.
- Movie metadata is stored with each entry.
- Add/remove/check operations are available from cards and watch pages.
- Watchlist load failures fall back to local watchlist data on the Watchlist page.
- Signing in does not automatically merge existing guest entries into the cloud list.

### Watchlist page

The Watchlist page provides:

- Watchlist tab.
- Collections tab.
- Loading states.
- Empty-state messaging.
- Individual remove actions.
- Clear All action.
- Backdrop rotation using watchlist entries.
- Navigation from each item to its watch page.
- Cloud/Synced or local-storage status messaging.

Guests can browse their local watchlist but are prompted to sign in for cross-device synchronization.

### Custom collections

Signed-in users can create and manage custom collections:

- Collection name.
- Optional description.
- Public/private setting.
- Collection listing ordered by creation time.
- Poster previews from up to four collection items.
- Collection item count.
- Open a collection.
- Navigate to an item.
- Remove an item from a collection.
- Delete a collection.
- Return from a collection to the collection list.

Guests see a sign-in prompt instead of collection management.

Public collection database policies exist, but the current collection UI queries the signed-in user's own collections.

### Show status

The cloud show-status data model supports:

- Watching.
- Completed.
- Dropped.

It stores title artwork/metadata and optional last season/episode. Playback time updates automatically create a Watching status if no status exists, or preserve an existing status.

The current visible UI does not expose a manual status selector, so users cannot directly choose Completed or Dropped from the audited watch interface even though the underlying helper functions support those values.

## 10. Authentication and identity

### Authentication

The authentication system uses Supabase Auth and supports:

- Email/password sign in.
- Email/password account creation.
- Password-reset email.
- Password update through a recovery link.
- Sign out.
- Session initialization and refresh.
- Auth state tracking for initial session, sign-in, sign-out, and token refresh.

Successful sign-in/sign-up navigates to `/`. Errors are surfaced through toast messages.

### Sign-up and sign-in validation

- Email must contain `@` and `.`.
- Sign-up passwords must be at least six characters.
- Browser-required field validation also applies.
- Password visibility can be toggled.
- Submit controls show loading state and are disabled while submitting.

### Password recovery

The reset page accepts a valid Supabase `PASSWORD_RECOVERY` event or a recovery hash. It:

- Validates minimum six-character password length.
- Requires matching confirmation.
- Updates the Supabase password.
- Shows success/error messages.
- Returns to the home page after a successful update.

Without a valid recovery state it shows an invalid/expired-link message and links back to sign-in.

### Pirate identity

Every user can have a randomized pirate identity containing fields such as:

- Pirate name.
- Role.
- Bounty.
- Generated image.

Guest identity:

- Is fetched from the `pirate-identity` edge function when absent.
- Is stored in `pirateone_guest_identity`.
- Is reused on later visits.
- Can be regenerated.

Authenticated identity:

- Is loaded from the user's `profiles` row.
- Uses the profile's custom name/avatar when available.
- Preserves custom name and avatar during identity regeneration.
- Updates generated role, bounty, and image from the profile/identity flow.

Guests are told that their identity is local and not cross-device. Signed-in profile data is cloud-backed.

## 11. Settings (`/settings`)

Settings is available to both guests and signed-in users.

### Profile and identity

Authenticated users can:

- Edit their pirate name.
- Save with a check action or Enter.
- Cancel with Escape or a cancel action.
- Upload a custom avatar.

Avatar upload behavior:

- Accepts image files.
- Rejects files larger than 5 MB.
- Uploads to the Supabase `avatars` bucket.
- Uses a path associated with the user ID.
- Saves the public URL to the profile.
- Refreshes displayed identity.

Guests can:

- View/regenerate their local pirate identity.
- See that it is not synchronized across devices.

### Watch statistics

Authenticated users can view statistics derived from cloud watch progress:

- Movie entry count.
- Episode entry count.
- Entries updated within the last seven days.
- Total recorded watch time.

Watch time is displayed in hours when appropriate, otherwise minutes.

### Playback preferences

Settings stores:

- Autoplay preference, default enabled.
- Default quality, default `auto`.
- Quality options: Auto, 1080p, 720p, 480p, and 360p.

Changes are saved to local storage and produce a toast. The current playback implementation does not read these values to change the external provider's behavior, so they currently function as stored preferences/UI controls rather than enforced playback settings.

### History preference

The Save watch history switch stores `pirateone_save_history` and reports its state. The current history writer does not read this flag, so disabling the setting does not currently prevent history entries from being written.

### Notification reset

The notification section can reset the welcome notice so it appears again on the next visit.

### Data clearing

Clear Watchlist:

- Requires confirmation.
- Clears the local watchlist.
- Clears the authenticated cloud watchlist.
- Reports success/failure.

Clear All Data:

- Requires confirmation.
- Removes local storage keys except Supabase authentication keys.
- Clears authenticated cloud watchlist, history, progress, and show-status rows.
- Preserves the account/profile itself.
- Reports success/failure.

Some Supabase deletion calls do not surface returned errors consistently, so an individual cloud deletion can fail while the overall operation still reports success.

## 12. Help, feedback, and FAQs (`/help`)

### Feedback form

Users can submit:

- Required 1–5 star rating.
- Optional name.
- Required email.
- Required feedback message.

Validation prevents submission when rating, email, or feedback is missing.

If EmailJS configuration is available:

- Feedback is sent to the configured email template.
- A success message is shown.
- Form fields are cleared.

If EmailJS is unavailable or the send fails:

- Feedback is saved to `pirateone_feedback` in local storage.
- The user is told it was saved locally or accepted.
- Form fields are cleared.

### FAQ

The FAQ explains:

- Why the player may require two clicks.
- What to try when content does not load.
- How to add titles to the watchlist.
- Why quality depends on the source/connection.
- How the download button works.
- How guest and signed-in watchlist persistence differ.

Only one FAQ item is open at a time.

### Help information

The page documents:

- Streaming categories.
- Server switching.
- Download availability.
- Ad redirect behavior.
- Guest/account usage.
- Watch history.
- Watchlist.
- Library statuses.
- Pirate identity.
- Profile picture upload.
- Search and TMDB ID lookup.
- Trending/popular/top-rated discovery.
- Recommendations.
- Community reviews.
- Tips for VPN use, server switching, buffering, and signing in.

The page also documents the library statuses Watching, Completed, Dropped, and Plan to Watch. Plan to Watch is represented by watchlist membership rather than a separate status value in the current status helper.

## 13. Sports (`/sports`)

The Sports page links to the separate Strike streaming application and shows a feature overview.

## 14. Streaming server status (`/server`)

The server status page monitors all configured provider origins.

It provides:

- Separate Anime and Movies/TV groups.
- Total server count.
- Online count.
- Slow count.
- Down/timeout count.
- Last checked time.
- Per-server status.
- Per-server latency.
- Refresh action.
- Checking placeholders during a refresh.

### Health-check behavior

For each provider:

1. A test player URL is generated.
2. Its origin is extracted.
3. The origin is fetched with `no-cors` and no-store behavior.
4. A seven-second timeout is applied.
5. Successful responses at or below three seconds are Online.
6. Successful responses above three seconds are Slow.
7. Timeouts retry after four seconds.
8. A failed retry is marked Timeout.
9. Other failures try the provider favicon as a five-second fallback.
10. Favicon response timing determines reachability/latency where possible.

The status page does not require starting a movie or TV playback session to perform checks.

## 15. Streaming providers and URL behavior

The application defines 15 provider types:

### Anime-capable group

- VIDSTUCK (`vidstuck`)
- Videasy (`videasy`)
- VidNest (`vidnest`)
- VidSrc.cc (`vidsrccc`)
- VidZee (`vidzee`)

These are configured for movies, TV, and anime URL generation.

### Movie/TV group

- Hanna/AutoEmbed (`autoembed`)
- VidSrc (`vidsrc`)
- 111Movies (`movies111`)
- 2Embed (`twoembed`)
- VidRock (`vidrock`)
- VidFast (`vidfast`)
- VidLink (`vidlink`)
- VidSrc.su (`vidsrcsu`)
- VidUp (`vidup`)
- VidKing (`vidking`)

The URL builder supports provider-specific differences such as:

- TMDB-ID paths.
- IMDb-ID paths for Hanna.
- TV season and episode paths.
- Next-episode and episode-selector query parameters.
- Autoplay-next-episode behavior.
- Provider branding and color options.
- Progress query parameters where a provider supports them.
- Anime sub/dub query parameters in provider branches that support anime.

The main watch route currently supplies only movie or TV types.

The watch page defaults to VidStuck. The reusable VideoPlayer component defaults to Videasy if used independently.

## 16. Player protection and external media behavior

The player is an iframe with:

- Autoplay permission.
- Encrypted media permission.
- Fullscreen permission.
- Picture-in-picture permission.

The player attempts to reduce unwanted redirects by:

- Replacing `window.open` repeatedly while mounted.
- Tracking focus/blur and visibility changes.
- Reclaiming focus when a player click opens a new tab.
- Blocking known advertising iframe sources injected into the document.
- Tracking blocked redirect events.
- Blocking selected navigation hijacks.

This protection cannot inspect or control the internal DOM of a cross-origin player iframe.

The reusable `AdBlockWrapper`/`useAdBlocker` implementation contains broader domain, popup, iframe, script, dialog, navigation, and injection blocking rules, but the wrapper is not mounted in the shipped application tree. The active protection comes primarily from `VideoPlayer`.

## 17. Data sources and persistence

### TMDB

TMDB supplies:

- Trending content.
- Catalog lists.
- Search results.
- Movie/TV details.
- Seasons and episodes.
- Images and logos.
- Videos/trailers.
- Recommendations.
- Similar titles.
- Reviews.
- Collections.

TMDB requests:

- Run from the browser.
- Use the configured TMDB API key.
- Throw on non-success HTTP responses.
- Use a five-minute in-memory cache.
- Deduplicate identical in-flight requests.
- Do not persist the cache across reloads.

### Supabase

Supabase supplies:

- Email/password authentication.
- User sessions and token refresh.
- Profiles.
- Custom avatars.
- Cloud watchlist.
- Collections and collection items.
- Cloud watch progress.
- Show statuses.
- Site visit count/RPC.
- An available cloud watch-history helper.
- Pirate identity profile storage.

Relevant data entities include:

- `profiles`
- `site_visits`
- `watchlist`
- `watch_history`
- `watch_progress`
- `show_status`
- `collections`
- `collection_items`
- `avatars` storage bucket

The database is intended to use row-level ownership policies for user-specific records.

### Local browser storage

The current local storage keys include:

| Key | Purpose |
|---|---|
| `pirateone_watchlist` | Guest watchlist |
| `pirateone_watch_history` | Local watch history |
| `pirateone_guest_identity` | Guest pirate identity |
| `pirateone_feedback` | Fallback feedback records |
| `pirateone_autoplay` | Saved autoplay preference |
| `pirateone_quality` | Saved quality preference |
| `pirateone_save_history` | Saved history preference |
| `pirateone_welcome_shown` | Welcome notification version |
| `watch_theater_mode` | Theater-mode value written by the watch page |

Supabase authentication keys are preserved during Clear All Data.

## 18. Current implementation limitations and discrepancies

These are functional observations from the current source, not design recommendations:

1. Signed-in watch history is not actually written by the Watch page to the available `watch_history` helper. The visible Watch flow currently writes local history.
2. The Save watch history setting is stored but not consulted by the history writer.
3. Continue Watching creates TV query parameters, but the Watch page does not currently parse them, so TV resume can open the default season/episode.
4. Only Videasy and VidStuck player messages are recognized for automatic progress saving. Other providers do not provide the same progress tracking.
5. The selected streaming server is not persisted between visits.
6. Autoplay and quality settings are stored but are not currently applied to provider URLs/player behavior.
7. Manual Completed and Dropped status controls are not exposed in the current visible watch flow.
8. A floating-player context and component exist, but the provider/component are not mounted and no active caller opens them.
9. The generic AdBlockWrapper exists but is not mounted; VideoPlayer has its own active protection logic.
10. The download controls open external links; the app does not download or store media itself.
11. The Help page describes quality choices for downloads, but the current download URL builder does not pass a selected quality value.
12. Some catalog and detail API failures are only logged, leaving an empty or fallback state rather than a dedicated retry panel.
13. Guest local storage parsing is guarded inconsistently. Malformed watchlist data can throw, while some identity/history/settings reads have fallback handling.
14. Signing in does not merge a guest's local watchlist or history into the account's cloud data.
15. Clear All Data may show success even if an individual Supabase deletion returns an unhandled error.
16. The application exposes many provider URL branches, but external providers can change availability, URL behavior, content coverage, or response times independently of PirateOne.
17. The TMDB API cache is browser-memory-only and is lost after a hard reload.
18. There is no dedicated history page in the route table.
19. The watch route accepts only `movie` and `tv`, even though the URL builder contains anime-specific branches.
20. The site disclaimer states that media is hosted by third parties and is not stored on the application server.
