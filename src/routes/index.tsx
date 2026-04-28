import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2, AlertCircle, Search, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShopCard } from "@/components/ShopCard";
import {
  loadShops,
  distanceMeters,
  RADIUS_OPTIONS,
  type Shop,
  type SortKey,
} from "@/lib/shops";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "착한가격업소 찾기 | 내 주변 착한 식당" },
      {
        name: "description",
        content:
          "현재 위치를 기준으로 가까운 착한가격업소를 찾아보세요. 거리·가격 순 정렬과 반경 필터를 제공합니다.",
      },
    ],
  }),
});

type Pos = { lat: number; lng: number };

function Index() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [locStatus, setLocStatus] = useState<
    "idle" | "loading" | "ok" | "denied" | "error"
  >("idle");
  const [radius, setRadius] = useState<number>(3000);
  const [sort, setSort] = useState<SortKey>("distance");
  const [shops, setShops] = useState<Shop[]>(() => loadShops());

  useEffect(() => {
    const onUpdate = () => setShops(loadShops());
    window.addEventListener("shops:updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("shops:updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocStatus("ok");
      },
      (err) => {
        setLocStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const list = useMemo(() => {
    const withDist = shops.map((s) => ({
      shop: s,
      distance:
        pos && s.lat && s.lng
          ? distanceMeters(pos.lat, pos.lng, s.lat, s.lng)
          : null,
    }));

    let filtered = withDist;
    if (pos && Number.isFinite(radius)) {
      filtered = withDist.filter(
        (x) => x.distance !== null && x.distance <= radius,
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "priceAsc") return a.shop.price - b.shop.price;
      if (sort === "priceDesc") return b.shop.price - a.shop.price;
      // distance
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return sorted;
  }, [pos, radius, sort, shops]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header
        className="text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium opacity-90">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5">
                공공데이터 기반
              </span>
              <span>요식업 · 착한가격업소</span>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur hover:bg-white/25 transition"
            >
              <Settings className="h-3.5 w-3.5" />
              관리자
            </Link>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            내 주변 착한가격업소 찾기
          </h1>
          <p className="mt-2 text-sm sm:text-base opacity-90">
            현재 위치를 기준으로 가까운 착한 식당을 거리순·가격순으로 확인하세요.
          </p>

          <button
            type="button"
            onClick={requestLocation}
            disabled={locStatus === "loading"}
            aria-label="내 위치 새로고침"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm backdrop-blur transition hover:bg-white/25 active:scale-[0.98] disabled:opacity-70"
          >
            <MapPin className="h-4 w-4" />
            {locStatus === "loading" && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                현재 위치 가져오는 중…
              </span>
            )}
            {locStatus === "ok" && pos && (
              <span className="tabular-nums">
                현재 위치 기준 ({pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}) · 새로고침
              </span>
            )}
            {(locStatus === "denied" || locStatus === "error") && (
              <span className="inline-flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                위치 정보를 사용할 수 없어요 · 다시 시도
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sticky controls */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  검색 반경
                </label>
                <Select
                  value={String(radius)}
                  onValueChange={(v) => setRadius(Number(v))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RADIUS_OPTIONS.map((o) => (
                      <SelectItem key={o.label} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  정렬
                </label>
                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as SortKey)}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">가까운 거리순</SelectItem>
                    <SelectItem value="priceAsc">가격 낮은순</SelectItem>
                    <SelectItem value="priceDesc">가격 높은순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {locStatus === "denied" && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-secondary p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                위치 권한이 거부되었습니다
              </p>
              <p className="mt-0.5 text-muted-foreground">
                거리순 정렬과 반경 필터를 사용하려면 브라우저 설정에서 위치
                권한을 허용해 주세요. 전체 목록은 그대로 확인할 수 있습니다.
              </p>
              <Button
                onClick={requestLocation}
                size="sm"
                variant="outline"
                className="mt-2 rounded-full"
              >
                위치 다시 요청
              </Button>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            총{" "}
            <strong className="text-foreground tabular-nums">
              {list.length}
            </strong>
            건
          </span>
          {!pos && Number.isFinite(radius) && (
            <span className="text-xs">
              위치 없이 반경 필터는 적용되지 않아요
            </span>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">
              조건에 맞는 착한가격업소가 없습니다
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              검색 반경을 늘려 다시 시도해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map(({ shop, distance }) => (
              <ShopCard key={shop.id} shop={shop} distance={distance} />
            ))}
          </div>
        )}

        <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          착한가격업소 공공데이터 · 거리는 위경도 기반 직선거리입니다
        </footer>
      </main>
    </div>
  );
}
