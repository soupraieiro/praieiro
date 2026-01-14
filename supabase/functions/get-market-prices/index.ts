import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  CACHE_PRESETS, 
  getCacheHeaders, 
  generateETag,
  checkConditionalRequest,
  createNotModifiedResponse 
} from "../_shared/cache-headers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CDN_CACHE_CONFIG = CACHE_PRESETS.DYNAMIC;

// Cache to avoid rate limiting
let cachedData: { data: MarketData; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60000; // 60 seconds

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  currency: string;
  source?: string;
}

interface ForexPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  currency: string;
}

interface MarketData {
  crypto: CryptoPrice[];
  forex: ForexPrice[];
  lastUpdate: string;
  isLive: boolean;
  sources: string[];
}

// Fallback forex values
const FALLBACK_FOREX: ForexPrice[] = [
  { symbol: 'USD/BRL', name: 'Dólar', price: 6.05, change24h: 0, currency: 'BRL' },
  { symbol: 'EUR/BRL', name: 'Euro', price: 6.35, change24h: 0, currency: 'BRL' },
  { symbol: 'GBP/BRL', name: 'Libra', price: 7.65, change24h: 0, currency: 'BRL' },
  { symbol: 'JPY/BRL', name: 'Iene', price: 0.039, change24h: 0, currency: 'BRL' },
  { symbol: 'CNY/BRL', name: 'Yuan', price: 0.83, change24h: 0, currency: 'BRL' },
];

// Fallback crypto values
const FALLBACK_CRYPTO: CryptoPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 91000, change24h: 0, currency: 'USD', source: 'fallback' },
  { symbol: 'ETH', name: 'Ethereum', price: 3100, change24h: 0, currency: 'USD', source: 'fallback' },
  { symbol: 'SOL', name: 'Solana', price: 138, change24h: 0, currency: 'USD', source: 'fallback' },
  { symbol: 'BNB', name: 'BNB', price: 890, change24h: 0, currency: 'USD', source: 'fallback' },
  { symbol: 'XRP', name: 'Ripple', price: 2.1, change24h: 0, currency: 'USD', source: 'fallback' },
  { symbol: 'ADA', name: 'Cardano', price: 0.95, change24h: 0, currency: 'USD', source: 'fallback' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.32, change24h: 0, currency: 'USD', source: 'fallback' },
];

// API 1: CoinGecko (primary)
async function fetchFromCoinGecko(): Promise<CryptoPrice[] | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('CoinGecko response received');

    return [
      { symbol: 'BTC', name: 'Bitcoin', price: data.bitcoin?.usd || 0, change24h: data.bitcoin?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
      { symbol: 'ETH', name: 'Ethereum', price: data.ethereum?.usd || 0, change24h: data.ethereum?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
      { symbol: 'SOL', name: 'Solana', price: data.solana?.usd || 0, change24h: data.solana?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
      { symbol: 'BNB', name: 'BNB', price: data.binancecoin?.usd || 0, change24h: data.binancecoin?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
      { symbol: 'XRP', name: 'Ripple', price: data.ripple?.usd || 0, change24h: data.ripple?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
      { symbol: 'ADA', name: 'Cardano', price: data.cardano?.usd || 0, change24h: data.cardano?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
      { symbol: 'DOGE', name: 'Dogecoin', price: data.dogecoin?.usd || 0, change24h: data.dogecoin?.usd_24h_change || 0, currency: 'USD', source: 'CoinGecko' },
    ];
  } catch (error) {
    console.error('Error fetching from CoinGecko:', error);
    return null;
  }
}

// API 2: CoinPaprika (backup)
async function fetchFromCoinPaprika(): Promise<CryptoPrice[] | null> {
  try {
    const coins = ['btc-bitcoin', 'eth-ethereum', 'sol-solana', 'bnb-binance-coin', 'xrp-xrp', 'ada-cardano', 'doge-dogecoin'];
    const responses = await Promise.all(
      coins.map(coin => 
        fetch(`https://api.coinpaprika.com/v1/tickers/${coin}`, { headers: { 'Accept': 'application/json' } })
      )
    );

    const results: CryptoPrice[] = [];
    const symbolMap: Record<string, string> = {
      'btc-bitcoin': 'BTC',
      'eth-ethereum': 'ETH',
      'sol-solana': 'SOL',
      'bnb-binance-coin': 'BNB',
      'xrp-xrp': 'XRP',
      'ada-cardano': 'ADA',
      'doge-dogecoin': 'DOGE',
    };

    for (let i = 0; i < responses.length; i++) {
      if (responses[i].ok) {
        const data = await responses[i].json();
        const symbol = symbolMap[coins[i]];
        results.push({
          symbol,
          name: data.name || symbol,
          price: data.quotes?.USD?.price || 0,
          change24h: data.quotes?.USD?.percent_change_24h || 0,
          currency: 'USD',
          source: 'CoinPaprika',
        });
      }
    }

    if (results.length === 0) return null;
    console.log('CoinPaprika response received');
    return results;
  } catch (error) {
    console.error('Error fetching from CoinPaprika:', error);
    return null;
  }
}

// API 3: Binance (second backup)
async function fetchFromBinance(): Promise<CryptoPrice[] | null> {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];
    const response = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=' + JSON.stringify(symbols),
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      console.error('Binance API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Binance response received');

    const nameMap: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'SOLUSDT': 'Solana',
      'BNBUSDT': 'BNB',
      'XRPUSDT': 'Ripple',
      'ADAUSDT': 'Cardano',
      'DOGEUSDT': 'Dogecoin',
    };

    return data.map((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => ({
      symbol: item.symbol.replace('USDT', ''),
      name: nameMap[item.symbol] || item.symbol.replace('USDT', ''),
      price: parseFloat(item.lastPrice) || 0,
      change24h: parseFloat(item.priceChangePercent) || 0,
      currency: 'USD',
      source: 'Binance',
    }));
  } catch (error) {
    console.error('Error fetching from Binance:', error);
    return null;
  }
}

// Fetch crypto with fallback chain
async function fetchCryptoPrices(): Promise<{ prices: CryptoPrice[]; source: string }> {
  // Try CoinGecko first
  const coinGeckoData = await fetchFromCoinGecko();
  if (coinGeckoData && coinGeckoData.length > 0) {
    return { prices: coinGeckoData, source: 'CoinGecko' };
  }

  // Fallback to CoinPaprika
  console.log('CoinGecko failed, trying CoinPaprika...');
  const coinPaprikaData = await fetchFromCoinPaprika();
  if (coinPaprikaData && coinPaprikaData.length > 0) {
    return { prices: coinPaprikaData, source: 'CoinPaprika' };
  }

  // Fallback to Binance
  console.log('CoinPaprika failed, trying Binance...');
  const binanceData = await fetchFromBinance();
  if (binanceData && binanceData.length > 0) {
    return { prices: binanceData, source: 'Binance' };
  }

  // Final fallback
  console.log('All APIs failed, using fallback data');
  return { prices: FALLBACK_CRYPTO, source: 'Fallback' };
}

// Fetch forex (with caching to avoid rate limits)
let cachedForex: { data: ForexPrice[]; timestamp: number } | null = null;
const FOREX_CACHE_DURATION_MS = 300000; // 5 minutes

async function fetchForexPrices(): Promise<ForexPrice[]> {
  const now = Date.now();
  if (cachedForex && (now - cachedForex.timestamp) < FOREX_CACHE_DURATION_MS) {
    return cachedForex.data;
  }

  try {
    const response = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL,CNY-BRL',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      console.error('AwesomeAPI error:', response.status);
      return cachedForex?.data || FALLBACK_FOREX;
    }

    const data = await response.json();
    console.log('AwesomeAPI response received');

    const forexData: ForexPrice[] = [
      { symbol: 'USD/BRL', name: 'Dólar', price: parseFloat(data.USDBRL?.bid) || 0, change24h: parseFloat(data.USDBRL?.pctChange) || 0, currency: 'BRL' },
      { symbol: 'EUR/BRL', name: 'Euro', price: parseFloat(data.EURBRL?.bid) || 0, change24h: parseFloat(data.EURBRL?.pctChange) || 0, currency: 'BRL' },
      { symbol: 'GBP/BRL', name: 'Libra', price: parseFloat(data.GBPBRL?.bid) || 0, change24h: parseFloat(data.GBPBRL?.pctChange) || 0, currency: 'BRL' },
      { symbol: 'JPY/BRL', name: 'Iene', price: parseFloat(data.JPYBRL?.bid) || 0, change24h: parseFloat(data.JPYBRL?.pctChange) || 0, currency: 'BRL' },
      { symbol: 'CNY/BRL', name: 'Yuan', price: parseFloat(data.CNYBRL?.bid) || 0, change24h: parseFloat(data.CNYBRL?.pctChange) || 0, currency: 'BRL' },
    ];

    cachedForex = { data: forexData, timestamp: now };
    return forexData;
  } catch (error) {
    console.error('Error fetching forex prices:', error);
    return cachedForex?.data || FALLBACK_FOREX;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION_MS) {
      console.log('Returning cached data');
      const responseBody = JSON.stringify(cachedData.data);
      const etag = await generateETag(responseBody);
      
      if (checkConditionalRequest(req, etag)) {
        return createNotModifiedResponse(corsHeaders, CDN_CACHE_CONFIG, etag);
      }
      
      return new Response(responseBody, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...getCacheHeaders({ ...CDN_CACHE_CONFIG, etag }),
        },
      });
    }

    console.log('Fetching fresh market data...');

    const [cryptoResult, forex] = await Promise.all([
      fetchCryptoPrices(),
      fetchForexPrices(),
    ]);

    const responseData: MarketData = {
      crypto: cryptoResult.prices,
      forex,
      lastUpdate: new Date().toISOString(),
      isLive: cryptoResult.source !== 'Fallback',
      sources: [cryptoResult.source],
    };

    cachedData = { data: responseData, timestamp: now };
    console.log('Returning fresh data from:', cryptoResult.source);

    const responseBody = JSON.stringify(responseData);
    const etag = await generateETag(responseBody);

    return new Response(responseBody, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        ...getCacheHeaders({ ...CDN_CACHE_CONFIG, etag }),
      },
    });
  } catch (error) {
    console.error('Error in get-market-prices:', error);
    
    if (cachedData) {
      const responseBody = JSON.stringify({ ...cachedData.data, isLive: false });
      return new Response(responseBody, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...getCacheHeaders(CACHE_PRESETS.REALTIME),
        },
      });
    }

    return new Response(JSON.stringify({
      crypto: FALLBACK_CRYPTO,
      forex: FALLBACK_FOREX,
      lastUpdate: new Date().toISOString(),
      isLive: false,
      sources: ['Fallback'],
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        ...getCacheHeaders(CACHE_PRESETS.NO_CACHE),
      },
    });
  }
});
