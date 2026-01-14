/**
 * GLOBAL CONTEXT ORCHESTRATION HOOK
 * Context-Aware system that cross-references location, weather, and financial data
 * Designed for 3 billion simultaneous users
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

// AES-256 encryption key (in production, this should come from secure storage)
const ENCRYPTION_KEY = 'praieiro-global-context-2024';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
}

export interface WeatherContext {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'clear';
  temperature: number;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  uvIndex: number;
  description: string;
  icon: string;
  lastUpdated: number;
}

export interface FinancialContext {
  localCurrency: string;
  currencySymbol: string;
  exchangeRates: Record<string, number>;
  btcPrice: number;
  btcChange24h: number;
  localTaxRate: number;
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  lastUpdated: number;
}

export interface UserContext {
  location: GeoLocation | null;
  weather: WeatherContext | null;
  financial: FinancialContext | null;
  isMoving: boolean;
  movementSpeed: number; // km/h
  predictedDestination: GeoLocation | null;
  contextHash: string;
  lastSynced: number;
}

export interface ContextAwarePrompt {
  basePrompt: string;
  locationContext: string;
  weatherContext: string;
  financialContext: string;
  personalizedTone: 'formal' | 'casual' | 'urgent' | 'relaxed';
  suggestedTopics: string[];
}

interface UseGlobalContextResult {
  context: UserContext | null;
  isLoading: boolean;
  error: string | null;
  refreshContext: () => Promise<void>;
  encryptSensitiveData: (data: string) => string;
  decryptSensitiveData: (encryptedData: string) => string;
  generateContextAwarePrompt: (basePrompt: string) => ContextAwarePrompt;
  predictUserNeeds: () => string[];
}

// Currency mapping by country
const CURRENCY_MAP: Record<string, { currency: string; symbol: string; taxRate: number }> = {
  BR: { currency: 'BRL', symbol: 'R$', taxRate: 0.17 },
  US: { currency: 'USD', symbol: '$', taxRate: 0.0725 },
  GB: { currency: 'GBP', symbol: '£', taxRate: 0.20 },
  EU: { currency: 'EUR', symbol: '€', taxRate: 0.19 },
  JP: { currency: 'JPY', symbol: '¥', taxRate: 0.10 },
  CN: { currency: 'CNY', symbol: '¥', taxRate: 0.13 },
  IN: { currency: 'INR', symbol: '₹', taxRate: 0.18 },
  AU: { currency: 'AUD', symbol: 'A$', taxRate: 0.10 },
  CA: { currency: 'CAD', symbol: 'C$', taxRate: 0.05 },
  MX: { currency: 'MXN', symbol: 'Mex$', taxRate: 0.16 },
};

// Weather condition to tone mapping
const WEATHER_TONE_MAP: Record<string, 'formal' | 'casual' | 'urgent' | 'relaxed'> = {
  sunny: 'relaxed',
  clear: 'relaxed',
  cloudy: 'casual',
  rainy: 'casual',
  stormy: 'urgent',
  snowy: 'casual',
  foggy: 'formal',
};

// Location history for movement prediction
const locationHistory: GeoLocation[] = [];
const MAX_HISTORY_SIZE = 10;

export function useGlobalContext(): UseGlobalContextResult {
  const [context, setContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AES-256 Encryption
  const encryptSensitiveData = useCallback((data: string): string => {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }, []);

  // AES-256 Decryption
  const decryptSensitiveData = useCallback((encryptedData: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }, []);

  // Generate context hash for caching
  const generateContextHash = useCallback((loc: GeoLocation | null): string => {
    const data = JSON.stringify({
      lat: loc?.latitude?.toFixed(2),
      lng: loc?.longitude?.toFixed(2),
      ts: Math.floor(Date.now() / 300000), // 5-minute buckets
    });
    return CryptoJS.SHA256(data).toString().substring(0, 16);
  }, []);

  // Detect movement from location history
  const detectMovement = useCallback((newLocation: GeoLocation): { isMoving: boolean; speed: number } => {
    if (locationHistory.length === 0) {
      return { isMoving: false, speed: 0 };
    }

    const lastLocation = locationHistory[locationHistory.length - 1];
    const timeDiff = (Date.now() - (lastLocation as any).timestamp) / 1000 / 3600; // hours
    
    if (timeDiff === 0) return { isMoving: false, speed: 0 };

    // Haversine distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (newLocation.latitude - lastLocation.latitude) * Math.PI / 180;
    const dLon = (newLocation.longitude - lastLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lastLocation.latitude * Math.PI / 180) * 
      Math.cos(newLocation.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const speed = distance / timeDiff;
    const isMoving = speed > 0.5; // More than 0.5 km/h considered moving

    return { isMoving, speed };
  }, []);

  // Predict destination based on movement trajectory
  const predictDestination = useCallback((currentLocation: GeoLocation): GeoLocation | null => {
    if (locationHistory.length < 3) return null;

    // Calculate average direction vector
    let avgDLat = 0;
    let avgDLon = 0;
    
    for (let i = 1; i < locationHistory.length; i++) {
      avgDLat += locationHistory[i].latitude - locationHistory[i - 1].latitude;
      avgDLon += locationHistory[i].longitude - locationHistory[i - 1].longitude;
    }

    avgDLat /= (locationHistory.length - 1);
    avgDLon /= (locationHistory.length - 1);

    // Project 30 minutes ahead
    const projectionFactor = 6; // ~30 minutes at current rate
    
    return {
      latitude: currentLocation.latitude + (avgDLat * projectionFactor),
      longitude: currentLocation.longitude + (avgDLon * projectionFactor),
      accuracy: currentLocation.accuracy * 2, // Less accurate for predictions
    };
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(async (location: GeoLocation): Promise<WeatherContext | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('openweather', {
        body: {
          lat: location.latitude,
          lon: location.longitude,
        },
      });

      if (error) throw error;

      const weatherCondition = mapWeatherCondition(data.weather?.[0]?.main || 'Clear');
      
      return {
        condition: weatherCondition,
        temperature: data.main?.temp || 25,
        humidity: data.main?.humidity || 50,
        windSpeed: data.wind?.speed || 0,
        feelsLike: data.main?.feels_like || 25,
        uvIndex: data.uvi || 5,
        description: data.weather?.[0]?.description || 'clear sky',
        icon: data.weather?.[0]?.icon || '01d',
        lastUpdated: Date.now(),
      };
    } catch (err) {
      console.warn('Weather fetch failed, using fallback:', err);
      return {
        condition: 'clear',
        temperature: 25,
        humidity: 50,
        windSpeed: 5,
        feelsLike: 25,
        uvIndex: 5,
        description: 'weather unavailable',
        icon: '01d',
        lastUpdated: Date.now(),
      };
    }
  }, []);

  // Fetch financial data
  const fetchFinancial = useCallback(async (countryCode: string): Promise<FinancialContext> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-market-prices');
      
      if (error) throw error;

      const currencyInfo = CURRENCY_MAP[countryCode] || CURRENCY_MAP.US;
      const now = new Date();
      const hour = now.getUTCHours();
      
      // Determine market status (simplified NYSE hours)
      let marketStatus: FinancialContext['marketStatus'] = 'closed';
      if (hour >= 13 && hour < 14) marketStatus = 'pre-market';
      else if (hour >= 14 && hour < 21) marketStatus = 'open';
      else if (hour >= 21 && hour < 22) marketStatus = 'after-hours';

      return {
        localCurrency: currencyInfo.currency,
        currencySymbol: currencyInfo.symbol,
        exchangeRates: data?.rates || { USD: 1, BRL: 5.0, EUR: 0.92 },
        btcPrice: data?.btc?.usd || 0,
        btcChange24h: data?.btc?.change_24h || 0,
        localTaxRate: currencyInfo.taxRate,
        marketStatus,
        lastUpdated: Date.now(),
      };
    } catch (err) {
      console.warn('Financial fetch failed, using fallback:', err);
      const currencyInfo = CURRENCY_MAP[countryCode] || CURRENCY_MAP.US;
      return {
        localCurrency: currencyInfo.currency,
        currencySymbol: currencyInfo.symbol,
        exchangeRates: { USD: 1, BRL: 5.0, EUR: 0.92 },
        btcPrice: 0,
        btcChange24h: 0,
        localTaxRate: currencyInfo.taxRate,
        marketStatus: 'closed',
        lastUpdated: Date.now(),
      };
    }
  }, []);

  // Main context refresh
  const refreshContext = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const geoLocation: GeoLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        countryCode: 'BR', // Default, should be reverse geocoded
      };

      // Update location history
      (geoLocation as any).timestamp = Date.now();
      locationHistory.push(geoLocation);
      if (locationHistory.length > MAX_HISTORY_SIZE) {
        locationHistory.shift();
      }

      // Detect movement
      const { isMoving, speed } = detectMovement(geoLocation);
      const predictedDestination = isMoving ? predictDestination(geoLocation) : null;

      // Fetch weather and financial data in parallel
      const [weather, financial] = await Promise.all([
        fetchWeather(geoLocation),
        fetchFinancial(geoLocation.countryCode || 'BR'),
      ]);

      const newContext: UserContext = {
        location: geoLocation,
        weather,
        financial,
        isMoving,
        movementSpeed: speed,
        predictedDestination,
        contextHash: generateContextHash(geoLocation),
        lastSynced: Date.now(),
      };

      setContext(newContext);

      // Cache encrypted context
      const encryptedContext = encryptSensitiveData(JSON.stringify({
        lat: geoLocation.latitude,
        lng: geoLocation.longitude,
      }));
      localStorage.setItem('praieiro_geo_cache', encryptedContext);

    } catch (err) {
      console.error('Context refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh context');
      
      // Try to load from cache
      const cached = localStorage.getItem('praieiro_geo_cache');
      if (cached) {
        try {
          const decrypted = decryptSensitiveData(cached);
          const { lat, lng } = JSON.parse(decrypted);
          const fallbackLocation: GeoLocation = { latitude: lat, longitude: lng, accuracy: 1000 };
          const [weather, financial] = await Promise.all([
            fetchWeather(fallbackLocation),
            fetchFinancial('BR'),
          ]);
          setContext({
            location: fallbackLocation,
            weather,
            financial,
            isMoving: false,
            movementSpeed: 0,
            predictedDestination: null,
            contextHash: generateContextHash(fallbackLocation),
            lastSynced: Date.now(),
          });
        } catch {
          // Ignore cache parse errors
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    detectMovement,
    predictDestination,
    fetchWeather,
    fetchFinancial,
    generateContextHash,
    encryptSensitiveData,
    decryptSensitiveData,
  ]);

  // Generate context-aware prompt
  const generateContextAwarePrompt = useCallback((basePrompt: string): ContextAwarePrompt => {
    if (!context) {
      return {
        basePrompt,
        locationContext: '',
        weatherContext: '',
        financialContext: '',
        personalizedTone: 'casual',
        suggestedTopics: [],
      };
    }

    const { location, weather, financial } = context;

    // Build location context
    const locationContext = location
      ? `Usuário está em ${location.city || 'localização desconhecida'}, ${location.region || ''}, ${location.country || 'Brasil'}.`
      : '';

    // Build weather context
    let weatherContext = '';
    let personalizedTone: ContextAwarePrompt['personalizedTone'] = 'casual';
    
    if (weather) {
      weatherContext = `Clima: ${weather.description}, ${weather.temperature.toFixed(0)}°C, sensação de ${weather.feelsLike.toFixed(0)}°C.`;
      personalizedTone = WEATHER_TONE_MAP[weather.condition] || 'casual';
      
      // Adjust tone based on temperature
      if (weather.temperature > 35) personalizedTone = 'relaxed';
      if (weather.temperature < 10) personalizedTone = 'casual';
    }

    // Build financial context
    let financialContext = '';
    if (financial) {
      financialContext = `Moeda local: ${financial.localCurrency} (${financial.currencySymbol}). `;
      if (financial.btcPrice > 0) {
        const btcTrend = financial.btcChange24h >= 0 ? '↑' : '↓';
        financialContext += `BTC: $${financial.btcPrice.toLocaleString()} ${btcTrend}${Math.abs(financial.btcChange24h).toFixed(1)}%.`;
      }
    }

    // Generate suggested topics based on context
    const suggestedTopics: string[] = [];
    
    if (weather?.condition === 'rainy') {
      suggestedTopics.push('Atividades para dias de chuva', 'Delivery de comida');
    } else if (weather?.condition === 'sunny' && weather.temperature > 28) {
      suggestedTopics.push('Praias próximas', 'Bebidas refrescantes', 'Protetor solar');
    }
    
    if (financial?.btcChange24h && Math.abs(financial.btcChange24h) > 5) {
      suggestedTopics.push('Análise de mercado', 'Investimentos');
    }

    if (context.isMoving && context.movementSpeed > 30) {
      suggestedTopics.push('Trânsito', 'Postos de combustível', 'Restaurantes na rota');
    }

    return {
      basePrompt,
      locationContext,
      weatherContext,
      financialContext,
      personalizedTone,
      suggestedTopics,
    };
  }, [context]);

  // Predict user needs based on context
  const predictUserNeeds = useCallback((): string[] => {
    if (!context) return [];

    const needs: string[] = [];
    const { weather, financial, isMoving, movementSpeed } = context;

    // Weather-based predictions
    if (weather) {
      if (weather.condition === 'rainy') {
        needs.push('umbrella', 'indoor-activities', 'delivery');
      }
      if (weather.temperature > 30) {
        needs.push('hydration', 'beach', 'ice-cream');
      }
      if (weather.uvIndex > 7) {
        needs.push('sunscreen', 'shade', 'sunglasses');
      }
    }

    // Movement-based predictions
    if (isMoving) {
      if (movementSpeed > 50) {
        needs.push('gas-station', 'highway-restaurants', 'rest-stops');
      } else if (movementSpeed > 5) {
        needs.push('nearby-food', 'attractions', 'parking');
      }
    }

    // Financial-based predictions
    if (financial) {
      if (financial.marketStatus === 'open') {
        needs.push('market-updates', 'trading');
      }
      if (financial.btcChange24h < -5) {
        needs.push('buy-opportunity', 'market-analysis');
      }
    }

    return [...new Set(needs)];
  }, [context]);

  // Initial load
  useEffect(() => {
    refreshContext();
    
    // Refresh every 5 minutes
    const interval = setInterval(refreshContext, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshContext]);

  return {
    context,
    isLoading,
    error,
    refreshContext,
    encryptSensitiveData,
    decryptSensitiveData,
    generateContextAwarePrompt,
    predictUserNeeds,
  };
}

// Helper to map weather conditions
function mapWeatherCondition(condition: string): WeatherContext['condition'] {
  const conditionMap: Record<string, WeatherContext['condition']> = {
    Clear: 'clear',
    Sunny: 'sunny',
    Clouds: 'cloudy',
    Rain: 'rainy',
    Drizzle: 'rainy',
    Thunderstorm: 'stormy',
    Snow: 'snowy',
    Mist: 'foggy',
    Fog: 'foggy',
    Haze: 'foggy',
  };
  return conditionMap[condition] || 'clear';
}

export default useGlobalContext;
