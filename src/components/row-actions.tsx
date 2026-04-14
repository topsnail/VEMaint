import Link from "next/link";
import { Eye, Pencil, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RowActionKind = "view" | "edit" | "share" | "delete";

export type RowActionItem = {
  kind: RowActionKind;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
};

const iconByKind = {
  view: Eye,
  edit: Pencil,
  share: Share2,
  delete: Trash2,
} as const;

const titleByKind = {
  view: "查看",
  edit: "修改",
  share: "分享",
  delete: "删除",
} as const;

export function RowActions({ actions, mobile = false }: { actions: RowActionItem[]; mobile?: boolean }) {
  const wrapperClass = mobile ? "grid grid-cols-4 gap-2" : "flex flex-wrap justify-end gap-1";
  const buttonClass = mobile ? "h-9 w-full" : "h-8 w-8";
  return (
    <div className={wrapperClass}>
      {actions.map((a, i) => {
        const Icon = iconByKind[a.kind];
        const title = a.title ?? titleByKind[a.kind];
        const tone = a.kind === "delete" ? "border-rose-200 text-rose-700" : "";
        if (a.href) {
          return (
            <Button
              key={`${a.kind}-${i}`}
              asChild
              type="button"
              size="icon"
              variant="outline"
              className={`${buttonClass} ${tone}`.trim()}
              title={title}
              aria-label={title}
            >
              <Link href={a.href}>
                <Icon className="h-4 w-4" />
              </Link>
            </Button>
          );
        }
        return (
          <Button
            key={`${a.kind}-${i}`}
            type="button"
            size="icon"
            variant="outline"
            className={`${buttonClass} ${tone}`.trim()}
            title={title}
            aria-label={title}
            disabled={a.disabled}
            onClick={a.onClick}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}

