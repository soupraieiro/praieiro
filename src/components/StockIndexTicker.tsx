import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

const STOCK_INDICES: StockIndex[] = [
  { symbol: "IBOV", name: "Ibovespa", value: 128450, change: 0, changePercent: 0 },
  { symbol: "S&P500", name: "S&P 500", value: 5985, change: 0, changePercent: 0 },
  { symbol: "NASDAQ", name: "Nasdaq", value: 19845, change: 0, changePercent: 0 },
  { symbol: "DOW", name: "Dow Jones", value: 42890, change: 0, changePercent: 0 },
  { symbol: "DAX", name: "DAX", value: 20185, change: 0, changePercent: 0 },
  { symbol: "FTSE", name: "FTSE 100", value: 8245, change: 0, changePercent: 0 },
  { symbol: "NIKKEI", name: "Nikkei 225", value: 39450, change: 0, changePercent: 0 },
  { symbol: "HSI", name: "Hang Seng", value: 19876, change: 0, changePercent: 0 },
  { symbol: "SSE", name: "Shanghai", value: 3395, change: 0, changePercent: 0 },
];

function generateRealisticIndices(): StockIndex[] {
  const baseValues: Record<string, number> = {
    IBOV: 128450,
    "S&P500": 5985,
    NASDAQ: 19845,
    DOW: 42890,
    DAX: 20185,
    FTSE: 8245,
    NIKKEI: 39450,
    HSI: 19876,
    SSE: 3395,
  };

  return STOCK_INDICES.map((index) => {
    const base = baseValues[index.symbol];
    const changePercent = (Math.random() - 0.5) * 3;
    const change = (base * changePercent) / 100;
    return {
      ...index,
      value: base + change,
      change,
      changePercent,
    };
  });
}

export function StockIndexTicker() {
  const [indices, setIndices] = useState<StockIndex[]>(STOCK_INDICES);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setIndices(generateRealisticIndices());

    const interval = setInterval(() => {
      setIndices(generateRealisticIndices());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;

    const scroll = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += 0.5;
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  const formatValue = (value: number) => {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(0)}`;
  };

  // Duplicate for infinite scroll effect
  const displayIndices = [...indices, ...indices];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 bg-primary/95 backdrop-blur-sm border-t border-primary-foreground/20 py-2 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-x-hidden whitespace-nowrap"
        style={{ scrollBehavior: "auto" }}
      >
        {displayIndices.map((index, i) => (
          <div
            key={`${index.symbol}-${i}`}
            className="flex items-center gap-2 text-primary-foreground text-sm px-2"
          >
            <span className="font-bold">{index.symbol}</span>
            <span>{formatValue(index.value)}</span>
            <span
              className={`flex items-center gap-0.5 ${
                index.changePercent >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {index.changePercent >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatChange(index.change)} ({index.changePercent >= 0 ? "+" : ""}
              {index.changePercent.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
