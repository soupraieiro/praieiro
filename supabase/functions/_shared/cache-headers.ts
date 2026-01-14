/**
 * CDN Cache Headers Utility
 * Provides consistent cache control headers for edge functions
 */

export interface CacheConfig {
  /** Max age in seconds for CDN/browser cache */
  maxAge: number;
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number;
  /** Stale-if-error window in seconds */
  staleIfError?: number;
  /** Whether to allow private caching only */
  isPrivate?: boolean;
  /** ETag value for conditional requests */
  etag?: string;
  /** Whether response varies by authorization */
  varyByAuth?: boolean;
}

export const CACHE_PRESETS = {
  // Real-time data (crypto prices, location) - very short cache
  REALTIME: {
    maxAge: 10,
    staleWhileRevalidate: 30,
    staleIfError: 60,
  },
  // Semi-dynamic data (market data, weather) - short cache
  DYNAMIC: {
    maxAge: 60,
    staleWhileRevalidate: 120,
    staleIfError: 300,
  },
  // Social feed content - medium cache
  SOCIAL_FEED: {
    maxAge: 300, // 5 min
    staleWhileRevalidate: 600, // 10 min
    staleIfError: 1800, // 30 min
  },
  // News and static content - longer cache
  NEWS: {
    maxAge: 900, // 15 min
    staleWhileRevalidate: 1800, // 30 min
    staleIfError: 3600, // 1 hour
  },
  // Static assets - aggressive caching
  STATIC: {
    maxAge: 86400, // 24 hours
    staleWhileRevalidate: 172800, // 48 hours
    staleIfError: 604800, // 1 week
  },
  // User-specific data - private cache only
  PRIVATE: {
    maxAge: 60,
    staleWhileRevalidate: 120,
    isPrivate: true,
  },
  // No caching
  NO_CACHE: {
    maxAge: 0,
  },
} as const;

/**
 * Generate Cache-Control header value
 */
export function getCacheControlHeader(config: CacheConfig): string {
  const parts: string[] = [];
  
  if (config.isPrivate) {
    parts.push('private');
  } else {
    parts.push('public');
  }
  
  parts.push(`max-age=${config.maxAge}`);
  
  if (config.staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }
  
  if (config.staleIfError) {
    parts.push(`stale-if-error=${config.staleIfError}`);
  }
  
  if (config.maxAge === 0) {
    parts.push('no-store', 'must-revalidate');
  }
  
  return parts.join(', ');
}

/**
 * Generate all cache-related headers
 */
export function getCacheHeaders(config: CacheConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': getCacheControlHeader(config),
  };
  
  if (config.etag) {
    headers['ETag'] = `"${config.etag}"`;
  }
  
  if (config.varyByAuth) {
    headers['Vary'] = 'Authorization';
  }
  
  // Add CDN-specific headers
  headers['CDN-Cache-Control'] = getCacheControlHeader(config);
  headers['Surrogate-Control'] = getCacheControlHeader(config);
  
  return headers;
}

/**
 * Generate ETag from content
 */
export async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if client has valid cached version
 */
export function checkConditionalRequest(
  request: Request,
  etag: string
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch) {
    const clientEtags = ifNoneMatch.split(',').map(e => e.trim().replace(/"/g, ''));
    return clientEtags.includes(etag);
  }
  return false;
}

/**
 * Create 304 Not Modified response
 */
export function createNotModifiedResponse(
  corsHeaders: Record<string, string>,
  cacheConfig: CacheConfig,
  etag: string
): Response {
  return new Response(null, {
    status: 304,
    headers: {
      ...corsHeaders,
      ...getCacheHeaders({ ...cacheConfig, etag }),
    },
  });
}
