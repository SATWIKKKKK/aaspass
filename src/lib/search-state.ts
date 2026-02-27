/**
 * Persistent search state — survives navigation + page reload via localStorage.
 * Used by SearchContext and consumed by /home, /services, /services/map pages.
 */

const SEARCH_STATE_KEY = "aaspass_search_state";

export interface SearchState {
  serviceType: string;
  guests: number;
  rooms: number;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  checkIn: string;
  checkOut: string;
  lastUpdated?: number;
}

export const DEFAULT_SEARCH_STATE: SearchState = {
  serviceType: "",
  guests: 1,
  rooms: 1,
  location: "",
  locationLat: null,
  locationLng: null,
  checkIn: "",
  checkOut: "",
};

export function saveSearchState(state: Partial<SearchState>): void {
  try {
    const existing = getSearchState();
    const merged = { ...existing, ...state, lastUpdated: Date.now() };
    localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(merged));
  } catch {}
}

export function getSearchState(): SearchState {
  try {
    const raw = localStorage.getItem(SEARCH_STATE_KEY);
    if (!raw) return { ...DEFAULT_SEARCH_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SEARCH_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_SEARCH_STATE };
  }
}

export function clearSearchState(): void {
  try {
    localStorage.removeItem(SEARCH_STATE_KEY);
  } catch {}
}
