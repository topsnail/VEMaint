import { cn } from "@/lib/utils";

type AttachmentStatusProps = {
  uploaded: boolean;
  /** 上传数量（用于展示“已上传X张”） */
  count?: number;
  uploadedText?: string;
  emptyText?: string;
  className?: string;
};

export function AttachmentStatus({
  uploaded,
  uploadedText = "已上传",
  emptyText = "未上传",
  count,
  className,
}: AttachmentStatusProps) {
  const uploadedLabel =
    typeof count === "number" && Number.isFinite(count) ? `已上传${Math.max(0, Math.floor(count))}张` : uploadedText;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", uploaded ? "text-emerald-700" : "text-slate-500", className)}>
      <span className={cn("h-2 w-2 rounded-full", uploaded ? "bg-emerald-500" : "bg-slate-300")} />
      <span>{uploaded ? uploadedLabel : emptyText}</span>
    </span>
  );
}

