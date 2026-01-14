import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreHorizontal,
  Clock,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Repeat2,
  Bookmark
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeedCache, FEED_CACHE_CONFIG } from "@/hooks/useFeedCache";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import logoSatoshi from "@/assets/logo-praieiro-circle.png";

interface ThreadPost {
  id: string;
  text_content: string | null;
  image_url: string | null;
  user_id: string;
  user_type: string;
  created_at: string;
  expires_at: string | null;
  user_name: string;
  user_photo: string | null;
  user_handle: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  replies?: ThreadPost[];
}

interface ThreadsFeedProps {
  className?: string;
}

export function ThreadsFeed({ className }: ThreadsFeedProps) {
  const { user } = useAuth();
  const { fetchWithCache, invalidateCache } = useFeedCache();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch posts com cache inteligente
  const loadPosts = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        await invalidateCache("feed_posts");
      }

      const fetchPosts = async (): Promise<ThreadPost[]> => {
        // Buscar posts não expirados (fotos = 24h)
        const { data: postsData, error } = await supabase
          .from("feed_posts")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // IDENTIDADE SOBERANA: profiles.id = auth.users.id (não existe user_id em profiles)
        // feed_posts.user_id referencia profiles.id
        const authorIds = [...new Set((postsData || []).map(p => p.user_id))];
        const profilesMap = new Map();

        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url, email")
            .in("id", authorIds);

          // Map by id (não user_id)
          profiles?.forEach(p => profilesMap.set(p.id, p));
        }

        // Buscar likes e comments em batch
        const postIds = (postsData || []).map(p => p.id);
        const likesMap = new Map<string, { count: number; userLiked: boolean }>();
        const commentsMap = new Map<string, number>();

        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from("feed_likes")
            .select("post_id, user_id")
            .in("post_id", postIds);

          postIds.forEach(id => likesMap.set(id, { count: 0, userLiked: false }));
          likes?.forEach(like => {
            const current = likesMap.get(like.post_id) || { count: 0, userLiked: false };
            current.count++;
            if (like.user_id === user?.id) current.userLiked = true;
            likesMap.set(like.post_id, current);
          });

          const { data: comments } = await supabase
            .from("feed_comments")
            .select("post_id")
            .in("post_id", postIds);

          comments?.forEach(c => {
            commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
          });
        }

        return (postsData || []).map(post => {
          const profile = profilesMap.get(post.user_id);
          const likes = likesMap.get(post.id) || { count: 0, userLiked: false };
          const email = profile?.email || "";
          const handle = email.split("@")[0] || "usuario";

          return {
            id: post.id,
            text_content: post.text_content,
            image_url: post.image_url,
            user_id: post.user_id,
            user_type: post.user_type,
            created_at: post.created_at,
            expires_at: post.expires_at,
            user_name: profile?.full_name || "Usuário",
            user_photo: profile?.profile_photo_url,
            user_handle: handle,
            likes_count: likes.count,
            comments_count: commentsMap.get(post.id) || 0,
            is_liked: likes.userLiked,
          };
        });
      };

      const data = await fetchWithCache(
        `feed_posts_${user?.id || "anon"}`,
        fetchPosts,
        FEED_CACHE_CONFIG.FEED_LIST,
        "social_feed"
      );

      setPosts(data);
    } catch (error) {
      console.error("Erro ao carregar feed:", error);
      toast.error("Erro ao carregar feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, fetchWithCache, invalidateCache]);

  useEffect(() => {
    loadPosts();

    // Realtime subscription para novos posts
    const channel = supabase
      .channel("threads-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feed_posts" },
        () => {
          console.log("[ThreadsFeed] Novo post detectado, atualizando...");
          loadPosts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Faça login para curtir");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
              ...p,
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );

    try {
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
    } catch (error) {
      // Reverter se falhar
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                is_liked: post.is_liked,
                likes_count: post.likes_count,
              }
            : p
        )
      );
      console.error("Erro ao curtir:", error);
    }
  };

  const handlePost = async () => {
    if (!user) {
      toast.error("Faça login para publicar");
      return;
    }

    if (!newPostText.trim()) return;

    setIsPosting(true);
    try {
      // Fotos de usuário expiram em 24h
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase.from("feed_posts").insert({
        text_content: newPostText.trim(),
        user_id: user.id,
        user_type: "client",
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success("Publicado!");
      setNewPostText("");
      await invalidateCache("feed_posts");
      loadPosts(true);
    } catch (error) {
      console.error("Erro ao publicar:", error);
      toast.error("Erro ao publicar");
    } finally {
      setIsPosting(false);
    }
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expirando...";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts(true);
  };

  if (loading) {
    return (
      <div className={cn("space-y-0 bg-black min-h-screen", className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-neutral-800">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 bg-neutral-800" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 bg-neutral-800" />
                <Skeleton className="h-4 w-full bg-neutral-800" />
                <Skeleton className="h-4 w-3/4 bg-neutral-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("bg-black min-h-screen text-white", className)}>
      {/* Header - Threads style */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-lg border-b border-neutral-800">
        <div className="flex items-center justify-center py-3">
          <img src={logoSatoshi} alt="Praieiro" className="h-8 w-auto" />
        </div>
      </div>

      {/* Composer - Estilo Threads */}
      {user && (
        <div className="px-4 py-4 border-b border-neutral-800">
          <div className="flex gap-3">
            <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-neutral-700">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                {user.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="O que está acontecendo na praia?"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="min-h-[80px] resize-none border-0 p-0 text-[15px] placeholder:text-neutral-500 focus-visible:ring-0 bg-transparent text-white"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full"
                    disabled
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={isPosting || !newPostText.trim()}
                  className="rounded-full px-5 font-semibold bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-500"
                >
                  {isPosting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Publicar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="border-b border-neutral-800">
        <Button
          variant="ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full py-4 rounded-none text-blue-500 hover:text-blue-400 hover:bg-neutral-900/50"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? "Atualizando..." : "Novas threads"}
        </Button>
      </div>

      {/* Posts - Estilo Threads */}
      <AnimatePresence mode="popLayout">
        {posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-lg font-semibold text-white">Nenhuma thread ainda</p>
            <p className="text-sm mt-2 text-neutral-500">Seja o primeiro a compartilhar!</p>
          </motion.div>
        ) : (
          posts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.03 }}
              className="border-b border-neutral-800 hover:bg-neutral-900/40 transition-colors"
            >
              <div className="px-4 py-4">
                <div className="flex gap-3">
                  {/* Avatar com linha de conexão (estilo Threads) */}
                  <div className="flex flex-col items-center">
                    <Avatar className="h-10 w-10 flex-shrink-0 ring-1 ring-neutral-700">
                      <AvatarImage src={post.user_photo || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-sm">
                        {post.user_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Linha vertical (para replies futuras) */}
                    {post.replies && post.replies.length > 0 && (
                      <div className="w-0.5 flex-1 bg-neutral-700 mt-2" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white text-[15px] truncate">
                          {post.user_name}
                        </span>
                        {post.user_type === "vendor" && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                            Vendedor
                          </span>
                        )}
                        <span className="text-neutral-500 text-sm">·</span>
                        <span className="text-neutral-500 text-sm whitespace-nowrap">
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {post.expires_at && (
                          <span className="text-xs text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            {getTimeRemaining(post.expires_at)}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-700 text-white">
                            <DropdownMenuItem className="hover:bg-neutral-800">Copiar link</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400 hover:bg-neutral-800">Denunciar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Text Content */}
                    {post.text_content && (
                      <p className="text-white mt-1 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {post.text_content}
                      </p>
                    )}

                    {/* Image */}
                    {post.image_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-neutral-800">
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full max-h-[500px] object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Actions - Threads style */}
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={cn(
                          "h-9 px-3 gap-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800",
                          post.is_liked && "text-red-500 hover:text-red-400"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-5 w-5 transition-all",
                            post.is_liked && "fill-current"
                          )}
                        />
                        {post.likes_count > 0 && (
                          <span className="text-sm font-medium">{post.likes_count}</span>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                        className="h-9 px-3 gap-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                      >
                        <MessageCircle className="h-5 w-5" />
                        {post.comments_count > 0 && (
                          <span className="text-sm font-medium">{post.comments_count}</span>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 gap-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                      >
                        <Repeat2 className="h-5 w-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 gap-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Engagement stats - Threads style */}
                    {(post.likes_count > 0 || post.comments_count > 0) && (
                      <div className="flex items-center gap-2 mt-2 text-neutral-500 text-sm">
                        {post.comments_count > 0 && (
                          <span>{post.comments_count} {post.comments_count === 1 ? 'resposta' : 'respostas'}</span>
                        )}
                        {post.likes_count > 0 && post.comments_count > 0 && (
                          <span>·</span>
                        )}
                        {post.likes_count > 0 && (
                          <span>{post.likes_count} {post.likes_count === 1 ? 'curtida' : 'curtidas'}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </AnimatePresence>

      {/* Bottom spacing for navigation */}
      <div className="h-20" />
    </div>
  );
}