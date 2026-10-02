import { searchMulti } from './tmdb';
import type { Movie, MovieDetails } from './tmdb';

/**
 * AniList (https://anilist.co) client.
 * Free public GraphQL API, no key needed (about 90 requests/minute).
 * Anime is mapped to the same `Movie` shape the rest of the app already uses,
 * with `media_type: 'anime'`, `id` = AniList id, and absolute image URLs
 * (the image helpers in tmdb.ts pass absolute URLs through untouched).
 */

const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_TTL = 10 * 60 * 1000;
const DEFAULT_PER_PAGE = 30;

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const inFlight = new Map<string, Promise<unknown>>();

export type AnimeSort = 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC';

interface AniListDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

interface AniListMedia {
  id: number;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  seasonYear: number | null;
  startDate: AniListDate | null;
  title: { romaji: string | null; english: string | null };
  description: string | null;
  coverImage: { extraLarge: string | null; large: string | null } | null;
  bannerImage: string | null;
  genres: string[] | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  trailer: { id: string | null; site: string | null } | null;
  studios?: { nodes: { name: string }[] };
  recommendations?: { nodes: { mediaRecommendation: AniListMedia | null }[] };
}

export interface AnimePage {
  results: Movie[];
  hasNextPage: boolean;
}

export interface AnimeDetails extends MovieDetails {
  anime_episodes: number;
  next_airing_episode: number | null;
  recommendations: Movie[];
  format: string | null;
}

const MEDIA_FIELDS = `
  id
  format
  status
  episodes
  duration
  averageScore
  seasonYear
  startDate { year month day }
  title { romaji english }
  description(asHtml: false)
  coverImage { extraLarge large }
  bannerImage
  genres
  nextAiringEpisode { episode airingAt }
  trailer { id site }
`;

const LIST_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $search: String, $minPopularity: Int, $genre: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(
        type: ANIME
        sort: $sort
        search: $search
        genre: $genre
        isAdult: false
        popularity_greater: $minPopularity
        format_in: [TV, TV_SHORT, MOVIE, ONA, OVA]
      ) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
      studios(isMain: true) { nodes { name } }
      recommendations(perPage: 12, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            ${MEDIA_FIELDS}
          }
        }
      }
    }
  }
`;

const STATUS_LABELS: Record<string, string> = {
  FINISHED: 'Finished',
  RELEASING: 'Airing',
  NOT_YET_RELEASED: 'Not yet released',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
};

async function anilistRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const key = JSON.stringify([query, variables]);

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
    .then(async (response) => {
      if (response.status === 429) {
        throw new Error('AniList rate limit reached. Try again in a minute.');
      }
      const json = await response.json();
      if (!response.ok || json.errors) {
        throw new Error(json.errors?.[0]?.message || `AniList request failed (${response.status})`);
      }
      cache.set(key, { data: json.data, expiresAt: Date.now() + CACHE_TTL });
      return json.data as T;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

const stripHtml = (html?: string | null) =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const pad = (value: number) => String(value).padStart(2, '0');

const formatDate = (date?: AniListDate | null) =>
  date?.year ? `${date.year}-${pad(date.month || 1)}-${pad(date.day || 1)}` : undefined;

const getTitle = (media: AniListMedia) =>
  media.title.english || media.title.romaji || 'Untitled';

const getEpisodeCount = (media: AniListMedia) => {
  if (media.format === 'MOVIE') return 1;
  if (media.status === 'RELEASING' && media.nextAiringEpisode) {
    return Math.max(1, media.nextAiringEpisode.episode - 1);
  }
  if (media.episodes) return media.episodes;
  if (media.nextAiringEpisode) return Math.max(1, media.nextAiringEpisode.episode - 1);
  return 12;
};

export const mapAnimeToMovie = (media: AniListMedia): Movie => {
  const title = getTitle(media);
  const startDate = formatDate(media.startDate);
  return {
    id: media.id,
    title,
    name: title,
    poster_path: media.coverImage?.extraLarge || media.coverImage?.large || null,
    backdrop_path: media.bannerImage || media.coverImage?.extraLarge || null,
    overview: stripHtml(media.description) || 'No description available.',
    vote_average: media.averageScore ? media.averageScore / 10 : 0,
    release_date: media.format === 'MOVIE' ? startDate : undefined,
    first_air_date: startDate,
    media_type: 'anime',
    trailer_key: media.trailer?.site === 'youtube' ? media.trailer.id : null,
  };
};

export const getAnimeList = async (
  sort: AnimeSort = 'TRENDING_DESC',
  page = 1,
  perPage = DEFAULT_PER_PAGE,
  genre: string | null = null,
): Promise<AnimePage> => {
  const data = await anilistRequest<{
    Page: { pageInfo: { hasNextPage: boolean }; media: AniListMedia[] };
  }>(LIST_QUERY, {
    page,
    perPage,
    sort: [sort],
    search: null,
    genre,
    // Top-rated list ignores obscure titles with only a handful of votes
    minPopularity: sort === 'SCORE_DESC' ? 30000 : null,
  });

  return {
    results: data.Page.media.map(mapAnimeToMovie),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
};

export const getTrendingAnime = (page = 1) => getAnimeList('TRENDING_DESC', page);
export const getAnimeByGenre = (genre: string, page = 1) => getAnimeList('POPULARITY_DESC', page, DEFAULT_PER_PAGE, genre);
export const getPopularAnime = (page = 1) => getAnimeList('POPULARITY_DESC', page);
export const getTopRatedAnime = (page = 1) => getAnimeList('SCORE_DESC', page);

export const searchAnime = async (query: string, page = 1): Promise<AnimePage> => {
  const data = await anilistRequest<{
    Page: { pageInfo: { hasNextPage: boolean }; media: AniListMedia[] };
  }>(LIST_QUERY, {
    page,
    perPage: DEFAULT_PER_PAGE,
    sort: ['SEARCH_MATCH'],
    search: query,
    genre: null,
    minPopularity: null,
  });

  return {
    results: data.Page.media.map(mapAnimeToMovie),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
};

export const getAnimeDetails = async (id: number): Promise<AnimeDetails> => {
  const data = await anilistRequest<{ Media: AniListMedia }>(DETAILS_QUERY, { id });
  const media = data.Media;
  const episodes = getEpisodeCount(media);

  return {
    ...mapAnimeToMovie(media),
    runtime: media.duration ?? undefined,
    number_of_seasons: 1,
    number_of_episodes: episodes,
    genres: (media.genres || []).map((name, index) => ({ id: index, name })),
    status: STATUS_LABELS[media.status || ''] || media.status || 'Unknown',
    production_companies: (media.studios?.nodes || []).map((studio, index) => ({
      id: index,
      name: studio.name,
      logo_path: null,
    })),
    anime_episodes: episodes,
    next_airing_episode: media.nextAiringEpisode?.episode ?? null,
    recommendations: (media.recommendations?.nodes || [])
      .map((node) => node.mediaRecommendation)
      .filter((item): item is AniListMedia => Boolean(item))
      .map(mapAnimeToMovie),
    format: media.format,
  };
};

// ---------- Hero spotlights ----------

const normalizeTitle = (value?: string | null) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Finds the same title on TMDB (exact normalized title match only) so the hero can use
 * a proper widescreen backdrop, logo and trailer. Returns null when nothing matches safely.
 */
const findTmdbMatch = async (media: AniListMedia): Promise<Movie | null> => {
  const wanted = [media.title.english, media.title.romaji].map(normalizeTitle).filter(Boolean);
  if (wanted.length === 0) return null;

  try {
    const results = await searchMulti(media.title.english || media.title.romaji || '');
    return (
      results.find(item => {
        const candidate = normalizeTitle(item.title || item.name);
        return Boolean(item.backdrop_path) && wanted.includes(candidate);
      }) || null
    );
  } catch {
    return null;
  }
};

/** Top trending anime for the hero slider (prefers titles that have widescreen art). */
export const getAnimeSpotlights = async (limit = 5): Promise<Movie[]> => {
  const data = await anilistRequest<{
    Page: { pageInfo: { hasNextPage: boolean }; media: AniListMedia[] };
  }>(LIST_QUERY, {
    page: 1,
    perPage: 15,
    sort: ['TRENDING_DESC'],
    search: null,
    genre: null,
    minPopularity: null,
  });

  const withBanner = data.Page.media.filter(media => media.bannerImage);
  const picks = (withBanner.length >= limit ? withBanner : data.Page.media).slice(0, limit);

  return Promise.all(
    picks.map(async media => {
      const base = mapAnimeToMovie(media);
      const match = await findTmdbMatch(media);
      if (!match) return base;

      return {
        ...base,
        backdrop_path: match.backdrop_path || base.backdrop_path,
        tmdb_ref: { id: match.id, media_type: match.media_type === 'movie' ? 'movie' : 'tv' },
      } as Movie;
    }),
  );
};