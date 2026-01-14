import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  currency: string;
  source?: string;
}

interface MarketPricesResponse {
  crypto: CryptoPrice[];
  forex: CryptoPrice[];
  lastUpdate: string;
  isLive: boolean;
  sources?: string[];
  error?: string;
}

const FALLBACK_DATA: MarketPricesResponse = {
  crypto: [
    { symbol: "BTC", name: "Bitcoin", price: 91000, change24h: 0, currency: "USD" },
    { symbol: "ETH", name: "Ethereum", price: 3100, change24h: 0, currency: "USD" },
    { symbol: "SOL", name: "Solana", price: 138, change24h: 0, currency: "USD" },
    { symbol: "BNB", name: "BNB", price: 890, change24h: 0, currency: "USD" },
    { symbol: "XRP", name: "Ripple", price: 2.1, change24h: 0, currency: "USD" },
    { symbol: "ADA", name: "Cardano", price: 0.95, change24h: 0, currency: "USD" },
    { symbol: "DOGE", name: "Dogecoin", price: 0.32, change24h: 0, currency: "USD" },
  ],
  forex: [
    { symbol: "USD/BRL", name: "Dólar", price: 6.05, change24h: 0, currency: "BRL" },
    { symbol: "EUR/BRL", name: "Euro", price: 6.35, change24h: 0, currency: "BRL" },
    { symbol: "GBP/BRL", name: "Libra", price: 7.65, change24h: 0, currency: "BRL" },
    { symbol: "JPY/BRL", name: "Iene", price: 0.039, change24h: 0, currency: "BRL" },
    { symbol: "CNY/BRL", name: "Yuan", price: 0.83, change24h: 0, currency: "BRL" },
  ],
  lastUpdate: new Date().toISOString(),
  isLive: false,
  sources: ["Fallback"],
};

async function fetchMarketPrices(): Promise<MarketPricesResponse> {
  const { data, error } = await supabase.functions.invoke('get-market-prices');
  
  if (error) {
    console.error('Error fetching market prices:', error);
    throw error;
  }
  
  return data as MarketPricesResponse;
}

interface CryptoPricesTickerProps {
  compact?: boolean;
  showForex?: boolean;
}

export function CryptoPricesTicker({ compact = false, showForex = true }: CryptoPricesTickerProps) {
  const previousPricesRef = useRef<Record<string, number>>({});
  const [animatingPrices, setAnimatingPrices] = useState<Record<string, "up" | "down" | null>>({});

  const { data: marketData, isError } = useQuery({
    queryKey: ['market-prices'],
    queryFn: fetchMarketPrices,
    refetchInterval: 30000,
    staleTime: 25000,
    retry: 2,
    placeholderData: FALLBACK_DATA,
  });

  const prices = marketData || FALLBACK_DATA;
  const isLive = marketData?.isLive ?? false;
  const sources = marketData?.sources || ['--'];

  useEffect(() => {
    if (!marketData) return;

    const allPrices = [...marketData.crypto, ...marketData.forex];
    const animations: Record<string, "up" | "down" | null> = {};

    allPrices.forEach((p) => {
      const oldPrice = previousPricesRef.current[p.symbol];
      if (oldPrice && p.price !== oldPrice) {
        animations[p.symbol] = p.price > oldPrice ? "up" : "down";
      }
      previousPricesRef.current[p.symbol] = p.price;
    });

    if (Object.keys(animations).length > 0) {
      setAnimatingPrices(animations);
      setTimeout(() => setAnimatingPrices({}), 500);
    }
  }, [marketData]);

  const formatPrice = (price: number, currency: string) => {
    if (currency === "BRL") {
      if (price < 1) {
        return `R$ ${price.toFixed(4)}`;
      }
      return `R$ ${price.toFixed(2)}`;
    }
    if (price < 1) {
      return `$${price.toFixed(4)}`;
    }
    if (price > 1000) {
      return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0.1) return <TrendingUp className="h-3 w-3" />;
    if (change < -0.1) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0.1) return "text-green-500";
    if (change < -0.1) return "text-red-500";
    return "text-muted-foreground";
  };

  const allPrices = showForex ? [...prices.crypto, ...prices.forex] : prices.crypto;

  if (compact) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-1 text-xs">
        <div className="flex items-center gap-1" title={isLive ? `Ao vivo via ${sources.join(', ')}` : "Dados offline"}>
          {isLive ? (
            <Radio className="h-3 w-3 text-green-500 animate-pulse" />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {prices.crypto.slice(0, 4).map((p) => (
          <div
            key={p.symbol}
            className={`flex items-center gap-1 whitespace-nowrap transition-all duration-300 ${
              animatingPrices[p.symbol] === "up"
                ? "text-green-500 scale-105"
                : animatingPrices[p.symbol] === "down"
                ? "text-red-500 scale-105"
                : ""
            }`}
          >
            <span className="font-medium">{p.symbol}</span>
            <span className="text-muted-foreground">{formatPrice(p.price, p.currency)}</span>
            <span className={getChangeColor(p.change24h)}>
              {p.change24h > 0 ? "+" : ""}{p.change24h.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs">
        {isLive ? (
          <div className="flex items-center gap-1.5 text-green-500">
            <Radio className="h-3 w-3 animate-pulse" />
            <span>Ao vivo</span>
            <span className="text-muted-foreground">via {sources.join(', ')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </div>
        )}
      </div>

      {/* Crypto section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Criptomoedas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {prices.crypto.map((p) => (
            <div
              key={p.symbol}
              className={`flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 transition-all duration-300 ${
                animatingPrices[p.symbol] === "up"
                  ? "bg-green-500/20 scale-[1.02]"
                  : animatingPrices[p.symbol] === "down"
                  ? "bg-red-500/20 scale-[1.02]"
                  : ""
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{p.symbol}</span>
                <span className="text-xs text-muted-foreground">{formatPrice(p.price, p.currency)}</span>
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${getChangeColor(p.change24h)}`}>
                {getChangeIcon(p.change24h)}
                {Math.abs(p.change24h).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Forex section */}
      {showForex && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Câmbio (BRL)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {prices.forex.map((p) => (
              <div
                key={p.symbol}
                className={`flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 transition-all duration-300 ${
                  animatingPrices[p.symbol] === "up"
                    ? "bg-green-500/20 scale-[1.02]"
                    : animatingPrices[p.symbol] === "down"
                    ? "bg-red-500/20 scale-[1.02]"
                    : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{formatPrice(p.price, p.currency)}</span>
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${getChangeColor(p.change24h)}`}>
                  {getChangeIcon(p.change24h)}
                  {Math.abs(p.change24h).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
