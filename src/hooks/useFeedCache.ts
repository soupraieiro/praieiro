import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Configuração de cache para o Feed Social
 * - Posts efêmeros: 30min a 24h (fotos de usuário = 24h)
 * - News: cache de 15 minutos
 * - Rastreamento de vendedor: SEM CACHE (sempre real-time)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
}

interface FeedCacheConfig {
  /** TTL em milissegundos */
  ttl: number;
  /** Tempo até considerar stale (pode retornar enquanto revalida) */
  staleAfter: number;
}

// Configurações de cache por tipo de conteúdo
export const FEED_CACHE_CONFIG = {
  // Posts de usuário com foto: 24 horas
  USER_POST_WITH_IMAGE: {
    ttl: 24 * 60 * 60 * 1000, // 24h
    staleAfter: 23 * 60 * 60 * 1000, // 23h (revalida na última hora)
  },
  // Posts de texto simples: 6 horas
  USER_POST_TEXT: {
    ttl: 6 * 60 * 60 * 1000, // 6h
    staleAfter: 5 * 60 * 60 * 1000, // 5h
  },
  // News/Dicas: 15 minutos
  NEWS: {
    ttl: 15 * 60 * 1000, // 15min
    staleAfter: 10 * 60 * 1000, // 10min
  },
  // Feed completo: 5 minutos (para refresh rápido)
  FEED_LIST: {
    ttl: 5 * 60 * 1000, // 5min
    staleAfter: 3 * 60 * 1000, // 3min
  },
} as const;

// In-memory cache para acesso ultra-rápido
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Hook de cache para o Feed Social
 * Combina cache em memória + cache persistente no Supabase
 */
export function useFeedCache() {
  const pendingRequests = useRef<Map<string, Promise<unknown>>>(new Map());

  /**
   * Obtém item do cache (memória primeiro, depois DB)
   */
  const getFromCache = useCallback(async <T>(
    key: string,
    config: FeedCacheConfig
  ): Promise<{ data: T | null; isStale: boolean; isFresh: boolean }> => {
    const now = Date.now();

    // 1. Verificar cache em memória
    const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      if (now < memEntry.expiresAt) {
        return {
          data: memEntry.data,
          isStale: now > memEntry.staleAt,
          isFresh: now < memEntry.staleAt,
        };
      }
      // Expirado, remover
      memoryCache.delete(key);
    }

    // 2. Verificar cache persistente no Supabase
    try {
      const { data: cacheRow } = await (supabase
        .from("cache_store" as any)
        .select("cache_value, expires_at, stale_at")
        .eq("cache_key", key)
        .single() as any);

      if (cacheRow) {
        const expiresAt = new Date(cacheRow.expires_at).getTime();
        const staleAt = cacheRow.stale_at ? new Date(cacheRow.stale_at).getTime() : expiresAt;

        if (now < expiresAt) {
          const data = cacheRow.cache_value as T;
          
          // Atualizar cache em memória
          memoryCache.set(key, {
            data,
            timestamp: now,
            expiresAt,
            staleAt,
          });

          // Incrementar hit count em background (fire and forget)
          (supabase.rpc as any)("increment_cache_hit", { p_cache_key: key }).then(() => {});

          return {
            data,
            isStale: now > staleAt,
            isFresh: now < staleAt,
          };
        }
      }
    } catch (error) {
      console.warn("[FeedCache] Erro ao ler cache persistente:", error);
    }

    return { data: null, isStale: true, isFresh: false };
  }, []);

  /**
   * Salva item no cache (memória + DB)
   */
  const setToCache = useCallback(async <T>(
    key: string,
    data: T,
    config: FeedCacheConfig,
    source: string = "feed"
  ): Promise<void> => {
    const now = Date.now();
    const expiresAt = now + config.ttl;
    const staleAt = now + config.staleAfter;

    // 1. Cache em memória (imediato)
    memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      staleAt,
    });

    // 2. Cache persistente (background)
    try {
      await (supabase.from("cache_store" as any) as any).upsert({
        cache_key: key,
        cache_value: data as object,
        source,
        expires_at: new Date(expiresAt).toISOString(),
        stale_at: new Date(staleAt).toISOString(),
        hit_count: 1,
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: "cache_key" });
    } catch (error) {
      console.warn("[FeedCache] Erro ao salvar cache persistente:", error);
    }
  }, []);

  /**
   * Invalida cache específico
   */
  const invalidateCache = useCallback(async (keyPattern: string): Promise<void> => {
    // Limpar memória
    for (const key of memoryCache.keys()) {
      if (key.includes(keyPattern)) {
        memoryCache.delete(key);
      }
    }

    // Limpar DB
    try {
      await (supabase.from("cache_store" as any) as any)
        .delete()
        .ilike("cache_key", `%${keyPattern}%`);
    } catch (error) {
      console.warn("[FeedCache] Erro ao invalidar cache:", error);
    }
  }, []);

  /**
   * Fetch com cache (stale-while-revalidate pattern)
   */
  const fetchWithCache = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    config: FeedCacheConfig,
    source: string = "feed"
  ): Promise<T> => {
    // Evitar requisições duplicadas
    const pending = pendingRequests.current.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Verificar cache
    const cached = await getFromCache<T>(key, config);

    if (cached.isFresh && cached.data) {
      return cached.data;
    }

    // Se stale mas tem dados, retornar e revalidar em background
    if (cached.isStale && cached.data) {
      // Revalidar em background (fire and forget)
      fetcher()
        .then((freshData) => setToCache(key, freshData, config, source))
        .catch((err) => console.warn("[FeedCache] Revalidation failed:", err));
      
      return cached.data;
    }

    // Cache miss - buscar dados
    const fetchPromise = fetcher()
      .then(async (data) => {
        await setToCache(key, data, config, source);
        pendingRequests.current.delete(key);
        return data;
      })
      .catch((error) => {
        pendingRequests.current.delete(key);
        throw error;
      });

    pendingRequests.current.set(key, fetchPromise);
    return fetchPromise;
  }, [getFromCache, setToCache]);

  /**
   * Limpa todo o cache de memória
   */
  const clearMemoryCache = useCallback(() => {
    memoryCache.clear();
  }, []);

  return {
    getFromCache,
    setToCache,
    invalidateCache,
    fetchWithCache,
    clearMemoryCache,
    FEED_CACHE_CONFIG,
  };
}

/**
 * IMPORTANTE: Para rastreamento de vendedor, NÃO usar cache!
 * Sempre buscar dados real-time diretamente do banco.
 */
export const VENDOR_TRACKING_NO_CACHE = true;
