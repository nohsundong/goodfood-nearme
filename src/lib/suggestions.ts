export type Suggestion = {
  id: string;
  shopId: number;
  shopName: string;
  shopAddress: string;
  message: string;
  contact?: string;
  status: "pending" | "reviewed";
  createdAt: number;
};

const STORAGE_KEY = "shop_suggestions_v1";

export function loadSuggestions(): Suggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Suggestion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSuggestions(list: Suggestion[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("suggestions:updated"));
}

export function addSuggestion(s: Omit<Suggestion, "id" | "status" | "createdAt">): Suggestion {
  const list = loadSuggestions();
  const item: Suggestion = {
    ...s,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "pending",
    createdAt: Date.now(),
  };
  saveSuggestions([item, ...list]);
  return item;
}

export function updateSuggestionStatus(id: string, status: Suggestion["status"]): void {
  const list = loadSuggestions().map((s) => (s.id === id ? { ...s, status } : s));
  saveSuggestions(list);
}

export function deleteSuggestion(id: string): void {
  saveSuggestions(loadSuggestions().filter((s) => s.id !== id));
}
