import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Newspaper,
  RefreshCw,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Send,
  Instagram,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import logoRound from "@/assets/logo-praieiro-circle.png";

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  source: string | null;
  type: string | null;
  created_at: string;
}

interface FeedPost {
  id: string;
  text_content: string | null;
  image_url: string | null;
  user_id: string;
  user_type: string;
  created_at: string;
  user_name?: string;
  user_photo?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"news" | "social">("news");
  const [newPostText, setNewPostText] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Fetch cached news
  const { data: news, isLoading: newsLoading, refetch: refetchNews } = useQuery({
    queryKey: ["cached-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cached_news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as NewsItem[];
    },
  });

  // Fetch social feed posts
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["feed-posts", user?.id],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user info and engagement counts for each post
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          // CORRECT: profiles.id = feed_posts.user_id (ambos são auth.users.id)
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", post.user_id)
            .single();

          // Get likes count
          const { count: likesCount } = await supabase
            .from("feed_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Get comments count
          const { count: commentsCount } = await supabase
            .from("feed_comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Check if current user liked
          let isLiked = false;
          if (user) {
            const { data: like } = await supabase
              .from("feed_likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .single();
            isLiked = !!like;
          }

          return {
            ...post,
            user_name: profile?.full_name || "Usuário",
            user_photo: profile?.profile_photo_url,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: isLiked,
          } as FeedPost;
        })
      );

      return postsWithDetails;
    },
  });

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Faça login para curtir");
      return;
    }

    try {
      const post = posts?.find((p) => p.id === postId);
      if (!post) return;

      if (post.is_liked) {
        await supabase
          .from("feed_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("feed_likes").insert({
          post_id: postId,
          user_id: user.id,
        });
      }

      refetchPosts();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handlePost = async () => {
    if (!user) {
      toast.error("Faça login para publicar");
      return;
    }

    if (!newPostText.trim()) {
      toast.error("Digite algo para publicar");
      return;
    }

    setIsPosting(true);
    try {
      const { error } = await supabase.from("feed_posts").insert({
        text_content: newPostText.trim(),
        user_id: user.id,
        user_type: "client",
      });

      if (error) throw error;

      toast.success("Publicado com sucesso!");
      setNewPostText("");
      refetchPosts();
    } catch (error) {
      console.error("Error posting:", error);
      toast.error("Erro ao publicar");
    } finally {
      setIsPosting(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-20">
      <Header />

      <main className="container mx-auto px-4 pt-20">
        {/* Logo e Localização */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={logoRound} 
            alt="Praieiro" 
            className="w-20 h-20 rounded-full object-contain bg-white shadow-lg p-2 mb-3"
          />
          <p className="text-sm text-muted-foreground font-medium">
            Salvador, Bahia, Brasil, América do Sul
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            onClick={() => window.open("https://instagram.com/praieiro.ssa", "_blank")}
          >
            <Instagram className="h-4 w-4 mr-1" />
            @praieiro.ssa
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              Feed
            </h1>
            <p className="text-muted-foreground">Notícias e posts da comunidade</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchNews();
              refetchPosts();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "news" ? "default" : "outline"}
            onClick={() => setActiveTab("news")}
          >
            <Newspaper className="mr-2 h-4 w-4" />
            Notícias
          </Button>
          <Button
            variant={activeTab === "social" ? "default" : "outline"}
            onClick={() => setActiveTab("social")}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Comunidade
          </Button>
        </div>

        {/* News Feed */}
        {activeTab === "news" && (
          <div className="space-y-4">
            {newsLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-40 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))
            ) : news && news.length > 0 ? (
              news.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {item.image_url && (
                      <div className="relative h-48 bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {item.type && (
                          <Badge variant="secondary">{item.type}</Badge>
                        )}
                        {item.source && (
                          <span className="text-xs text-muted-foreground">{item.source}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(item.url!, "_blank")}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ler mais
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Newspaper className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma notícia disponível</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Social Feed */}
        {activeTab === "social" && (
          <div className="space-y-4">
            {/* New Post Input */}
            {user && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        placeholder="O que está acontecendo?"
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        className="mb-2"
                      />
                      <div className="flex justify-between items-center">
                        <Button variant="ghost" size="sm" disabled>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Foto
                        </Button>
                        <Button
                          size="sm"
                          onClick={handlePost}
                          disabled={isPosting || !newPostText.trim()}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Publicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts List */}
            {postsLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))
            ) : posts && posts.length > 0 ? (
              posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage src={post.user_photo || undefined} />
                        <AvatarFallback>
                          {post.user_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{post.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>

                    {post.text_content && (
                      <p className="mb-4">{post.text_content}</p>
                    )}

                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="rounded-lg mb-4 max-h-96 w-full object-cover"
                      />
                    )}

                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={post.is_liked ? "text-red-500" : ""}
                      >
                        <Heart
                          className={`h-4 w-4 mr-1 ${post.is_liked ? "fill-current" : ""}`}
                        />
                        {post.likes_count}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {post.comments_count}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma publicação ainda</p>
                  <p className="text-sm">Seja o primeiro a compartilhar algo!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
