import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of expired content...');

    // Delete expired news (30 minutes)
    const { data: deletedNews, error: newsError } = await supabase
      .from('cached_news')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id, image_url');

    if (newsError) {
      console.error('Error deleting expired news:', newsError);
    } else {
      console.log(`Deleted ${deletedNews?.length || 0} expired news items`);
    }

    // Delete expired posts (24 hours)
    const { data: deletedPosts, error: postsError } = await supabase
      .from('feed_posts')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .select('id, image_url');

    if (postsError) {
      console.error('Error deleting expired posts:', postsError);
    } else {
      console.log(`Deleted ${deletedPosts?.length || 0} expired posts`);
    }

    // Collect image URLs for potential Cloudinary cleanup
    const expiredImages: string[] = [];
    
    deletedNews?.forEach(item => {
      if (item.image_url && item.image_url.includes('cloudinary')) {
        expiredImages.push(item.image_url);
      }
    });
    
    deletedPosts?.forEach(item => {
      if (item.image_url && item.image_url.includes('cloudinary')) {
        expiredImages.push(item.image_url);
      }
    });

    console.log(`Found ${expiredImages.length} images to potentially clean from storage`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_news: deletedNews?.length || 0,
        deleted_posts: deletedPosts?.length || 0,
        expired_images: expiredImages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Cleanup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
