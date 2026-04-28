import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  FileSpreadsheet,
  Trash2,
  Plus,
  Pencil,
  Save,
  X,
  Search,
  Inbox,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadShops,
  saveShops,
  resetShops,
  mergeShops,
  parseSheetRows,
  defaultShops,
  formatPrice,
  type Shop,
} from "@/lib/shops";
import {
  loadSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
  type Suggestion,
} from "@/lib/suggestions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "관리자 | 착한가격업소 데이터 관리" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const ADMIN_PASSWORD = "tbelltassi1!";
const AUTH_KEY = "admin_authed_v1";

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(window.sessionStorage.getItem(AUTH_KEY) === "1");
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      window.sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("비밀번호가 올바르지 않습니다");
    }
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPw("");
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[var(--gradient-soft)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-[var(--shadow-elegant)] ring-1 ring-border">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-center text-xl font-bold text-foreground">
            관리자 로그인
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            데이터 관리에 접근하려면 비밀번호를 입력하세요
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <Input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
            />
            {pwError && (
              <p className="text-xs text-destructive">{pwError}</p>
            )}
            <Button type="submit" className="w-full">
              로그인
            </Button>
            <Link
              to="/"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← 홈으로 돌아가기
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [shops, setShops] = useState<Shop[]>(() => loadShops());
  const [preview, setPreview] = useState<Shop[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const cats = new Map<string, number>();
    for (const s of shops) cats.set(s.category, (cats.get(s.category) ?? 0) + 1);
    return {
      total: shops.length,
      categories: Array.from(cats.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [shops]);

  const handleFile = async (file: File) => {
    setMessage(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<
        string,
        unknown
      >[];
      const parsed = parseSheetRows(rows);
      if (parsed.length === 0) {
        setMessage({
          type: "error",
          text: "엑셀에서 유효한 업소 데이터를 찾을 수 없습니다. 컬럼명을 확인해 주세요.",
        });
        setPreview(null);
        return;
      }
      setPreview(parsed);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "파일을 읽는 중 오류가 발생했습니다.",
      });
      setPreview(null);
    }
  };

  const applyMerge = () => {
    if (!preview) return;
    const merged = mergeShops(shops, preview);
    saveShops(merged);
    setShops(merged);
    const added = merged.length - shops.length;
    const updated = preview.length - added;
    setMessage({
      type: "success",
      text: `병합 완료 — 추가 ${added}건, 갱신 ${updated}건 (총 ${merged.length}건)`,
    });
    setPreview(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyReplace = () => {
    if (!preview) return;
    saveShops(preview);
    setShops(preview);
    setMessage({
      type: "success",
      text: `전체 교체 완료 — ${preview.length}건`,
    });
    setPreview(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    setConfirmReset(true);
  };

  const doReset = () => {
    resetShops();
    setShops(defaultShops);
    setMessage({ type: "success", text: "기본 데이터로 초기화되었습니다." });
    setPreview(null);
    setConfirmReset(false);
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-soft)]">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            서비스로 돌아가기
          </Link>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            로그아웃
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            데이터 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            엑셀 파일을 업로드해 착한가격업소 데이터를 갱신하세요. 동일한
            업소(업소명+주소 기준)는 자동으로 병합됩니다.
          </p>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-card p-4 ring-1 ring-border shadow-[var(--shadow-card)]">
            <div className="text-xs text-muted-foreground">총 업소 수</div>
            <div className="mt-1 text-2xl font-bold text-primary tabular-nums">
              {stats.total}
            </div>
          </div>
          {stats.categories.slice(0, 3).map(([cat, n]) => (
            <div
              key={cat}
              className="rounded-xl bg-card p-4 ring-1 ring-border shadow-[var(--shadow-card)]"
            >
              <div className="text-xs text-muted-foreground truncate">
                {cat}
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                {n}
              </div>
            </div>
          ))}
        </section>

        {/* Upload */}
        <section className="rounded-2xl bg-card p-6 ring-1 ring-border shadow-[var(--shadow-card)]">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Upload className="h-4 w-4 text-primary" />
            엑셀 업로드
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            지원 컬럼: 업소명, 업종명, 주요품목, 가격, 업소 전화번호, 주소,
            위도, 경도, 네이버지도URL
          </p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 px-6 py-10 text-center hover:bg-secondary transition">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div className="text-sm font-medium text-foreground">
              {fileName || "엑셀 파일을 선택하세요 (.xlsx, .xls)"}
            </div>
            <div className="text-xs text-muted-foreground">
              클릭하거나 파일을 끌어다 놓으세요
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>

          {message && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                message.type === "success"
                  ? "bg-accent/10 text-accent-foreground ring-1 ring-accent/30"
                  : "bg-destructive/10 text-destructive ring-1 ring-destructive/30"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {preview && (
            <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  미리보기 · {preview.length}건
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyMerge}>
                    병합 적용
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyReplace}
                  >
                    전체 교체
                  </Button>
                </div>
              </div>
              <div className="mt-3 max-h-64 overflow-auto rounded-lg bg-card ring-1 ring-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">업소명</th>
                      <th className="px-2 py-1.5 text-left">업종</th>
                      <th className="px-2 py-1.5 text-left">주요품목</th>
                      <th className="px-2 py-1.5 text-right">가격</th>
                      <th className="px-2 py-1.5 text-left">주소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((s, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1.5 font-medium">{s.name}</td>
                        <td className="px-2 py-1.5">{s.category}</td>
                        <td className="px-2 py-1.5">{s.mainItem}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatPrice(s.price)}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[200px]">
                          {s.address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 50 && (
                  <div className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                    … 외 {preview.length - 50}건
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Suggestions inbox */}
        <SuggestionsInbox />

        {/* Manage shops */}
        <ManageShops shops={shops} setShops={setShops} />

        {/* Danger zone */}
        <section className="rounded-2xl bg-card p-6 ring-1 ring-border shadow-[var(--shadow-card)]">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <RotateCcw className="h-4 w-4 text-destructive" />
            기본 데이터로 초기화
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            업로드한 데이터를 모두 삭제하고 최초 제공된 기본 데이터로 되돌립니다.
          </p>
          {confirmReset ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 ring-1 ring-destructive/30">
              <span className="text-sm text-destructive">
                정말 초기화할까요? 업로드한 데이터가 삭제됩니다.
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="destructive" onClick={doReset}>
                  네, 초기화합니다
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmReset(false)}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleReset}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              초기화
            </Button>
          )}
        </section>
      </main>
    </div>
  );
}

function emptyShop(): Shop {
  return {
    id: 0,
    name: "",
    category: "",
    mainItem: "",
    price: 0,
    phone: "",
    address: "",
    lat: 0,
    lng: 0,
    naverUrl: "",
  };
}

function ManageShops({
  shops,
  setShops,
}: {
  shops: Shop[];
  setShops: (s: Shop[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Shop>(emptyShop());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.mainItem.toLowerCase().includes(q),
    );
  }, [shops, query]);

  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const startEdit = (s: Shop) => {
    setEditingId(s.id);
    setDraft({ ...s });
  };

  const startAdd = () => {
    setEditingId("new");
    setDraft(emptyShop());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyShop());
  };

  const saveEdit = () => {
    if (!draft.name.trim()) {
      alert("업소명은 필수입니다.");
      return;
    }
    let next: Shop[];
    if (editingId === "new") {
      const maxId = shops.reduce((m, s) => Math.max(m, s.id), 0);
      next = [...shops, { ...draft, id: maxId + 1 }];
    } else {
      next = shops.map((s) => (s.id === editingId ? { ...draft } : s));
    }
    saveShops(next);
    setShops(next);
    cancelEdit();
  };

  const deleteShop = (s: Shop) => {
    if (!confirm(`"${s.name}" 업소를 삭제할까요?`)) return;
    const next = shops.filter((x) => x.id !== s.id);
    saveShops(next);
    setShops(next);
  };

  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-border shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <Pencil className="h-4 w-4 text-primary" />
          업소 관리 ({filtered.length}건)
        </h2>
        <Button size="sm" onClick={startAdd} disabled={editingId !== null}>
          <Plus className="h-4 w-4 mr-1.5" />
          새 업소 추가
        </Button>
      </div>

      <div className="mt-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="업소명, 주소, 업종, 품목으로 검색"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </div>

      {editingId !== null && (
        <ShopEditor
          draft={draft}
          setDraft={setDraft}
          onSave={saveEdit}
          onCancel={cancelEdit}
          isNew={editingId === "new"}
        />
      )}

      <div className="mt-4 overflow-auto rounded-lg ring-1 ring-border">
        <table className="w-full text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left">업소명</th>
              <th className="px-2 py-1.5 text-left">업종</th>
              <th className="px-2 py-1.5 text-left">주요품목</th>
              <th className="px-2 py-1.5 text-right">가격</th>
              <th className="px-2 py-1.5 text-left">주소</th>
              <th className="px-2 py-1.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-2 py-1.5 font-medium">{s.name}</td>
                <td className="px-2 py-1.5">{s.category}</td>
                <td className="px-2 py-1.5">{s.mainItem}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatPrice(s.price)}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[200px]">
                  {s.address}
                </td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => startEdit(s)}
                    disabled={editingId !== null}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => deleteShop(s)}
                    disabled={editingId !== null}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-6 text-center text-muted-foreground"
                >
                  검색 결과가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            이전
          </Button>
          <span className="text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            다음
          </Button>
        </div>
      )}
    </section>
  );
}

function ShopEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  isNew,
}: {
  draft: Shop;
  setDraft: (s: Shop) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const set = <K extends keyof Shop>(k: K, v: Shop[K]) =>
    setDraft({ ...draft, [k]: v });

  const field = (
    label: string,
    key: keyof Shop,
    type: "text" | "number" = "text",
  ) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        className="mt-1"
        type={type}
        value={(draft[key] as string | number) ?? ""}
        onChange={(e) =>
          set(
            key,
            (type === "number"
              ? Number(e.target.value) || 0
              : e.target.value) as Shop[typeof key],
          )
        }
      />
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="font-semibold text-foreground">
        {isNew ? "새 업소 추가" : "업소 수정"}
      </h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("업소명 *", "name")}
        {field("업종명", "category")}
        {field("주요품목", "mainItem")}
        {field("가격", "price", "number")}
        {field("전화번호", "phone")}
        {field("주소", "address")}
        {field("위도", "lat", "number")}
        {field("경도", "lng", "number")}
        <div className="sm:col-span-2">
          {field("네이버지도 URL", "naverUrl")}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1.5" />
          취소
        </Button>
        <Button size="sm" onClick={onSave}>
          <Save className="h-4 w-4 mr-1.5" />
          저장
        </Button>
      </div>
    </div>
  );
}

function SuggestionsInbox() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("pending");

  useEffect(() => {
    const refresh = () => setItems(loadSuggestions());
    refresh();
    window.addEventListener("suggestions:updated", refresh);
    return () => window.removeEventListener("suggestions:updated", refresh);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((s) => s.status === filter);
  }, [items, filter]);

  const pendingCount = items.filter((s) => s.status === "pending").length;

  const markReviewed = (id: string) => {
    updateSuggestionStatus(id, "reviewed");
    setItems(loadSuggestions());
  };

  const remove = (id: string) => {
    if (!confirm("이 제안을 삭제할까요?")) return;
    deleteSuggestion(id);
    setItems(loadSuggestions());
  };

  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-border shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <Inbox className="h-4 w-4 text-primary" />
          정보 수정 제안함
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          {(["pending", "reviewed", "all"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
            >
              {k === "pending" ? "대기" : k === "reviewed" ? "확인됨" : "전체"}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-lg bg-secondary/50 p-6 text-center text-sm text-muted-foreground">
            표시할 제안이 없습니다
          </div>
        )}
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border p-4 ${
              s.status === "pending"
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-secondary/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{s.shopName}</span>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      s.status === "pending"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "pending" ? "대기" : "확인됨"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.shopAddress}</div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(s.createdAt).toLocaleString("ko-KR")}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{s.message}</p>
            {s.contact && (
              <p className="mt-2 text-xs text-muted-foreground">
                연락처: <span className="text-foreground">{s.contact}</span>
              </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              {s.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => markReviewed(s.id)}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  확인 처리
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(s.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                삭제
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
