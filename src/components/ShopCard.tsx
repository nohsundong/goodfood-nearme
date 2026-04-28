import { useState } from "react";
import { MapPin, Phone, ExternalLink, Tag, Utensils, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDistance, formatPrice, type Shop } from "@/lib/shops";
import { addSuggestion } from "@/lib/suggestions";

interface Props {
  shop: Shop;
  distance: number | null;
}

export function ShopCard({ shop, distance }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");

  const submit = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("수정 제안 내용을 입력해 주세요.");
      return;
    }
    if (trimmed.length > 1000) {
      toast.error("내용은 1000자 이내로 작성해 주세요.");
      return;
    }
    addSuggestion({
      shopId: shop.id,
      shopName: shop.name,
      shopAddress: shop.address,
      message: trimmed,
      contact: contact.trim().slice(0, 100) || undefined,
    });
    toast.success("수정 제안이 접수되었습니다. 감사합니다!");
    setMessage("");
    setContact("");
    setOpen(false);
  };

  return (
    <article className="group rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60 transition-all hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-foreground truncate">
              {shop.name}
            </h3>
            <Badge variant="secondary" className="rounded-full text-xs">
              {shop.category}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Utensils className="h-3.5 w-3.5" />
            {shop.mainItem}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-primary tabular-nums">
            {formatPrice(shop.price)}
          </div>
          {distance !== null && (
            <div className="mt-1 text-xs font-medium text-accent">
              {formatDistance(distance)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2 text-foreground/80">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span className="leading-snug">{shop.address}</span>
        </div>
        {shop.phone && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a href={`tel:${shop.phone}`} className="hover:text-primary">
              {shop.phone}
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Tag className="h-3 w-3" />
          착한가격업소
        </span>
        {shop.naverUrl && (
          <Button
            asChild
            size="sm"
            style={{ background: "var(--gradient-hero)" }}
            className="rounded-full text-primary-foreground font-semibold shadow-md hover:shadow-lg hover:opacity-95"
          >
            <a
              href={shop.naverUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              네이버지도 <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>

      <div className="mt-3 border-t border-border/60 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-full text-xs"
          onClick={() => setOpen(true)}
        >
          <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
          정보 수정 제안
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>정보 수정 제안</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{shop.name}</span>의 잘못된 정보나
              변경 사항을 알려 주세요. 관리자가 확인 후 반영합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="suggestion-message">수정 내용 *</Label>
              <Textarea
                id="suggestion-message"
                placeholder="예) 가격이 8,000원으로 변경되었습니다 / 폐업했습니다 / 전화번호가 다릅니다"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/1000
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suggestion-contact">연락처 (선택)</Label>
              <Input
                id="suggestion-contact"
                placeholder="이메일 또는 전화번호"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={submit}>제출</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
