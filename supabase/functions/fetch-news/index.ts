import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  CACHE_PRESETS, 
  getCacheHeaders, 
  generateETag, 
  checkConditionalRequest,
  createNotModifiedResponse 
} from "../_shared/cache-headers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DURATION_HOURS = 2;
const CDN_CACHE_CONFIG = CACHE_PRESETS.NEWS;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check cache first for low latency
    const { data: cachedNews } = await supabase
      .from('cached_news')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(8);

    if (cachedNews && cachedNews.length >= 4) {
      console.log(`[CACHE HIT] Returning ${cachedNews.length} cached items in ${Date.now() - startTime}ms`);
      
      const responseBody = JSON.stringify({ success: true, data: cachedNews, source: 'cache' });
      const etag = await generateETag(responseBody);
      
      // Check conditional request for 304
      if (checkConditionalRequest(req, etag)) {
        return createNotModifiedResponse(corsHeaders, CDN_CACHE_CONFIG, etag);
      }
      
      return new Response(responseBody, { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...getCacheHeaders({ ...CDN_CACHE_CONFIG, etag }),
        } 
      });
    }

    console.log('[CACHE MISS] Fetching fresh news...');

    // Try multiple APIs with fallback for resilience
    let newsItems: any[] = [];
    let apiSource = '';

    // 1. Try Firecrawl (primary)
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (firecrawlKey && newsItems.length === 0) {
      try {
        newsItems = await fetchFromFirecrawl(firecrawlKey);
        apiSource = 'firecrawl';
        console.log(`[FIRECRAWL] Got ${newsItems.length} items`);
      } catch (e) {
        console.error('[FIRECRAWL] Failed:', e);
      }
    }

    // 2. Try NewsAPI (fallback)
    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    if (newsApiKey && newsItems.length === 0) {
      try {
        newsItems = await fetchFromNewsAPI(newsApiKey);
        apiSource = 'newsapi';
        console.log(`[NEWSAPI] Got ${newsItems.length} items`);
      } catch (e) {
        console.error('[NEWSAPI] Failed:', e);
      }
    }

    // 3. Try GNews (final fallback)
    const gnewsKey = Deno.env.get('GNEWS_API_KEY');
    if (gnewsKey && newsItems.length === 0) {
      try {
        newsItems = await fetchFromGNews(gnewsKey);
        apiSource = 'gnews';
        console.log(`[GNEWS] Got ${newsItems.length} items`);
      } catch (e) {
        console.error('[GNEWS] Failed:', e);
      }
    }

    // Cache the results if we got any
    if (newsItems.length > 0) {
      const expiresAt = new Date(Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000).toISOString();
      
      // Clear old cache and insert new
      await supabase.from('cached_news').delete().lt('expires_at', new Date().toISOString());
      
      const cacheInsert = newsItems.map(item => ({
        ...item,
        expires_at: expiresAt,
      }));
      
      await supabase.from('cached_news').insert(cacheInsert);
      console.log(`[CACHE] Stored ${newsItems.length} items from ${apiSource}`);
    }

    console.log(`[COMPLETE] Total time: ${Date.now() - startTime}ms`);

    const responseBody = JSON.stringify({ success: true, data: newsItems, source: apiSource });
    const etag = await generateETag(responseBody);

    return new Response(responseBody, { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        ...getCacheHeaders({ ...CDN_CACHE_CONFIG, etag }),
      } 
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch news' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...getCacheHeaders(CACHE_PRESETS.NO_CACHE),
        } 
      }
    );
  }
});

async function fetchFromFirecrawl(apiKey: string): Promise<any[]> {
  const searchQueries = [
    'melhores praias Brasil 2025 turismo',
    'Salvador Bahia praia turismo férias',
    'litoral nordeste brasileiro viagem',
  ];
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit: 8,
      lang: 'pt',
      country: 'BR',
      scrapeOptions: { formats: ['markdown'] },
    }),
  });

  if (!response.ok) throw new Error(`Firecrawl: ${response.status}`);
  const data = await response.json();

  return (data.data || []).map((item: any, index: number) => ({
    id: `news-${Date.now()}-${index}`,
    title: item.title || 'Notícia sobre praias',
    description: item.description || item.markdown?.slice(0, 200) || '',
    url: item.url,
    image_url: extractImageFromMarkdown(item.markdown) || getPlaceholderImage(index),
    source: extractDomain(item.url),
    type: categorizeContent(item.title || '', item.description || ''),
    created_at: new Date().toISOString(),
  }));
}

async function fetchFromNewsAPI(apiKey: string): Promise<any[]> {
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=praia+brasil+turismo&language=pt&sortBy=publishedAt&pageSize=8`,
    { headers: { 'X-Api-Key': apiKey } }
  );

  if (!response.ok) throw new Error(`NewsAPI: ${response.status}`);
  const data = await response.json();

  return (data.articles || []).map((article: any, index: number) => ({
    id: `news-${Date.now()}-${index}`,
    title: article.title || 'Notícia',
    description: article.description || '',
    url: article.url,
    image_url: article.urlToImage || getPlaceholderImage(index),
    source: article.source?.name || extractDomain(article.url),
    type: categorizeContent(article.title || '', article.description || ''),
    created_at: article.publishedAt || new Date().toISOString(),
  }));
}

async function fetchFromGNews(apiKey: string): Promise<any[]> {
  const response = await fetch(
    `https://gnews.io/api/v4/search?q=praia+brasil&lang=pt&country=br&max=8&apikey=${apiKey}`
  );

  if (!response.ok) throw new Error(`GNews: ${response.status}`);
  const data = await response.json();

  return (data.articles || []).map((article: any, index: number) => ({
    id: `news-${Date.now()}-${index}`,
    title: article.title || 'Notícia',
    description: article.description || '',
    url: article.url,
    image_url: article.image || getPlaceholderImage(index),
    source: article.source?.name || 'GNews',
    type: categorizeContent(article.title || '', article.description || ''),
    created_at: article.publishedAt || new Date().toISOString(),
  }));
}

function extractImageFromMarkdown(markdown?: string): string | null {
  if (!markdown) return null;
  const imgMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  return imgMatch ? imgMatch[1] : null;
}

function extractDomain(url?: string): string {
  if (!url) return 'Web';
  try {
    return new URL(url).hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'Web';
  }
}

function categorizeContent(title: string, description: string): 'beach' | 'travel' | 'hotel' | 'restaurant' | 'news' {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('praia') || text.includes('mar') || text.includes('litoral')) return 'beach';
  if (text.includes('hotel') || text.includes('pousada')) return 'hotel';
  if (text.includes('restaurante') || text.includes('gastronomia')) return 'restaurant';
  if (text.includes('viagem') || text.includes('destino')) return 'travel';
  return 'news';
}

function getPlaceholderImage(index: number): string {
  const images = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
    'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800',
  ];
  return images[index % images.length];
}
