import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_API_KEY = Deno.env.get('VITE_TMDB_API_KEY') || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

async function searchTMDB(query: string): Promise<TMDBMovie[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY not configured');
    return [];
  }
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function getRecommendations(genre: string): Promise<TMDBMovie[]> {
  if (!TMDB_API_KEY) return [];
  
  const genreMap: Record<string, { movie: number; tv: number }> = {
    action: { movie: 28, tv: 10759 },
    comedy: { movie: 35, tv: 35 },
    horror: { movie: 27, tv: 27 },
    romance: { movie: 10749, tv: 10749 },
    scifi: { movie: 878, tv: 10765 },
    thriller: { movie: 53, tv: 53 },
    drama: { movie: 18, tv: 18 },
    animation: { movie: 16, tv: 16 },
    anime: { movie: 16, tv: 16 },
    fantasy: { movie: 14, tv: 10765 },
    documentary: { movie: 99, tv: 99 },
    crime: { movie: 80, tv: 80 },
    mystery: { movie: 9648, tv: 9648 },
  };

  const genreIds = genreMap[genre.toLowerCase()];
  if (!genreIds) return [];

  try {
    const [movies, tvShows] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreIds.movie}&sort_by=popularity.desc&page=1`),
      fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${genreIds.tv}&sort_by=popularity.desc&page=1`)
    ]);

    const movieData = await movies.json();
    const tvData = await tvShows.json();

    const combined = [
      ...movieData.results.slice(0, 3).map((m: any) => ({ ...m, media_type: 'movie' })),
      ...tvData.results.slice(0, 3).map((t: any) => ({ ...t, media_type: 'tv' }))
    ];

    return combined;
  } catch {
    return [];
  }
}

async function getTrending(): Promise<TMDBMovie[]> {
  if (!TMDB_API_KEY) return [];
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results.slice(0, 6);
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    const { data: { user } } = authHeader
      ? await supabaseClient.auth.getUser()
      : { data: { user: null } };

    console.log('Request from:', user?.id ?? 'anonymous');

    const { message, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    if (!TMDB_API_KEY) {
      console.error('VITE_TMDB_API_KEY not configured');
      throw new Error('Movie database not configured');
    }

    const systemPrompt = `You are a friendly movie recommendation bot for PirateOne streaming platform.
Your job is to understand the user's movie/TV/anime preferences and suggest relevant content.

IMPORTANT RESPONSE FORMAT:
When recommending content, you MUST include movie/show titles in [brackets] so the system can fetch posters.
Example: I recommend [The Dark Knight], [Breaking Bad], and [Attack on Titan].

Guidelines:
1. Provide 2-4 specific recommendations with titles in [brackets]
2. Include brief descriptions (1-2 sentences each)
3. Be conversational and enthusiastic
4. Detect genre preferences from user messages (action, comedy, horror, romance, sci-fi, anime, etc.)
5. If user mentions specific titles, recommend similar ones
6. If user mentions mood (happy, sad, thrilling, relaxing), tailor recommendations

Always include at least one recommendation with the title in [brackets] format.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log('Sending request to AI gateway');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI service error');
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    // Extract movie titles from [brackets] in the response
    const titleMatches = reply.match(/\[([^\]]+)\]/g);
    const titles = titleMatches?.map((t: string) => t.slice(1, -1)) || [];

    // Fetch movie data for mentioned titles
    let movies: TMDBMovie[] = [];
    
    if (titles.length > 0) {
      const searchPromises = titles.slice(0, 4).map((title: string) => searchTMDB(title));
      const results = await Promise.all(searchPromises);
      movies = results.flatMap(r => r.slice(0, 1)).filter(m => m.poster_path);
    }

    // If no specific titles found, check for genre keywords and get recommendations
    if (movies.length === 0) {
      const lowerMessage = message.toLowerCase();
      const genres = ['action', 'comedy', 'horror', 'romance', 'scifi', 'sci-fi', 'thriller', 'drama', 'animation', 'anime', 'fantasy', 'documentary', 'crime', 'mystery'];
      const foundGenre = genres.find(g => lowerMessage.includes(g));
      
      if (foundGenre) {
        const genre = foundGenre === 'sci-fi' ? 'scifi' : foundGenre;
        movies = await getRecommendations(genre);
      } else {
        // Default to trending if no specific request
        movies = await getTrending();
      }
    }

    console.log('AI response received with', movies.length, 'movies for user', user?.id ?? 'anonymous');

    return new Response(
      JSON.stringify({ 
        response: reply.replace(/\[([^\]]+)\]/g, '$1'), // Remove brackets for display
        movies: movies.slice(0, 4).map(m => ({
          id: m.id,
          title: m.title || m.name,
          poster: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
          overview: m.overview?.slice(0, 100) + (m.overview?.length > 100 ? '...' : ''),
          rating: m.vote_average?.toFixed(1),
          year: (m.release_date || m.first_air_date)?.split('-')[0],
          mediaType: m.media_type || 'movie'
        }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
