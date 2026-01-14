import { useEffect, useState, useCallback } from 'react';
import { MapPin, Clock, Utensils, Building2, Palmtree, Newspaper, Plane, Heart, MessageCircle, Camera, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedItem {
  id: string;
  type: 'news' | 'post';
  content_type?: 'beach' | 'travel' | 'hotel' | 'restaurant' | 'news';
  title?: string;
  description?: string;
  image_url: string | null;
  text_content?: string;
  source?: string;
  created_at: string;
  expires_at?: string;
  user_id?: string;
  user_name?: string;
  user_photo?: string;
  likes_count?: number;
  comments_count?: number;
  user_liked?: boolean;
}

const getTypeIcon = (type?: string) => {
  switch (type) {
    case 'restaurant': return <Utensils className="h-3.5 w-3.5" />;
    case 'hotel': return <Building2 className="h-3.5 w-3.5" />;
    case 'beach': return <Palmtree className="h-3.5 w-3.5" />;
    case 'travel': return <Plane className="h-3.5 w-3.5" />;
    default: return <Newspaper className="h-3.5 w-3.5" />;
  }
};

const getTypeBadgeStyle = (type?: string) => {
  const styles: Record<string, string> = {
    restaurant: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    hotel: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    beach: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    travel: 'bg-green-500/10 text-green-600 border-green-500/20',
    news: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };
  return styles[type || 'news'] || styles.news;
};

const getTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    restaurant: 'Gastronomia',
    hotel: 'Hospedagem',
    beach: 'Praia',
    travel: 'Viagem',
    news: 'Dica',
  };
  return labels[type || 'news'] || 'Dica';
};

export const UnifiedFeed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      // Fetch news from cached_news
      const { data: newsData, error: newsError } = await supabase
        .from('cached_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (newsError) console.error('Error loading news:', newsError);

      // Fetch posts from feed_posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) console.error('Error loading posts:', postsError);

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id (não existe user_id)
      // feed_posts.user_id referencia profiles.id
      const authorIds = [...new Set((postsData || []).map(p => p.user_id))];
      let profilesMap = new Map();
      
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url')
          .in('id', authorIds);
        
        // Map by id (não user_id)
        profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      }

      // Get likes data for posts
      const postIds = (postsData || []).map(p => p.id);
      let likesMap = new Map<string, { count: number; userLiked: boolean }>();
      let commentsMap = new Map<string, number>();

      if (postIds.length > 0) {
        const { data: likesData } = await supabase
          .from('feed_likes')
          .select('post_id, user_id')
          .in('post_id', postIds);

        postIds.forEach(id => likesMap.set(id, { count: 0, userLiked: false }));
        likesData?.forEach(like => {
          const current = likesMap.get(like.post_id) || { count: 0, userLiked: false };
          current.count++;
          if (like.user_id === user?.id) current.userLiked = true;
          likesMap.set(like.post_id, current);
        });

        const { data: commentsData } = await supabase
          .from('feed_comments')
          .select('post_id')
          .in('post_id', postIds);

        commentsData?.forEach(c => {
          commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
        });
      }

      // Transform news items
      const newsItems: FeedItem[] = (newsData || []).map(item => ({
        id: `news-${item.id}`,
        type: 'news' as const,
        content_type: item.type as FeedItem['content_type'],
        title: item.title,
        description: item.description,
        image_url: item.image_url,
        source: item.source,
        created_at: item.created_at,
        expires_at: item.expires_at,
      }));

      // Transform post items
      const postItems: FeedItem[] = (postsData || []).map(post => {
        const profile = profilesMap.get(post.user_id);
        const likes = likesMap.get(post.id) || { count: 0, userLiked: false };
        
        return {
          id: `post-${post.id}`,
          type: 'post' as const,
          image_url: post.image_url,
          text_content: post.text_content,
          created_at: post.created_at,
          expires_at: post.expires_at,
          user_id: post.user_id,
          user_name: profile?.full_name || 'Usuário',
          user_photo: profile?.profile_photo_url,
          likes_count: likes.count,
          comments_count: commentsMap.get(post.id) || 0,
          user_liked: likes.userLiked,
        };
      });

      // Combine and sort by created_at
      const allItems = [...newsItems, ...postItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(allItems);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFeed();

    // Subscribe to realtime updates
    const newsChannel = supabase
      .channel('unified-feed-news')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cached_news' }, () => {
        console.log('News updated, refreshing feed...');
        loadFeed();
      })
      .subscribe();

    const postsChannel = supabase
      .channel('unified-feed-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => {
        console.log('Posts updated, refreshing feed...');
        loadFeed();
      })
      .subscribe();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => loadFeed(), 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(newsChannel);
      supabase.removeChannel(postsChannel);
      clearInterval(interval);
    };
  }, [loadFeed]);

  const handleLikePost = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Faça login para curtir');
      return;
    }

    const realPostId = postId.replace('post-', '');

    try {
      if (currentlyLiked) {
        await supabase.from('feed_likes').delete().eq('post_id', realPostId).eq('user_id', user.id);
      } else {
        await supabase.from('feed_likes').insert({ post_id: realPostId, user_id: user.id });
      }

      setItems(prev =>
        prev.map(item =>
          item.id === postId
            ? { 
                ...item, 
                likes_count: (item.likes_count || 0) + (currentlyLiked ? -1 : 1), 
                user_liked: !currentlyLiked 
              }
            : item
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed();
    toast.success('Feed atualizado!');
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const expDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirando...';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h restantes`;
    return `${minutes}min restantes`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-64 w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Feed Praieiro
          </h2>
          <p className="text-sm text-muted-foreground">
            Dicas e momentos da comunidade
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Feed Items */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <Card className="p-8 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum conteúdo no momento</p>
            <p className="text-sm text-muted-foreground mt-1">O feed será atualizado automaticamente</p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.type === 'news' ? (
                // News Card - Read Only, No external links
                <div className="group">
                  {item.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="outline" className={`${getTypeBadgeStyle(item.content_type)} flex items-center gap-1 bg-white/90 backdrop-blur-sm`}>
                          {getTypeIcon(item.content_type)}
                          {getTypeLabel(item.content_type)}
                        </Badge>
                      </div>
                      {item.expires_at && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3 text-white" />
                          <span className="text-xs text-white">{getTimeRemaining(item.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-display font-bold text-lg text-foreground mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>Brasil</span>
                      </div>
                      <span className="text-xs capitalize">{item.source}</span>
                    </div>
                  </CardContent>
                </div>
              ) : (
                // User Post Card
                <div>
                  {/* Post Header */}
                  <div className="p-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.user_photo || undefined} />
                        <AvatarFallback>{item.user_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{item.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Momento
                    </Badge>
                  </div>

                  {/* Post Image */}
                  {item.image_url && (
                    <div className="relative">
                      <img
                        src={item.image_url}
                        alt="Post"
                        className="w-full max-h-96 object-cover"
                        loading="lazy"
                      />
                      {item.expires_at && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3 text-white" />
                          <span className="text-xs text-white">{getTimeRemaining(item.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Post Content */}
                  <CardContent className="p-4 pt-3">
                    {item.text_content && (
                      <p className="text-sm mb-3">{item.text_content}</p>
                    )}
                    
                    {/* Post Actions */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-8 px-2"
                        onClick={() => handleLikePost(item.id, item.user_liked || false)}
                      >
                        <Heart className={`h-4 w-4 ${item.user_liked ? 'fill-red-500 text-red-500' : ''}`} />
                        <span className="text-sm">{item.likes_count || 0}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm">{item.comments_count || 0}</span>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
