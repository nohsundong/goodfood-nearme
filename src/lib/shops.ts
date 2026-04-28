import defaultData from "@/data/shops.json";

export type Shop = {
  id: number;
  name: string;
  category: string;
  mainItem: string;
  price: number;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  naverUrl: string;
};

type Raw = Record<string, unknown>;

const STORAGE_KEY = "shops_override_v1";

function normalize(rows: Raw[]): Shop[] {
  return rows.map((r, i) => ({
    id: Number(r["번호"] ?? r["id"] ?? i),
    name: String(r["업소명"] ?? r["name"] ?? "").trim(),
    category: String(r["업종명"] ?? r["category"] ?? "").trim(),
    mainItem: String(r["주요품목"] ?? r["mainItem"] ?? "").trim(),
    price: Number(r["가격"] ?? r["price"] ?? 0) || 0,
    phone: String(r["업소 전화번호"] ?? r["phone"] ?? "").trim(),
    address: String(r["주소"] ?? r["address"] ?? "").trim(),
    lat: Number(r["위도"] ?? r["lat"] ?? 0) || 0,
    lng: Number(r["경도"] ?? r["lng"] ?? 0) || 0,
    naverUrl: String(r["네이버지도URL"] ?? r["naverUrl"] ?? "").trim(),
  }));
}

export const defaultShops: Shop[] = normalize(defaultData as Raw[]);

export function loadShops(): Shop[] {
  if (typeof window === "undefined") return defaultShops;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultShops;
    const parsed = JSON.parse(raw) as Shop[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultShops;
    return parsed;
  } catch {
    return defaultShops;
  }
}

export function saveShops(shops: Shop[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shops));
  window.dispatchEvent(new Event("shops:updated"));
}

export function resetShops(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("shops:updated"));
}

/** Merge by name+address key. New rows added, existing rows updated. */
export function mergeShops(current: Shop[], incoming: Shop[]): Shop[] {
  const key = (s: Shop) => `${s.name}|${s.address}`;
  const map = new Map<string, Shop>();
  for (const s of current) map.set(key(s), s);
  let maxId = current.reduce((m, s) => Math.max(m, s.id), 0);
  for (const s of incoming) {
    const k = key(s);
    const existing = map.get(k);
    if (existing) {
      map.set(k, { ...existing, ...s, id: existing.id });
    } else {
      maxId += 1;
      map.set(k, { ...s, id: s.id || maxId });
    }
  }
  return Array.from(map.values());
}

export function parseSheetRows(rows: Raw[]): Shop[] {
  return normalize(rows).filter((s) => s.name && (s.lat || s.lng || s.address));
}

// Haversine formula in meters
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)}km`;
}

export function formatPrice(p: number): string {
  return p.toLocaleString("ko-KR") + "원";
}

export const RADIUS_OPTIONS = [
  { label: "100m", value: 100 },
  { label: "300m", value: 300 },
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
  { label: "3km", value: 3000 },
  { label: "5km", value: 5000 },
  { label: "10km", value: 10000 },
  { label: "20km", value: 20000 },
  { label: "30km", value: 30000 },
  { label: "전국", value: Infinity },
];

export type SortKey = "distance" | "priceAsc" | "priceDesc";
