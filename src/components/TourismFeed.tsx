import { useEffect, useState } from 'react';
import { Clock, Camera, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialFeed } from '@/components/SocialFeed';
import { UnifiedFeed } from '@/components/UnifiedFeed';

export const TourismFeed = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div id="feed-section" className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="feed-section" className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Feed Praieiro
            </h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4" />
              Descubra e compartilhe momentos
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="feed" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="momentos" className="gap-2">
              <Camera className="h-4 w-4" />
              Momentos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="feed" className="space-y-4">
          <UnifiedFeed />
        </TabsContent>

        <TabsContent value="momentos">
          <SocialFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
};
