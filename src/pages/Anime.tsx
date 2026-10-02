import CatalogPage, { CatalogTab } from '@/components/CatalogPage';
import { getAnimeList, getAnimeByGenre, getAnimeSpotlights, searchAnime } from '@/lib/anilist';

const genreTab = (id: string, label: string, genre: string): CatalogTab => ({
  id,
  label,
  fetchPage: page => getAnimeByGenre(genre, page),
});

const TABS: CatalogTab[] = [
  { id: 'trending', label: 'Trending', fetchPage: page => getAnimeList('TRENDING_DESC', page) },
  { id: 'popular', label: 'Popular', fetchPage: page => getAnimeList('POPULARITY_DESC', page) },
  { id: 'top-rated', label: 'Top Rated', fetchPage: page => getAnimeList('SCORE_DESC', page) },
  genreTab('action', 'Action', 'Action'),
  genreTab('comedy', 'Comedy', 'Comedy'),
  genreTab('drama', 'Drama', 'Drama'),
  genreTab('fantasy', 'Fantasy', 'Fantasy'),
  genreTab('romance', 'Romance', 'Romance'),
  genreTab('sci-fi', 'Sci-Fi', 'Sci-Fi'),
  genreTab('mystery', 'Mystery', 'Mystery'),
];

const Anime = () => (
  <CatalogPage
    slug="anime"
    title="Anime"
    subtitle="Trending anime series and movies"
    tabs={TABS}
    fetchHero={() => getAnimeSpotlights(5)}
    search={searchAnime}
    searchPlaceholder="Search anime..."
  />
);

export default Anime;