import { supabase } from '@/integrations/supabase/client';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  image_url: string;
  source: string;
  type: 'beach' | 'travel' | 'hotel' | 'restaurant' | 'news';
  created_at: string;
}

export interface NewsResponse {
  success: boolean;
  data?: NewsItem[];
  error?: string;
}

export async function fetchNews(): Promise<NewsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-news');

    if (error) {
      console.error('Error fetching news:', error);
      return { success: false, error: error.message };
    }

    return data as NewsResponse;
  } catch (error) {
    console.error('Error fetching news:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch news' 
    };
  }
}
