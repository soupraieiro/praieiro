import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SearchHit {
  objectID: string;
  name: string;
  product_category: string;
  product_description?: string;
  whatsapp_number: string;
  hashtags: string[];
  _highlightResult?: {
    name?: { value: string };
    product_category?: { value: string };
    hashtags?: Array<{ value: string }>;
  };
}

interface SearchResult {
  hits: SearchHit[];
  nbHits: number;
  query: string;
  processingTimeMS: number;
}

interface UseAlgoliaSearchResult {
  search: (query: string, filters?: string) => Promise<SearchResult | null>;
  searchHashtag: (hashtag: string) => Promise<SearchResult | null>;
  isSearching: boolean;
  error: string | null;
  results: SearchResult | null;
}

/**
 * Hook para busca instantânea via Algolia
 * Permite buscar vendedores por nome, categoria ou hashtags
 */
export function useAlgoliaSearch(): UseAlgoliaSearchResult {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult | null>(null);

  const search = useCallback(async (
    query: string, 
    filters?: string
  ): Promise<SearchResult | null> => {
    if (!query.trim()) {
      setResults(null);
      return null;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("algolia-search", {
        body: { query, filters, indexName: "vendors" },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const searchResult: SearchResult = {
        hits: data.hits,
        nbHits: data.nbHits,
        query: data.query,
        processingTimeMS: data.processingTimeMS,
      };

      setResults(searchResult);
      return searchResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro na busca";
      setError(errorMessage);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchHashtag = useCallback(async (hashtag: string): Promise<SearchResult | null> => {
    // Remove # if present and search
    const cleanHashtag = hashtag.replace(/^#/, '').toLowerCase();
    return search(cleanHashtag, `hashtags:${cleanHashtag}`);
  }, [search]);

  return {
    search,
    searchHashtag,
    isSearching,
    error,
    results,
  };
}

// Popular hashtags for suggestions
export const popularHashtags = [
  "#Acaraje",
  "#Barra",
  "#Itapua",
  "#Acai",
  "#Cerveja",
  "#Agua",
  "#Praia",
  "#Queijo",
  "#Milho",
  "#Coco",
];
