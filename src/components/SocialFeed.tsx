import { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Send, Camera, X, Clock, Trash2, Reply, ChevronDown, ChevronUp, Lock, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCloudinaryUpload, fileToBase64 } from '@/hooks/useCloudinaryUpload';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  text_content: string | null;
  created_at: string;
  expires_at: string | null;
  user_name: string;
  user_photo: string | null;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  user_name: string;
  user_photo: string | null;
  likes_count: number;
  user_liked: boolean;
  replies?: Comment[];
}

export const SocialFeed = () => {
  const { user } = useAuth();
  const { profile, hasProfile } = useProfile();
  const { uploadImage, isUploading } = useCloudinaryUpload();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [openPostDialog, setOpenPostDialog] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; userName: string } | null>(null);
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async () => {
    try {
      // First get all non-expired posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id (não existe user_id)
      // feed_posts.user_id referencia profiles.id
      const authorIds = [...new Set(postsData.map(p => p.user_id))];
      
      // Fetch profiles using id (identidade soberana)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url')
        .in('id', authorIds);

      // Map by id (não user_id)
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Get likes counts
      const postIds = postsData.map(p => p.id);
      const { data: likesData } = await supabase
        .from('feed_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      const likesMap = new Map<string, { count: number; userLiked: boolean }>();
      postIds.forEach(id => likesMap.set(id, { count: 0, userLiked: false }));
      
      likesData?.forEach(like => {
        const current = likesMap.get(like.post_id) || { count: 0, userLiked: false };
        current.count++;
        if (like.user_id === user?.id) current.userLiked = true;
        likesMap.set(like.post_id, current);
      });

      // Get comments counts
      const { data: commentsData } = await supabase
        .from('feed_comments')
        .select('post_id')
        .in('post_id', postIds);

      const commentsMap = new Map<string, number>();
      commentsData?.forEach(c => {
        commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
      });

      const enrichedPosts: Post[] = postsData.map(post => {
        const profile = profilesMap.get(post.user_id);
        const likes = likesMap.get(post.id) || { count: 0, userLiked: false };
        
        return {
          id: post.id,
          user_id: post.user_id,
          image_url: post.image_url,
          text_content: post.text_content,
          created_at: post.created_at,
          expires_at: post.expires_at,
          user_name: profile?.full_name || 'Usuário',
          user_photo: profile?.profile_photo_url || null,
          likes_count: likes.count,
          comments_count: commentsMap.get(post.id) || 0,
          user_liked: likes.userLiked,
        };
      });

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadComments = async (postId: string) => {
    if (loadingComments.has(postId)) return;
    
    setLoadingComments(prev => new Set(prev).add(postId));
    
    try {
      const { data: commentsData, error } = await supabase
        .from('feed_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments(prev => ({ ...prev, [postId]: [] }));
        return;
      }

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const authorIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url')
        .in('id', authorIds);

      // Map by id (não user_id)
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Get comment likes
      const commentIds = commentsData.map(c => c.id);
      const { data: commentLikesData } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);

      const commentLikesMap = new Map<string, { count: number; userLiked: boolean }>();
      commentIds.forEach(id => commentLikesMap.set(id, { count: 0, userLiked: false }));
      
      commentLikesData?.forEach(like => {
        const current = commentLikesMap.get(like.comment_id) || { count: 0, userLiked: false };
        current.count++;
        if (like.user_id === user?.id) current.userLiked = true;
        commentLikesMap.set(like.comment_id, current);
      });

      const enrichedComments: Comment[] = commentsData.map(comment => {
        const profile = profilesMap.get(comment.user_id);
        const likes = commentLikesMap.get(comment.id) || { count: 0, userLiked: false };
        
        return {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          parent_comment_id: comment.parent_comment_id || null,
          user_name: profile?.full_name || 'Usuário',
          user_photo: profile?.profile_photo_url || null,
          likes_count: likes.count,
          user_liked: likes.userLiked,
        };
      });

      // Organize comments into threads
      const topLevelComments: Comment[] = [];
      const repliesMap = new Map<string, Comment[]>();

      enrichedComments.forEach(comment => {
        if (comment.parent_comment_id) {
          const replies = repliesMap.get(comment.parent_comment_id) || [];
          replies.push(comment);
          repliesMap.set(comment.parent_comment_id, replies);
        } else {
          topLevelComments.push(comment);
        }
      });

      topLevelComments.forEach(comment => {
        comment.replies = repliesMap.get(comment.id) || [];
      });

      setComments(prev => ({ ...prev, [postId]: topLevelComments }));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB.');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!user || !profile || !selectedImage) {
      toast.error('Selecione uma imagem para postar');
      return;
    }

    if (caption.length > 30) {
      toast.error('Legenda deve ter no máximo 30 caracteres');
      return;
    }

    setIsPosting(true);

    try {
      const base64 = await fileToBase64(selectedImage);
      const uploadResult = await uploadImage(base64, 'feed');

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Erro no upload');
      }

      const { error } = await supabase.from('feed_posts').insert({
        user_id: user.id,
        user_type: 'client',
        image_url: uploadResult.url,
        text_content: caption || null,
      });

      if (error) throw error;

      toast.success('Foto publicada! Expira em 24 horas.');
      setSelectedImage(null);
      setImagePreview(null);
      setCaption('');
      setOpenPostDialog(false);
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Erro ao publicar foto');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Faça login para curtir');
      return;
    }

    try {
      if (currentlyLiked) {
        await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
      }

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + (currentlyLiked ? -1 : 1), user_liked: !currentlyLiked }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleLikeComment = async (commentId: string, postId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Faça login para curtir');
      return;
    }

    try {
      if (currentlyLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
      }

      // Update local state
      setComments(prev => {
        const postComments = prev[postId] || [];
        const updateComment = (c: Comment): Comment => {
          if (c.id === commentId) {
            return { ...c, likes_count: c.likes_count + (currentlyLiked ? -1 : 1), user_liked: !currentlyLiked };
          }
          if (c.replies) {
            return { ...c, replies: c.replies.map(updateComment) };
          }
          return c;
        };
        return { ...prev, [postId]: postComments.map(updateComment) };
      });
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleAddComment = async (postId: string, parentCommentId?: string) => {
    if (!user) {
      toast.error('Faça login para comentar');
      return;
    }

    const content = newComments[postId]?.trim();
    if (!content) return;

    if (content.length > 20) {
      toast.error('Comentário deve ter no máximo 20 caracteres');
      return;
    }

    try {
      const insertData: { post_id: string; user_id: string; content: string; parent_comment_id?: string } = {
        post_id: postId,
        user_id: user.id,
        content,
      };

      if (parentCommentId) {
        insertData.parent_comment_id = parentCommentId;
      }

      const { error } = await supabase.from('feed_comments').insert(insertData);

      if (error) throw error;

      setNewComments(prev => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);
      await loadComments(postId);
      
      // Update comment count
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erro ao comentar');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
      if (error) throw error;
      
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post excluído');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao excluir');
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!comments[postId]) {
          loadComments(postId);
        }
      }
      return next;
    });
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expDate = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return hoursLeft > 0 ? `${hoursLeft}h restantes` : 'Expirando...';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-0">
      {/* Create Post - Threads style */}
      {user && hasProfile && (
        <Dialog open={openPostDialog} onOpenChange={setOpenPostDialog}>
          <DialogTrigger asChild>
            <div className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.profile_photo_url || undefined} />
                <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground flex-1">Compartilhar momento...</span>
              <Camera className="h-5 w-5 text-muted-foreground" />
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova foto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground">Selecionar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              )}

              <div className="space-y-2">
                <Input
                  placeholder="Legenda (máx. 30 caracteres)"
                  value={caption}
                  onChange={e => setCaption(e.target.value.slice(0, 30))}
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground text-right">{caption.length}/30</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>A foto ficará disponível por 24 horas</span>
              </div>

              <Button
                onClick={handleCreatePost}
                disabled={!selectedImage || isPosting || isUploading}
                className="w-full"
              >
                {isPosting || isUploading ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Posts List - Threads style */}
      {posts.length === 0 ? (
        <div className="p-8 text-center border-b border-border">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma foto ainda. Seja o primeiro a compartilhar!</p>
        </div>
      ) : (
        posts.map(post => (
          <article key={post.id} className="border-b border-border">
            {/* Post Header - Threads style */}
            <div className="flex items-start gap-3 px-4 pt-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={post.user_photo || undefined} />
                <AvatarFallback className="text-sm">{post.user_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{post.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: false, locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {post.expires_at && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {getTimeRemaining(post.expires_at)}
                      </Badge>
                    )}
                    {user?.id === post.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePost(post.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Caption - Threads style (above image) */}
                {post.text_content && (
                  <p className="text-sm mt-1 mb-2">{post.text_content}</p>
                )}
              </div>
            </div>

            {/* Post Image - Threads style */}
            {post.image_url && (
              <div className="mt-2 mx-4 mb-3">
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full rounded-lg object-cover max-h-[500px]"
                  loading="lazy"
                />
              </div>
            )}

            {/* Post Actions - Threads style */}
            <div className="flex items-center gap-1 px-4 pb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => user ? handleLikePost(post.id, post.user_liked) : toast.error('Faça login para curtir')}
                className={`h-8 px-2 ${post.user_liked ? 'text-red-500' : 'text-muted-foreground'}`}
              >
                <Heart className={`h-5 w-5 ${post.user_liked ? 'fill-current' : ''}`} />
              </Button>
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className="h-8 px-2 text-muted-foreground"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.error('Faça login para comentar')}
                  className="h-8 px-2 text-muted-foreground/50 cursor-not-allowed"
                >
                  <MessageCircle className="h-5 w-5" />
                  <Lock className="h-3 w-3 ml-0.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Praieiro',
                      text: post.text_content || 'Confira essa publicação no Praieiro!',
                      url: window.location.origin
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.origin);
                    toast.success('Link copiado!');
                  }
                }}
                className="h-8 px-2 text-muted-foreground"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Likes and comments count - Threads style */}
            <div className="px-4 pb-2 text-xs text-muted-foreground flex items-center gap-3">
              {post.likes_count > 0 && (
                <span>{post.likes_count} curtida{post.likes_count !== 1 ? 's' : ''}</span>
              )}
              {post.comments_count > 0 && (
                <button 
                  onClick={() => user ? toggleComments(post.id) : toast.error('Faça login para ver comentários')} 
                  className="hover:underline"
                >
                  {post.comments_count} comentário{post.comments_count !== 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Comments Section - Threads style with anonymous display */}
            {expandedComments.has(post.id) && (
              <div className="px-4 pb-4 space-y-3">
                {loadingComments.has(post.id) ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                ) : (
                  <>
                    {comments[post.id]?.map(comment => (
                      <div key={comment.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-muted">A</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium text-muted-foreground">Anônimo</span>{' '}
                              {comment.content}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false, locale: ptBR })}
                              </span>
                              <button
                                onClick={() => handleLikeComment(comment.id, post.id, comment.user_liked)}
                                className={`hover:text-foreground ${comment.user_liked ? 'text-red-500' : ''}`}
                              >
                                {comment.likes_count > 0 ? comment.likes_count : ''} ♥
                              </button>
                              <button
                                onClick={() => setReplyingTo({ postId: post.id, commentId: comment.id, userName: 'Anônimo' })}
                                className="hover:text-foreground"
                              >
                                Responder
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Replies - Anonymous */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-8 space-y-2">
                            {comment.replies.map(reply => (
                              <div key={reply.id} className="flex items-start gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-xs bg-muted">A</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">
                                    <span className="font-medium text-muted-foreground">Anônimo</span>{' '}
                                    {reply.content}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span>
                                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: false, locale: ptBR })}
                                    </span>
                                    <button
                                      onClick={() => handleLikeComment(reply.id, post.id, reply.user_liked)}
                                      className={`hover:text-foreground ${reply.user_liked ? 'text-red-500' : ''}`}
                                    >
                                      {reply.likes_count > 0 ? reply.likes_count : ''} ♥
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Comment Input - Threads style */}
                    {user && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-muted">A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                          {replyingTo?.postId === post.id && (
                            <div className="absolute -top-5 left-0 text-xs text-muted-foreground flex items-center gap-1">
                              <Reply className="h-3 w-3" />
                              Respondendo
                              <button onClick={() => setReplyingTo(null)} className="ml-1 hover:text-foreground">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <Input
                            placeholder={replyingTo?.postId === post.id ? 'Responder...' : 'Comentar...'}
                            value={newComments[post.id] || ''}
                            onChange={e => setNewComments(prev => ({ ...prev, [post.id]: e.target.value.slice(0, 20) }))}
                            maxLength={20}
                            className="h-8 text-sm border-0 bg-muted/50 focus-visible:ring-0 rounded-full"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-primary font-semibold"
                          onClick={() => handleAddComment(post.id, replyingTo?.postId === post.id ? replyingTo.commentId : undefined)}
                          disabled={!newComments[post.id]?.trim()}
                        >
                          Publicar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
};
