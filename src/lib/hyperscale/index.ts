/**
 * HYPERSCALE ARCHITECTURE - LEVEL 3 BILLION USERS
 * 
 * Core modules for:
 * - Load Balancing with regional latency detection
 * - Exponential Backoff for stream resiliency
 * - Batch Processing for telemetry
 * - Optimistic Updates for zero-latency UI
 * 
 * @constitutional Art. 2.1: REALTIME-FIRST
 * @constitutional Art. 6.2: ISOLAMENTO DE EVENTOS (500ms batching)
 */

// ===================== LOAD BALANCER =====================

export interface ProviderLatency {
  providerId: string;
  latencyMs: number;
  region: string;
  timestamp: number;
  healthy: boolean;
}

export interface LoadBalancerConfig {
  maxLatencyMs: number;
  healthCheckIntervalMs: number;
  failoverThresholdMs: number;
  regionPreference: 'auto' | 'us' | 'eu' | 'asia' | 'latam';
}

const DEFAULT_LB_CONFIG: LoadBalancerConfig = {
  maxLatencyMs: 5000,
  healthCheckIntervalMs: 30000,
  failoverThresholdMs: 2000,
  regionPreference: 'auto',
};

// Regional latency cache (in-memory for instant access)
const latencyCache = new Map<string, ProviderLatency>();

// Detect user region based on timezone/locale
export function detectUserRegion(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone.includes('America/Sao_Paulo') || timezone.includes('America/Bahia')) {
    return 'latam-br';
  } else if (timezone.includes('America')) {
    return 'us';
  } else if (timezone.includes('Europe')) {
    return 'eu';
  } else if (timezone.includes('Asia')) {
    return 'asia';
  }
  return 'global';
}

// Get best provider based on latency and health
export function selectBestProvider(
  providers: string[],
  config: Partial<LoadBalancerConfig> = {}
): string {
  const mergedConfig = { ...DEFAULT_LB_CONFIG, ...config };
  const userRegion = detectUserRegion();
  
  // Sort by latency, prefer healthy providers
  const scored = providers.map(providerId => {
    const cached = latencyCache.get(providerId);
    return {
      providerId,
      score: cached 
        ? (cached.healthy ? cached.latencyMs : cached.latencyMs + 10000)
        : 1000, // Unknown providers get medium priority
      region: cached?.region || 'unknown',
    };
  });
  
  // Sort by score (lower is better)
  scored.sort((a, b) => a.score - b.score);
  
  // Return best or first available
  return scored[0]?.providerId || providers[0];
}

// Update latency cache after a request
export function updateLatencyCache(
  providerId: string,
  latencyMs: number,
  healthy: boolean
): void {
  latencyCache.set(providerId, {
    providerId,
    latencyMs,
    region: detectUserRegion(),
    timestamp: Date.now(),
    healthy,
  });
}

// Get all cached latencies for monitoring
export function getLatencyStats(): ProviderLatency[] {
  return Array.from(latencyCache.values());
}

// ===================== EXPONENTIAL BACKOFF =====================

export interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  maxRetries: number;
  jitterFactor: number;
}

const DEFAULT_BACKOFF: BackoffConfig = {
  initialDelayMs: 100,
  maxDelayMs: 30000,
  multiplier: 2,
  maxRetries: 10,
  jitterFactor: 0.3,
};

export class ExponentialBackoff {
  private attempt = 0;
  private config: BackoffConfig;

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = { ...DEFAULT_BACKOFF, ...config };
  }

  reset(): void {
    this.attempt = 0;
  }

  getNextDelay(): number {
    if (this.attempt >= this.config.maxRetries) {
      return -1; // Signal to stop retrying
    }

    const baseDelay = this.config.initialDelayMs * Math.pow(this.config.multiplier, this.attempt);
    const cappedDelay = Math.min(baseDelay, this.config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.config.jitterFactor * (Math.random() - 0.5) * 2;
    const finalDelay = Math.max(0, cappedDelay + jitter);
    
    this.attempt++;
    return Math.round(finalDelay);
  }

  getAttempt(): number {
    return this.attempt;
  }

  canRetry(): boolean {
    return this.attempt < this.config.maxRetries;
  }
}

// ===================== BATCH PROCESSOR =====================

export interface BatchConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  retryOnFailure: boolean;
}

const DEFAULT_BATCH: BatchConfig = {
  maxBatchSize: 50,
  flushIntervalMs: 500, // Art. 6.2: 500ms batching
  maxQueueSize: 1000,
  retryOnFailure: true,
};

export class BatchProcessor<T> {
  private queue: T[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private config: BatchConfig;
  private processor: (items: T[]) => Promise<void>;

  constructor(
    processor: (items: T[]) => Promise<void>,
    config: Partial<BatchConfig> = {}
  ) {
    this.processor = processor;
    this.config = { ...DEFAULT_BATCH, ...config };
  }

  add(item: T): void {
    // Drop oldest items if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      this.queue.shift();
      console.warn('[BatchProcessor] Queue full, dropping oldest item');
    }

    this.queue.push(item);

    // Flush immediately if batch is full
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.config.flushIntervalMs);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.config.maxBatchSize);

    try {
      await this.processor(batch);
    } catch (error) {
      console.error('[BatchProcessor] Flush failed:', error);
      
      if (this.config.retryOnFailure) {
        // Re-add to front of queue for retry
        this.queue.unshift(...batch);
      }
    } finally {
      this.isProcessing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.flushTimeout = setTimeout(() => this.flush(), this.config.flushIntervalMs);
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}

// ===================== OPTIMISTIC UPDATE MANAGER =====================

export interface OptimisticState<T> {
  optimistic: T;
  confirmed: T | null;
  pending: boolean;
  error: string | null;
  timestamp: number;
}

export class OptimisticUpdateManager<T> {
  private states = new Map<string, OptimisticState<T>>();
  private rollbackCallbacks = new Map<string, () => void>();

  // Apply optimistic update immediately
  apply(key: string, optimisticValue: T, onRollback?: () => void): void {
    const current = this.states.get(key);
    
    this.states.set(key, {
      optimistic: optimisticValue,
      confirmed: current?.confirmed ?? null,
      pending: true,
      error: null,
      timestamp: Date.now(),
    });

    if (onRollback) {
      this.rollbackCallbacks.set(key, onRollback);
    }
  }

  // Confirm the update (server responded successfully)
  confirm(key: string, confirmedValue: T): void {
    const current = this.states.get(key);
    
    if (current) {
      this.states.set(key, {
        ...current,
        confirmed: confirmedValue,
        pending: false,
        error: null,
      });
      this.rollbackCallbacks.delete(key);
    }
  }

  // Rollback on error
  rollback(key: string, error: string): void {
    const current = this.states.get(key);
    const callback = this.rollbackCallbacks.get(key);

    if (current) {
      this.states.set(key, {
        ...current,
        optimistic: current.confirmed ?? current.optimistic,
        pending: false,
        error,
      });
    }

    if (callback) {
      callback();
      this.rollbackCallbacks.delete(key);
    }
  }

  get(key: string): T | null {
    const state = this.states.get(key);
    return state?.optimistic ?? state?.confirmed ?? null;
  }

  getState(key: string): OptimisticState<T> | undefined {
    return this.states.get(key);
  }

  isPending(key: string): boolean {
    return this.states.get(key)?.pending ?? false;
  }

  clear(): void {
    this.states.clear();
    this.rollbackCallbacks.clear();
  }
}

// ===================== CONNECTION RESILIENCE =====================

export interface ConnectionState {
  connected: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
  nextReconnectMs: number | null;
}

export type ConnectionEventHandler = (state: ConnectionState) => void;

export class ResilientConnection {
  private backoff: ExponentialBackoff;
  private state: ConnectionState;
  private handlers: Set<ConnectionEventHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectFn: () => Promise<boolean>;

  constructor(connectFn: () => Promise<boolean>) {
    this.connectFn = connectFn;
    this.backoff = new ExponentialBackoff({
      initialDelayMs: 100,
      maxDelayMs: 30000,
      multiplier: 1.5,
      maxRetries: 20,
      jitterFactor: 0.2,
    });
    this.state = {
      connected: false,
      lastConnected: null,
      reconnectAttempts: 0,
      nextReconnectMs: null,
    };
  }

  onStateChange(handler: ConnectionEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(): void {
    this.handlers.forEach(h => h(this.state));
  }

  async connect(): Promise<boolean> {
    try {
      const success = await this.connectFn();
      
      if (success) {
        this.backoff.reset();
        this.state = {
          connected: true,
          lastConnected: Date.now(),
          reconnectAttempts: 0,
          nextReconnectMs: null,
        };
        this.notifyHandlers();
        return true;
      }
    } catch (error) {
      console.error('[ResilientConnection] Connection failed:', error);
    }

    // Schedule reconnect
    this.scheduleReconnect();
    return false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.backoff.getNextDelay();
    
    if (delay < 0) {
      console.error('[ResilientConnection] Max retries reached');
      this.state.nextReconnectMs = null;
      this.notifyHandlers();
      return;
    }

    this.state = {
      ...this.state,
      connected: false,
      reconnectAttempts: this.backoff.getAttempt(),
      nextReconnectMs: delay,
    };
    this.notifyHandlers();

    console.log(`[ResilientConnection] Reconnecting in ${delay}ms (attempt ${this.backoff.getAttempt()})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.state = {
      connected: false,
      lastConnected: this.state.lastConnected,
      reconnectAttempts: 0,
      nextReconnectMs: null,
    };
    this.notifyHandlers();
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.connected;
  }
}

// ===================== PERFORMANCE MONITOR =====================

export interface PerformanceMetrics {
  avgLatencyMs: number;
  p95LatencyMs: number;
  requestsPerSecond: number;
  errorRate: number;
  activeConnections: number;
}

class PerformanceMonitor {
  private latencies: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private lastReset = Date.now();
  private readonly maxSamples = 1000;

  recordLatency(ms: number): void {
    this.latencies.push(ms);
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }
  }

  recordRequest(success: boolean): void {
    this.requestCount++;
    if (!success) this.errorCount++;
  }

  getMetrics(): PerformanceMetrics {
    const elapsed = (Date.now() - this.lastReset) / 1000;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    
    return {
      avgLatencyMs: sorted.length > 0 
        ? sorted.reduce((a, b) => a + b, 0) / sorted.length 
        : 0,
      p95LatencyMs: sorted.length > 0 
        ? sorted[Math.floor(sorted.length * 0.95)] 
        : 0,
      requestsPerSecond: elapsed > 0 ? this.requestCount / elapsed : 0,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      activeConnections: 0, // Populated externally
    };
  }

  reset(): void {
    this.latencies = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastReset = Date.now();
  }
}

// Singleton performance monitor
export const performanceMonitor = new PerformanceMonitor();
