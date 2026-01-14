import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SearchResult = {
  videoId: string;
  title: string;
  artist: string;
  source: "youtube_api" | "youtube_scrape" | "fallback";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SEARCH-YOUTUBE] Query: "${query}", UserId: ${userId || "anonymous"}`);

    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");

    let result: SearchResult;

    if (YOUTUBE_API_KEY) {
      result = await searchWithYouTubeApi(query, YOUTUBE_API_KEY);
    } else {
      // No API key: best-effort search by scraping the public results page + oEmbed
      result = await searchByScraping(query);
    }

    // Update user profile if userId provided
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          current_youtube_id: result.videoId,
          music_title: result.title,
          music_artist: result.artist,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("[SEARCH-YOUTUBE] Failed to update profile:", updateError);
      }
    }

    console.log(
      `[SEARCH-YOUTUBE] Result: ${result.title} (${result.videoId}) by ${result.artist} [${result.source}]`
    );

    return new Response(
      JSON.stringify({
        videoId: result.videoId,
        title: result.title,
        artist: result.artist,
        embedUrl: `https://www.youtube.com/embed/${result.videoId}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1`,
        source: result.source,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEARCH-YOUTUBE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchWithYouTubeApi(query: string, apiKey: string): Promise<SearchResult> {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", `${query} music`);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoCategoryId", "10");
  searchUrl.searchParams.set("maxResults", "1");
  searchUrl.searchParams.set("key", apiKey);

  const response = await fetch(searchUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[SEARCH-YOUTUBE] API error:", response.status, errorText);
    throw new Error("YouTube API error");
  }

  const data = await response.json();
  const video = data.items?.[0];

  if (!video?.id?.videoId) {
    throw new Error("No video found");
  }

  const videoId = video.id.videoId as string;
  const title = (video.snippet?.title as string) || query;
  const channelTitle = (video.snippet?.channelTitle as string) || "";

  return {
    videoId,
    title,
    artist: channelTitle,
    source: "youtube_api",
  };
}

async function searchByScraping(query: string): Promise<SearchResult> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${query} official audio`
    )}`;

    const res = await fetch(searchUrl, {
      headers: {
        // Best-effort headers to reduce bot-blocking
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`YouTube search page error: ${res.status}`);
    }

    const html = await res.text();

    // Extract the first videoId we find
    const match = html.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/);
    const videoId = match?.[1];

    if (!videoId) {
      throw new Error("Could not extract videoId from YouTube search page");
    }

    const meta = await fetchOEmbed(videoId);

    return {
      videoId,
      title: meta.title || query,
      artist: meta.author_name || "",
      source: "youtube_scrape",
    };
  } catch (e) {
    console.error("[SEARCH-YOUTUBE] Scrape failed, using fallback:", e);

    const fallbackId = await getFallbackVideoId(query);

    return {
      videoId: fallbackId,
      title: query,
      artist: "",
      source: "fallback",
    };
  }
}

async function fetchOEmbed(videoId: string): Promise<{ title?: string; author_name?: string }> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    return {};
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

// Last resort fallback when we can't search
async function getFallbackVideoId(query: string): Promise<string> {
  const fallbackVideos: Record<string, string> = {
    "marisa": "j5K5V9cZ9qk",
    "ivete": "nM2x3j8b4Q4",
    "bob marley": "vdB-8eLEW8g",
    "axé": "6MgFT6YQXSE",
    "reggae": "vdB-8eLEW8g",
    "samba": "qAHcZU03Cwo",
    "pagode": "qAHcZU03Cwo",
    "forró": "JxqQiMhtOEw",
    "mpb": "E1tOV7y94DY",
    "funk": "sR_rPd_ufK4",
    "pop": "dQw4w9WgXcQ",
    "rock": "dQw4w9WgXcQ",
    "default": "E1tOV7y94DY",
  };

  const lowerQuery = query.toLowerCase();

  for (const [key, videoId] of Object.entries(fallbackVideos)) {
    if (lowerQuery.includes(key)) {
      return videoId;
    }
  }

  return fallbackVideos.default;
}
