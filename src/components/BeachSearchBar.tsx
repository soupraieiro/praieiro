import { useState, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface BeachSearchBarProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
  placeholder?: string;
}

export const BeachSearchBar = ({ 
  onSelectLocation, 
  placeholder = "Buscar praias, restaurantes, pousadas..." 
}: BeachSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search focused on Salvador, BA - beaches and tourist spots
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: {
          action: 'search',
          query: `${searchQuery} Salvador Bahia Brasil`,
          lat: -12.9714,
          lon: -38.5014,
          radius: 50000
        }
      });

      if (error) throw error;
      setResults(data?.results || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelectLocation(
      result.geometry.location.lat,
      result.geometry.location.lng,
      result.name
    );
    setQuery(result.name);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchPlaces(e.target.value);
          }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-12 pr-4 py-6 text-lg rounded-full border-2 border-primary/20 focus:border-primary shadow-lg bg-card"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <Button
              key={result.place_id}
              variant="ghost"
              className="w-full justify-start px-4 py-4 h-auto hover:bg-secondary/50 rounded-none border-b border-border/50 last:border-b-0"
              onClick={() => handleSelect(result)}
            >
              <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium text-foreground">{result.name}</p>
                <p className="text-sm text-muted-foreground truncate max-w-md">
                  {result.formatted_address}
                </p>
              </div>
            </Button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-2xl border border-border p-6 z-50">
          <p className="text-muted-foreground text-center">
            Nenhum resultado encontrado para "{query}"
          </p>
        </div>
      )}
    </div>
  );
};
