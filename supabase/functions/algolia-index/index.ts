import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ALGOLIA-INDEX] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const appId = Deno.env.get('ALGOLIA_APP_ID');
    const adminKey = Deno.env.get('ALGOLIA_ADMIN_KEY');

    if (!appId || !adminKey) {
      throw new Error("Algolia admin credentials not configured");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, indexName = "vendors", records } = await req.json();

    if (action === 'sync_vendors') {
      // Fetch all active vendors from Supabase
      const { data: vendors, error: vendorError } = await supabase
        .from('vendors_public')
        .select('*');

      if (vendorError) {
        throw new Error(`Failed to fetch vendors: ${vendorError.message}`);
      }

      logStep("Fetched vendors", { count: vendors?.length || 0 });

      // Prepare records for Algolia
      const algoliaRecords = vendors?.map(vendor => ({
        objectID: vendor.profile_id,
        name: vendor.full_name,
        product_category: vendor.product_category,
        product_description: vendor.product_description,
        whatsapp_number: vendor.whatsapp_number,
        status: vendor.status,
        latitude: vendor.latitude,
        longitude: vendor.longitude,
        _geoloc: vendor.latitude && vendor.longitude ? {
          lat: vendor.latitude,
          lng: vendor.longitude,
        } : null,
        hashtags: extractHashtags(vendor.product_description || ''),
      })) || [];

      // Batch update Algolia
      const updateResponse = await fetch(
        `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/batch`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-Application-Id': appId,
            'X-Algolia-API-Key': adminKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: algoliaRecords.map(record => ({
              action: 'updateObject',
              body: record,
            })),
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Algolia batch update failed: ${errorText}`);
      }

      logStep("Indexed vendors to Algolia", { count: algoliaRecords.length });

      return new Response(JSON.stringify({
        success: true,
        indexedCount: algoliaRecords.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'add_record' && records) {
      // Add individual records
      const updateResponse = await fetch(
        `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/batch`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-Application-Id': appId,
            'X-Algolia-API-Key': adminKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: records.map((record: any) => ({
              action: 'updateObject',
              body: record,
            })),
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Algolia add record failed: ${errorText}`);
      }

      return new Response(JSON.stringify({
        success: true,
        addedCount: records.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_record') {
      const { objectIDs } = await req.json();
      
      const deleteResponse = await fetch(
        `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/batch`,
        {
          method: 'POST',
          headers: {
            'X-Algolia-Application-Id': appId,
            'X-Algolia-API-Key': adminKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: objectIDs.map((id: string) => ({
              action: 'deleteObject',
              body: { objectID: id },
            })),
          }),
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Algolia delete failed: ${errorText}`);
      }

      return new Response(JSON.stringify({
        success: true,
        deletedCount: objectIDs.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("Invalid action. Use 'sync_vendors', 'add_record', or 'delete_record'");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}
