import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    const { action, query, lat, lon, radius, placeId, type } = await req.json();
    console.log(`[GOOGLE_PLACES] Action: ${action}, Query: ${query}, PlaceId: ${placeId}`);

    if (action === "search") {
      if (!query) {
        throw new Error("'query' is required for search");
      }

      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
      
      if (lat && lon) {
        url += `&location=${lat},${lon}`;
      }
      if (radius) {
        url += `&radius=${radius}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      const places = data.results.map((place: {
        place_id: string;
        name: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        rating?: number;
        user_ratings_total?: number;
        types: string[];
        photos?: Array<{ photo_reference: string }>;
        opening_hours?: { open_now: boolean };
      }) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        types: place.types,
        photoReference: place.photos?.[0]?.photo_reference,
        isOpen: place.opening_hours?.open_now,
      }));

      return new Response(JSON.stringify({
        success: true,
        places,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "nearby") {
      if (!lat || !lon) {
        throw new Error("'lat' and 'lon' are required for nearby search");
      }

      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius || 1000}&key=${apiKey}`;
      
      if (type) {
        url += `&type=${type}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      const places = data.results.map((place: {
        place_id: string;
        name: string;
        vicinity: string;
        geometry: { location: { lat: number; lng: number } };
        rating?: number;
        user_ratings_total?: number;
        types: string[];
        photos?: Array<{ photo_reference: string }>;
        opening_hours?: { open_now: boolean };
      }) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        types: place.types,
        photoReference: place.photos?.[0]?.photo_reference,
        isOpen: place.opening_hours?.open_now,
      }));

      return new Response(JSON.stringify({
        success: true,
        places,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "details") {
      if (!placeId) {
        throw new Error("'placeId' is required for place details");
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,rating,reviews,photos,opening_hours,geometry&key=${apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      const place = data.result;

      return new Response(JSON.stringify({
        success: true,
        place: {
          name: place.name,
          address: place.formatted_address,
          phone: place.formatted_phone_number,
          website: place.website,
          rating: place.rating,
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
          openingHours: place.opening_hours?.weekday_text,
          isOpen: place.opening_hours?.open_now,
          reviews: place.reviews?.slice(0, 5).map((review: {
            author_name: string;
            rating: number;
            text: string;
            time: number;
          }) => ({
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            date: new Date(review.time * 1000).toISOString(),
          })),
          photos: place.photos?.slice(0, 5).map((photo: { photo_reference: string }) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${apiKey}`
          ),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "autocomplete") {
      if (!query) {
        throw new Error("'query' is required for autocomplete");
      }

      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}`;
      
      if (lat && lon) {
        url += `&location=${lat},${lon}&radius=50000`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      const predictions = data.predictions.map((prediction: {
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
      }) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }));

      return new Response(JSON.stringify({
        success: true,
        predictions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: search, nearby, details, autocomplete" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[GOOGLE_PLACES] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
