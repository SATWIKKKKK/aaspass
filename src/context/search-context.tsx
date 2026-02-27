"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  type SearchState,
  DEFAULT_SEARCH_STATE,
  getSearchState,
  saveSearchState,
  clearSearchState,
} from "@/lib/search-state";

interface SearchContextValue {
  search: SearchState;
  updateSearch: (updates: Partial<SearchState>) => void;
  resetSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState<SearchState>(DEFAULT_SEARCH_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const saved = getSearchState();
    setSearch(saved);
    setHydrated(true);
  }, []);

  const updateSearch = (updates: Partial<SearchState>) => {
    setSearch((prev) => {
      const next = { ...prev, ...updates };
      saveSearchState(next);
      return next;
    });
  };

  const resetSearch = () => {
    clearSearchState();
    setSearch({ ...DEFAULT_SEARCH_STATE });
  };

  return (
    <SearchContext.Provider value={{ search, updateSearch, resetSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
