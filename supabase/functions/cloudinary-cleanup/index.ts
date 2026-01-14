import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLOUDINARY-CLEANUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cleanup job started");

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials not configured");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find all feed posts older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredPosts, error: fetchError } = await supabase
      .from('feed_posts')
      .select('id, image_url')
      .lt('created_at', cutoffTime);

    if (fetchError) {
      throw new Error(`Failed to fetch expired posts: ${fetchError.message}`);
    }

    logStep("Found expired posts", { count: expiredPosts?.length || 0 });

    if (!expiredPosts || expiredPosts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No expired posts to clean up",
        deletedCount: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract public IDs from Cloudinary URLs
    const publicIdsToDelete: string[] = [];
    for (const post of expiredPosts) {
      if (post.image_url && post.image_url.includes('cloudinary')) {
        // Extract public ID from URL
        const urlParts = post.image_url.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
          // Get everything after 'upload/v.../...'
          const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
          const publicId = pathAfterUpload.replace(/\.[^.]+$/, ''); // Remove extension
          publicIdsToDelete.push(publicId);
        }
      }
    }

    logStep("Public IDs to delete from Cloudinary", { count: publicIdsToDelete.length });

    // Delete images from Cloudinary in batches
    if (publicIdsToDelete.length > 0) {
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Cloudinary delete API (batch delete)
      for (const publicId of publicIdsToDelete) {
        try {
          const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
          const encoder = new TextEncoder();
          const data = encoder.encode(paramsToSign + apiSecret);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          const deleteResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                public_id: publicId,
                api_key: apiKey,
                timestamp,
                signature,
              }),
            }
          );

          if (deleteResponse.ok) {
            logStep("Deleted from Cloudinary", { publicId });
          } else {
            logStep("Failed to delete from Cloudinary", { publicId, status: deleteResponse.status });
          }
        } catch (err) {
          const errMessage = err instanceof Error ? err.message : "Unknown error";
          logStep("Error deleting from Cloudinary", { publicId, error: errMessage });
        }
      }
    }

    // Delete from database
    const postIds = expiredPosts.map(p => p.id);
    
    // First delete related likes and comments
    await supabase.from('feed_likes').delete().in('post_id', postIds);
    await supabase.from('feed_comments').delete().in('post_id', postIds);
    
    // Then delete the posts
    const { error: deleteError } = await supabase
      .from('feed_posts')
      .delete()
      .in('id', postIds);

    if (deleteError) {
      throw new Error(`Failed to delete posts: ${deleteError.message}`);
    }

    logStep("Cleanup completed", { deletedCount: expiredPosts.length });

    return new Response(JSON.stringify({
      success: true,
      message: "Cleanup completed successfully",
      deletedCount: expiredPosts.length,
      cloudinaryDeleted: publicIdsToDelete.length,
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
