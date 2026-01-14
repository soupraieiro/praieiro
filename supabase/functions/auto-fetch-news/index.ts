import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Palavras proibidas para filtragem de conteúdo negativo
const FORBIDDEN_WORDS = [
  'acidente', 'crime', 'morte', 'política', 'violência', 'tragédia', 
  'trânsito', 'crise', 'assassinato', 'roubo', 'assalto', 'guerra', 
  'terrorismo', 'desastre', 'protesto', 'greve', 'conflito', 'tiroteio',
  'explosão', 'incêndio', 'afogamento', 'acidente fatal'
];

// Verifica se o conteúdo é positivo
function isPositiveContent(title: string, description: string): boolean {
  const content = (title + ' ' + description).toLowerCase();
  
  for (const word of FORBIDDEN_WORDS) {
    if (content.includes(word)) {
      return false;
    }
  }
  
  return true;
}

// Extrair URL de imagem do markdown
function extractImageFromMarkdown(markdown?: string): string | null {
  if (!markdown) return null;
  const imgMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  return imgMatch ? imgMatch[1] : null;
}

// Extrair domínio da URL
function extractDomain(url?: string): string {
  if (!url) return 'Web';
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0];
  } catch {
    return 'Web';
  }
}

// Categorizar o conteúdo
function categorizeContent(title: string, description: string): 'beach' | 'travel' | 'hotel' | 'restaurant' | 'news' {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('praia') || text.includes('mar') || text.includes('litoral')) return 'beach';
  if (text.includes('hotel') || text.includes('pousada') || text.includes('hospedagem')) return 'hotel';
  if (text.includes('restaurante') || text.includes('gastronomia') || text.includes('culinária') || 
      text.includes('acarajé') || text.includes('moqueca') || text.includes('comida')) return 'restaurant';
  if (text.includes('viagem') || text.includes('destino') || text.includes('turismo')) return 'travel';
  return 'news';
}

// Imagens placeholder
function getPlaceholderImage(index: number): string {
  const images = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
    'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=800',
    'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=800',
    'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800',
  ];
  return images[index % images.length];
}

// Interface para resultados de notícias
interface NewsItem {
  title: string;
  description: string;
  url: string | null;
  image_url: string;
  source: string;
  type: string;
}

// API Provider abstraction
interface ApiProvider {
  name: string;
  fetch: (query: string) => Promise<NewsItem[]>;
}

// Firecrawl API Provider
async function fetchFromFirecrawl(query: string): Promise<NewsItem[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('Firecrawl API key not configured, skipping...');
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      limit: 10,
      lang: 'pt',
      country: 'BR',
      scrapeOptions: {
        formats: ['markdown'],
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Firecrawl API error:', data);
    throw new Error(data.error || 'Firecrawl API failed');
  }

  return (data.data || []).map((item: any, index: number) => ({
    title: item.title || 'Notícia sobre praias',
    description: item.description || item.markdown?.slice(0, 200) || 'Descubra as melhores praias do Brasil',
    url: null, // Remove external links to keep users on platform
    image_url: extractImageFromMarkdown(item.markdown) || getPlaceholderImage(index),
    source: extractDomain(item.url),
    type: categorizeContent(item.title || '', item.description || ''),
  }));
}

// NewsAPI Provider (fallback)
async function fetchFromNewsAPI(query: string): Promise<NewsItem[]> {
  const apiKey = Deno.env.get('NEWS_API_KEY');
  if (!apiKey) {
    console.log('NewsAPI key not configured, skipping...');
    throw new Error('NEWS_API_KEY not configured');
  }

  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=pt&sortBy=publishedAt&pageSize=10`,
    {
      headers: { 'X-Api-Key': apiKey },
    }
  );

  const data = await response.json();

  if (!response.ok || data.status !== 'ok') {
    console.error('NewsAPI error:', data);
    throw new Error(data.message || 'NewsAPI failed');
  }

  return (data.articles || []).map((item: any, index: number) => ({
    title: item.title || 'Notícia',
    description: item.description || 'Leia mais...',
    url: null, // Remove external links
    image_url: item.urlToImage || getPlaceholderImage(index),
    source: item.source?.name || 'Web',
    type: categorizeContent(item.title || '', item.description || ''),
  }));
}

// GNews API Provider (fallback)
async function fetchFromGNews(query: string): Promise<NewsItem[]> {
  const apiKey = Deno.env.get('GNEWS_API_KEY');
  if (!apiKey) {
    console.log('GNews API key not configured, skipping...');
    throw new Error('GNEWS_API_KEY not configured');
  }

  const response = await fetch(
    `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&country=br&max=10&apikey=${apiKey}`
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('GNews error:', data);
    throw new Error(data.errors?.[0] || 'GNews failed');
  }

  return (data.articles || []).map((item: any, index: number) => ({
    title: item.title || 'Notícia',
    description: item.description || 'Leia mais...',
    url: null, // Remove external links
    image_url: item.image || getPlaceholderImage(index),
    source: item.source?.name || 'Web',
    type: categorizeContent(item.title || '', item.description || ''),
  }));
}

// Fetch with retry and fallback
async function fetchNewsWithFallback(query: string): Promise<{ items: NewsItem[]; source: string }> {
  const providers: ApiProvider[] = [
    { name: 'Firecrawl', fetch: fetchFromFirecrawl },
    { name: 'NewsAPI', fetch: fetchFromNewsAPI },
    { name: 'GNews', fetch: fetchFromGNews },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name}...`);
      const items = await provider.fetch(query);
      
      if (items.length > 0) {
        console.log(`${provider.name} returned ${items.length} items`);
        return { items, source: provider.name };
      }
      
      console.log(`${provider.name} returned 0 items, trying next...`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${provider.name}: ${errorMsg}`);
      console.log(`${provider.name} failed: ${errorMsg}, trying next...`);
    }
  }

  console.error('All providers failed:', errors);
  return { items: [], source: 'none' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Queries variadas para manter o feed dinâmico
    const searchQueries = [
      'melhores praias Brasil turismo viagem',
      'Salvador Bahia praia turismo férias',
      'gastronomia baiana culinária nordeste',
      'praias paradisíacas nordeste brasileiro',
      'dicas viagem litoral Brasil',
      'pousadas charmosas praia Brasil',
      'roteiro turístico praias Bahia',
      'comida típica baiana receitas',
    ];

    const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    console.log('Searching for news:', randomQuery);

    // Fetch with fallback
    const { items: rawItems, source } = await fetchNewsWithFallback(randomQuery);
    console.log(`Fetched from ${source}: ${rawItems.length} items`);

    // Filter for positive content only
    const newsItems = rawItems.filter(item => isPositiveContent(item.title, item.description));
    console.log(`Filtered to ${newsItems.length} positive news items`);

    if (newsItems.length > 0) {
      // Insert into cached_news with 30-minute expiration (set by trigger in database)
      const { error: insertError } = await supabase
        .from('cached_news')
        .insert(newsItems);

      if (insertError) {
        console.error('Error inserting news:', insertError);
      } else {
        console.log(`Inserted ${newsItems.length} news items from ${source}`);
      }
    }

    // Log the fetch result for monitoring
    try {
      await supabase.from('security_logs').insert({
        event_type: 'news_fetch',
        identifier: source,
        details: {
          query: randomQuery,
          fetched: rawItems.length,
          filtered: newsItems.length,
          source: source,
        },
      });
    } catch (logError) {
      console.log('Failed to log:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        source: source,
        fetched: rawItems.length,
        filtered: newsItems.length,
        inserted: newsItems.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch news' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
