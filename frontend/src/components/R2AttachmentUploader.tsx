import { Progress } from "@/components/ui/legacy";
import { useEffect, useState } from "react";
import { uploadFileWithProgress } from "../lib/http";
import { Inbox } from "lucide-react";
import { AttachmentStatus } from "./AttachmentStatus";

type Props = {
  /** 已上传对象的 Key（展示用，可与表单受控） */
  value?: string | null;
  /** 完整附件 keys（用于正确计数/预览全部；不传则退回本组件内部记录） */
  keys?: string[];
  onUploaded?: (key: string) => void;
  accept?: string;
  disabled?: boolean;
  description?: string;
};

/** R2 直传：拖拽/点击上传，图片缩略图预览 */
export function R2AttachmentUploader({
  value,
  keys,
  onUploaded,
  accept = "image/*,.pdf,.doc,.docx",
  disabled,
  description = "支持拖拽上传；图片将显示预览",
}: Props) {
  type LocalPreviewItem = {
    id: string;
    src: string;
    name: string;
    status: "pending" | "uploading" | "success" | "failed";
  };
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadingName, setUploadingName] = useState("");
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [batchSuccess, setBatchSuccess] = useState(0);
  const [batchFailed, setBatchFailed] = useState(0);
  const [statusText, setStatusText] = useState<string>("");
  const [batchSummaryText, setBatchSummaryText] = useState<string>("");
  const [localPreviews, setLocalPreviews] = useState<LocalPreviewItem[]>([]);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);

  const effectiveKeys = (keys && keys.length > 0 ? keys : uploadedKeys).filter(Boolean);
  const uploadedCount = Math.max(effectiveKeys.length, value ? 1 : 0);
  const uploaded = uploadedCount > 0;

  const compressToWebp = async (file: File, targetBytes = 200 * 1024): Promise<Blob | null> => {
    if (!file.type.startsWith("image/")) return null;
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 2048;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        return null;
      }
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const encode = (quality: number) =>
        new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/webp", quality);
        });
      let best: Blob | null = null;
      let lo = 0.4;
      let hi = 0.92;
      for (let i = 0; i < 7; i++) {
        const q = (lo + hi) / 2;
        const out = await encode(q);
        if (!out) break;
        best = out;
        if (out.size > targetBytes) hi = q;
        else lo = q;
      }
      return best;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      for (const item of localPreviews) URL.revokeObjectURL(item.src);
    };
  }, [localPreviews]);

  const uploadOne = async (file: File): Promise<boolean> => {
    setUploadingName(file.name);
    setUploadPercent(0);
    setStatusText("上传中...");

    const preview = file.type.startsWith("image/") ? await compressToWebp(file, 200 * 1024) : null;
    const res = await uploadFileWithProgress(file, { preview }, (pct) => setUploadPercent(pct));
    if (!res.ok) {
      setStatusText(`上传失败：${res.error.message || "未知错误"}`);
      return false;
    }
    onUploaded?.(res.data.key);
    setUploadedKeys((prev) => {
      const next = [res.data.key, ...prev.filter((k) => k !== res.data.key)];
      return next.slice(0, 20);
    });
    setStatusText("上传成功");
    return true;
  };

  const uploadFiles = async (files: File[]) => {
    const clean = files.filter(Boolean);
    if (clean.length === 0) return;
    if (uploading) return;

    const batchItems = clean.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
    }));
    setUploading(true);
    setBatchTotal(clean.length);
    setBatchDone(0);
    setBatchSuccess(0);
    setBatchFailed(0);
    setBatchSummaryText("");
    setStatusText("准备上传...");
    setLocalPreviews((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.src);
      return batchItems
        .filter((x) => x.file.type.startsWith("image/"))
        .map((x) => ({
          id: x.id,
          src: URL.createObjectURL(x.file),
          name: x.file.name,
          status: "pending" as const,
        }));
    });
    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const current = batchItems[i];
        setLocalPreviews((prev) =>
          prev.map((item) => (item.id === current.id ? { ...item, status: "uploading" } : item)),
        );
        // eslint-disable-next-line no-await-in-loop
        const ok = await uploadOne(current.file);
        setLocalPreviews((prev) =>
          prev.map((item) =>
            item.id === current.id ? { ...item, status: ok ? "success" : "failed" } : item,
          ),
        );
        setBatchDone((d) => d + 1);
        if (ok) {
          successCount += 1;
          setBatchSuccess(successCount);
        } else {
          failedCount += 1;
          setBatchFailed(failedCount);
        }
      }
    } finally {
      setUploading(false);
      setUploadPercent(0);
      setUploadingName("");
      setBatchSummaryText(`本批次完成：成功 ${successCount}，失败 ${failedCount}`);
      setStatusText("");
      window.setTimeout(() => {
        setBatchTotal(0);
        setBatchDone(0);
        setBatchSuccess(0);
        setBatchFailed(0);
        setBatchSummaryText("");
      }, 6000);
    }
  };

  const overallPercent =
    batchTotal > 0 ? Math.round(((batchDone + uploadPercent / 100) / batchTotal) * 100) : uploadPercent;

  return (
    <div className="space-y-2">
      <label
        className={[
          "block cursor-pointer rounded-[6px] border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center",
          disabled || uploading ? "opacity-50" : "hover:bg-slate-100/40",
        ].join(" ")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled || uploading) return;
          const files = Array.from(e.dataTransfer.files ?? []);
          void uploadFiles(files);
        }}
      >
        <input
          type="file"
          className="hidden"
          multiple
          accept={accept}
          disabled={disabled || uploading}
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files ?? []);
            void uploadFiles(files);
            e.currentTarget.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-1.5">
          <Inbox className="h-7 w-7 text-slate-500" />
          <div className="text-sm font-medium text-slate-700">{description}</div>
        </div>
      </label>
      {uploading || batchSummaryText ? (
        <div className="rounded-[6px] border border-slate-200 bg-white px-3 py-2">
          {uploading ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <div className="min-w-0 truncate">
                  正在上传：<span className="font-medium text-slate-800">{uploadingName || "文件"}</span>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  {batchTotal > 0 ? (
                    <span className="text-slate-500">
                      {Math.min(batchDone + 1, batchTotal)}/{batchTotal}
                    </span>
                  ) : null}
                  <span className="ml-2 text-slate-700">{overallPercent}%</span>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {statusText}
                {batchTotal > 0 ? `（成功 ${batchSuccess}，失败 ${batchFailed}）` : ""}
              </div>
              <div className="mt-2">
                <Progress percent={overallPercent} />
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-600">{batchSummaryText}</div>
          )}
        </div>
      ) : null}
      {localPreviews.length > 0 ? (
        <div className="overflow-hidden rounded-main border border-[#e5e7eb] bg-[#f8fafc] p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {localPreviews.map((item, idx) => (
              <div key={item.id} className="overflow-hidden rounded-[6px] border border-slate-200 bg-white">
                <div className="relative">
                  <img src={item.src} alt={`上传预览-${idx + 1}`} className="h-20 w-full object-cover" />
                  <span
                    className={[
                      "absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      item.status === "success"
                        ? "bg-emerald-600/90 text-white"
                        : item.status === "failed"
                          ? "bg-red-600/90 text-white"
                          : item.status === "uploading"
                            ? "bg-blue-600/90 text-white"
                            : "bg-slate-700/75 text-white",
                    ].join(" ")}
                  >
                    {item.status === "success"
                      ? "已成功"
                      : item.status === "failed"
                        ? "失败"
                        : item.status === "uploading"
                          ? "上传中"
                          : "待上传"}
                  </span>
                </div>
                <div className="truncate px-1.5 py-1 text-[10px] text-slate-500" title={item.name}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-1">
        <AttachmentStatus
          uploaded={uploaded}
          count={uploadedCount}
          className="text-xs"
        />
      </div>

    </div>
  );
}
