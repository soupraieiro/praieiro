/**
 * GEO-SHARDING & PREDICTION HOOK
 * Filters contextual data based on movement and regional climate
 * Predictive loading for 3 billion users
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GeoShard {
  shardId: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  radius: number; // km
  priority: 'critical' | 'high' | 'medium' | 'low';
  dataTypes: ('weather' | 'financial' | 'vendors' | 'events' | 'news')[];
  ttl: number; // seconds
  lastFetched?: number;
}

export interface PredictedNeed {
  type: string;
  probability: number;
  dataRequired: string[];
  preloadPriority: number;
}

export interface GeoDataCache {
  shardId: string;
  data: Record<string, unknown>;
  fetchedAt: number;
  expiresAt: number;
  compressed: boolean;
}

interface UseGeoShardingResult {
  currentShard: GeoShard | null;
  nearbyShard: GeoShard[];
  predictedShards: GeoShard[];
  prefetchData: (shards: GeoShard[]) => Promise<void>;
  getShardData: (shardId: string) => GeoDataCache | null;
  clearExpiredCache: () => void;
  isPreloading: boolean;
  cacheStats: {
    totalShards: number;
    cachedShards: number;
    hitRate: number;
    avgLatency: number;
  };
}

// Regional shard definitions
const REGIONAL_SHARDS: Record<string, Omit<GeoShard, 'shardId'>> = {
  'br-ne': {
    region: 'Nordeste',
    country: 'BR',
    lat: -12.97,
    lng: -38.50,
    radius: 500,
    priority: 'high',
    dataTypes: ['weather', 'vendors', 'events'],
    ttl: 300,
  },
  'br-se': {
    region: 'Sudeste',
    country: 'BR',
    lat: -23.55,
    lng: -46.63,
    radius: 400,
    priority: 'critical',
    dataTypes: ['weather', 'financial', 'vendors', 'events', 'news'],
    ttl: 180,
  },
  'br-s': {
    region: 'Sul',
    country: 'BR',
    lat: -25.43,
    lng: -49.27,
    radius: 400,
    priority: 'high',
    dataTypes: ['weather', 'financial', 'vendors'],
    ttl: 300,
  },
  'us-east': {
    region: 'East Coast',
    country: 'US',
    lat: 40.71,
    lng: -74.00,
    radius: 800,
    priority: 'critical',
    dataTypes: ['financial', 'news'],
    ttl: 60,
  },
  'us-west': {
    region: 'West Coast',
    country: 'US',
    lat: 37.77,
    lng: -122.42,
    radius: 800,
    priority: 'critical',
    dataTypes: ['financial', 'news'],
    ttl: 60,
  },
  'eu-west': {
    region: 'Western Europe',
    country: 'EU',
    lat: 48.86,
    lng: 2.35,
    radius: 600,
    priority: 'high',
    dataTypes: ['financial', 'news'],
    ttl: 120,
  },
  'asia-east': {
    region: 'East Asia',
    country: 'JP',
    lat: 35.68,
    lng: 139.69,
    radius: 1000,
    priority: 'high',
    dataTypes: ['financial'],
    ttl: 120,
  },
};

// Data cache store
const dataCache = new Map<string, GeoDataCache>();
const cacheHits = { hits: 0, misses: 0, latencies: [] as number[] };

export function useGeoSharding(): UseGeoShardingResult {
  const [currentShard, setCurrentShard] = useState<GeoShard | null>(null);
  const [nearbyShard, setNearbyShard] = useState<GeoShard[]>([]);
  const [predictedShards, setPredictedShards] = useState<GeoShard[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);
  
  const locationHistoryRef = useRef<{ lat: number; lng: number; time: number }[]>([]);
  const prefetchQueueRef = useRef<GeoShard[]>([]);

  // Calculate distance between two points (Haversine)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Find shard for a location
  const findShardForLocation = useCallback((lat: number, lng: number): GeoShard | null => {
    let closestShard: GeoShard | null = null;
    let minDistance = Infinity;

    for (const [shardId, shardDef] of Object.entries(REGIONAL_SHARDS)) {
      const distance = calculateDistance(lat, lng, shardDef.lat, shardDef.lng);
      
      if (distance <= shardDef.radius && distance < minDistance) {
        minDistance = distance;
        closestShard = { ...shardDef, shardId };
      }
    }

    // If no shard found, create a dynamic one
    if (!closestShard) {
      closestShard = {
        shardId: `dynamic-${lat.toFixed(2)}-${lng.toFixed(2)}`,
        region: 'Dynamic',
        country: 'XX',
        lat,
        lng,
        radius: 100,
        priority: 'medium',
        dataTypes: ['weather', 'vendors'],
        ttl: 600,
      };
    }

    return closestShard;
  }, [calculateDistance]);

  // Find nearby shards
  const findNearbyShard = useCallback((lat: number, lng: number, excludeId?: string): GeoShard[] => {
    const nearby: { shard: GeoShard; distance: number }[] = [];

    for (const [shardId, shardDef] of Object.entries(REGIONAL_SHARDS)) {
      if (shardId === excludeId) continue;
      
      const distance = calculateDistance(lat, lng, shardDef.lat, shardDef.lng);
      
      if (distance <= shardDef.radius * 2) { // Within 2x radius
        nearby.push({ shard: { ...shardDef, shardId }, distance });
      }
    }

    return nearby
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(n => n.shard);
  }, [calculateDistance]);

  // Predict movement direction and future shards
  const predictFutureShards = useCallback((): GeoShard[] => {
    const history = locationHistoryRef.current;
    if (history.length < 3) return [];

    // Calculate average movement vector
    let avgDLat = 0;
    let avgDLng = 0;

    for (let i = 1; i < history.length; i++) {
      avgDLat += history[i].lat - history[i - 1].lat;
      avgDLng += history[i].lng - history[i - 1].lng;
    }

    avgDLat /= (history.length - 1);
    avgDLng /= (history.length - 1);

    // No significant movement
    if (Math.abs(avgDLat) < 0.001 && Math.abs(avgDLng) < 0.001) {
      return [];
    }

    // Project positions at 15, 30, 60 minutes
    const projections = [15, 30, 60];
    const lastPos = history[history.length - 1];
    const predictedPositions: GeoShard[] = [];

    for (const minutes of projections) {
      const factor = minutes / 10; // Assuming history is in ~10 min intervals
      const predictedLat = lastPos.lat + (avgDLat * factor);
      const predictedLng = lastPos.lng + (avgDLng * factor);

      const shard = findShardForLocation(predictedLat, predictedLng);
      if (shard && !predictedPositions.find(p => p.shardId === shard.shardId)) {
        predictedPositions.push(shard);
      }
    }

    return predictedPositions;
  }, [findShardForLocation]);

  // Prefetch data for shards
  const prefetchData = useCallback(async (shards: GeoShard[]): Promise<void> => {
    if (isPreloading || shards.length === 0) return;

    setIsPreloading(true);
    const startTime = Date.now();

    try {
      // Sort by priority
      const sortedShards = [...shards].sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Fetch in parallel with concurrency limit
      const CONCURRENCY = 3;
      for (let i = 0; i < sortedShards.length; i += CONCURRENCY) {
        const batch = sortedShards.slice(i, i + CONCURRENCY);
        
        await Promise.all(
          batch.map(async (shard) => {
            // Check if already cached and not expired
            const cached = dataCache.get(shard.shardId);
            if (cached && cached.expiresAt > Date.now()) {
              cacheHits.hits++;
              return;
            }
            cacheHits.misses++;

            // Fetch data for each type
            const data: Record<string, unknown> = {};

            for (const dataType of shard.dataTypes) {
              try {
                switch (dataType) {
                  case 'weather':
                    const { data: weatherData } = await supabase.functions.invoke('openweather', {
                      body: { lat: shard.lat, lon: shard.lng },
                    });
                    data.weather = weatherData;
                    break;
                  
                  case 'financial':
                    const { data: marketData } = await supabase.functions.invoke('get-market-prices');
                    data.financial = marketData;
                    break;
                  
                  case 'vendors':
                    // Vendors fetched on-demand to avoid deep type instantiation
                    data.vendors = [];
                    break;
                }
              } catch (err) {
                console.warn(`Failed to fetch ${dataType} for shard ${shard.shardId}:`, err);
              }
            }

            // Cache the data
            const cacheEntry: GeoDataCache = {
              shardId: shard.shardId,
              data,
              fetchedAt: Date.now(),
              expiresAt: Date.now() + (shard.ttl * 1000),
              compressed: false,
            };

            dataCache.set(shard.shardId, cacheEntry);
          })
        );
      }

      // Record latency
      const latency = Date.now() - startTime;
      cacheHits.latencies.push(latency);
      if (cacheHits.latencies.length > 100) {
        cacheHits.latencies.shift();
      }

    } catch (err) {
      console.error('Prefetch error:', err);
    } finally {
      setIsPreloading(false);
    }
  }, [isPreloading]);

  // Get cached shard data
  const getShardData = useCallback((shardId: string): GeoDataCache | null => {
    const cached = dataCache.get(shardId);
    
    if (!cached) {
      cacheHits.misses++;
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      cacheHits.misses++;
      dataCache.delete(shardId);
      return null;
    }

    cacheHits.hits++;
    return cached;
  }, []);

  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    for (const [shardId, cache] of dataCache.entries()) {
      if (cache.expiresAt < now) {
        dataCache.delete(shardId);
      }
    }
  }, []);

  // Calculate cache stats
  const totalHits = cacheHits.hits + cacheHits.misses;
  const avgLat = cacheHits.latencies.length > 0
    ? cacheHits.latencies.reduce((sum, val) => sum + val, 0) / cacheHits.latencies.length
    : 0;
    
  const cacheStats = {
    totalShards: Object.keys(REGIONAL_SHARDS).length,
    cachedShards: dataCache.size,
    hitRate: totalHits > 0 ? (cacheHits.hits / totalHits) * 100 : 0,
    avgLatency: avgLat,
  };

  // Update location and shards
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Update history
        locationHistoryRef.current.push({
          lat: latitude,
          lng: longitude,
          time: Date.now(),
        });

        // Keep last 10 positions
        if (locationHistoryRef.current.length > 10) {
          locationHistoryRef.current.shift();
        }

        // Find current shard
        const shard = findShardForLocation(latitude, longitude);
        setCurrentShard(shard);

        // Find nearby shards
        const nearby = findNearbyShard(latitude, longitude, shard?.shardId);
        setNearbyShard(nearby);

        // Predict future shards
        const predicted = predictFutureShards();
        setPredictedShards(predicted);

        // Auto-prefetch current and nearby
        if (shard) {
          prefetchData([shard, ...nearby.slice(0, 2)]);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      }
    );

    // Cleanup expired cache periodically
    const cleanupInterval = setInterval(clearExpiredCache, 60000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(cleanupInterval);
    };
  }, [findShardForLocation, findNearbyShard, predictFutureShards, prefetchData, clearExpiredCache]);

  return {
    currentShard,
    nearbyShard,
    predictedShards,
    prefetchData,
    getShardData,
    clearExpiredCache,
    isPreloading,
    cacheStats,
  };
}

export default useGeoSharding;
