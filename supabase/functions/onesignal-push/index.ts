import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ONESIGNAL-PUSH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const restApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!appId || !restApiKey) {
      throw new Error("OneSignal credentials not configured");
    }

    const { 
      action, 
      title, 
      message, 
      data, 
      filters,
      location,
      radius = 500, // meters
      playerIds,
      segments,
    } = await req.json();

    logStep("Action requested", { action });

    if (action === 'send_notification') {
      const notificationPayload: any = {
        app_id: appId,
        headings: { en: title },
        contents: { en: message },
        data,
      };

      // Target by player IDs
      if (playerIds && playerIds.length > 0) {
        notificationPayload.include_player_ids = playerIds;
      }
      // Target by segments
      else if (segments && segments.length > 0) {
        notificationPayload.included_segments = segments;
      }
      // Target by filters (location-based)
      else if (filters) {
        notificationPayload.filters = filters;
      }
      // Target all subscribed users
      else {
        notificationPayload.included_segments = ['Subscribed Users'];
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${restApiKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OneSignal API error: ${errorText}`);
      }

      const result = await response.json();
      logStep("Notification sent", { id: result.id, recipients: result.recipients });

      return new Response(JSON.stringify({
        success: true,
        notificationId: result.id,
        recipients: result.recipients,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send_geo_notification' && location) {
      // Geolocalized push notification
      const { latitude, longitude, beachName } = location;

      const notificationPayload = {
        app_id: appId,
        headings: { en: title || `Você está na ${beachName}!` },
        contents: { en: message || `Veja a vibe de agora na ${beachName}! 🏖️` },
        data: { ...data, beachName, latitude, longitude },
        filters: [
          { field: 'location', radius, lat: latitude, long: longitude },
        ],
      };

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${restApiKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OneSignal geo notification error: ${errorText}`);
      }

      const result = await response.json();
      logStep("Geo notification sent", { id: result.id, location: beachName });

      return new Response(JSON.stringify({
        success: true,
        notificationId: result.id,
        recipients: result.recipients,
        location: beachName,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'register_location') {
      // Update user's location for geo-targeting
      const { playerId, latitude, longitude } = await req.json();

      const response = await fetch(`https://onesignal.com/api/v1/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${restApiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          lat: latitude,
          long: longitude,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update location: ${errorText}`);
      }

      logStep("Location updated", { playerId, latitude, longitude });

      return new Response(JSON.stringify({
        success: true,
        message: "Location updated successfully",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_app_info') {
      // Return app ID for frontend SDK initialization
      return new Response(JSON.stringify({
        success: true,
        appId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("Invalid action. Use 'send_notification', 'send_geo_notification', 'register_location', or 'get_app_info'");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
