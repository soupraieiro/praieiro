import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ALGOLIA-SEARCH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const appId = Deno.env.get('ALGOLIA_APP_ID');
    const apiKey = Deno.env.get('ALGOLIA_API_KEY');

    if (!appId || !apiKey) {
      throw new Error("Algolia credentials not configured");
    }

    const { query, indexName = "vendors", filters, hitsPerPage = 20 } = await req.json();

    if (!query) {
      throw new Error("Search query is required");
    }

    logStep("Searching Algolia", { query, indexName, filters });

    // Algolia Search API
    const searchResponse = await fetch(
      `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters,
          hitsPerPage,
          attributesToRetrieve: ['*'],
          attributesToHighlight: ['name', 'product_category', 'hashtags'],
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Algolia search failed: ${errorText}`);
    }

    const searchResult = await searchResponse.json();
    logStep("Search completed", { hitsCount: searchResult.nbHits });

    return new Response(JSON.stringify({
      success: true,
      hits: searchResult.hits,
      nbHits: searchResult.nbHits,
      query: searchResult.query,
      processingTimeMS: searchResult.processingTimeMS,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
