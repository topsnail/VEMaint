import { Progress } from "@/components/ui/legacy";
import { useEffect, useMemo, useState } from "react";
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

type UploadConcurrencyMode = "weak" | "standard";
type ImageQualityMode = "balanced" | "text";
type PreviewStatus = "pending" | "uploading" | "success" | "failed";

type LocalPreviewItem = {
  id: string;
  file: File;
  src: string;
  name: string;
  status: PreviewStatus;
  error?: string;
  compressedBytes?: number;
  originalBytes?: number;
  attempts: number;
};

const CONCURRENCY_OPTIONS: Array<{ value: UploadConcurrencyMode; label: string; concurrency: number }> = [
  { value: "weak", label: "弱网（单并发）", concurrency: 1 },
  { value: "standard", label: "标准（双并发）", concurrency: 2 },
];

const QUALITY_OPTIONS: Array<{ value: ImageQualityMode; label: string; targetBytes: number; maxSide: number; baselineBytes: number }> = [
  { value: "balanced", label: "均衡（约200KB）", targetBytes: 200 * 1024, maxSide: 1800, baselineBytes: 220 * 1024 },
  { value: "text", label: "清晰文字（约260KB）", targetBytes: 260 * 1024, maxSide: 2200, baselineBytes: 280 * 1024 },
];

/** R2 直传：拖拽/点击上传，图片缩略图预览 */
export function R2AttachmentUploader({
  value,
  keys,
  onUploaded,
  accept = "image/*,.pdf,.doc,.docx",
  disabled,
  description = "支持拖拽上传；图片将显示预览",
}: Props) {
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
  const [concurrencyMode, setConcurrencyMode] = useState<UploadConcurrencyMode>("weak");
  const [qualityMode, setQualityMode] = useState<ImageQualityMode>("balanced");
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const effectiveKeys = (keys && keys.length > 0 ? keys : uploadedKeys).filter(Boolean);
  const uploadedCount = Math.max(effectiveKeys.length, value ? 1 : 0);
  const uploaded = uploadedCount > 0;
  const qualityPreset = QUALITY_OPTIONS.find((x) => x.value === qualityMode) ?? QUALITY_OPTIONS[0];
  const concurrencyPreset = CONCURRENCY_OPTIONS.find((x) => x.value === concurrencyMode) ?? CONCURRENCY_OPTIONS[0];

  const compressToWebp = async (
    file: File,
    targetBytes: number,
    maxSide: number,
  ): Promise<{ blob: Blob; width: number; height: number } | null> => {
    if (!file.type.startsWith("image/")) return null;
    try {
      const bitmap = await createImageBitmap(file);
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
      if (!best) return null;
      return { blob: best, width: w, height: h };
    } catch {
      return null;
    }
  };

  const compressWithFallback = async (file: File) => {
    if (!file.type.startsWith("image/")) return null;
    const candidates = [
      { targetBytes: qualityPreset.targetBytes, maxSide: qualityPreset.maxSide },
      { targetBytes: Math.round(qualityPreset.targetBytes * 1.12), maxSide: Math.round(qualityPreset.maxSide * 0.86) },
      { targetBytes: Math.round(qualityPreset.targetBytes * 1.2), maxSide: Math.round(qualityPreset.maxSide * 0.72) },
    ];
    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const out = await compressToWebp(file, c.targetBytes, c.maxSide);
      if (out) return out;
    }
    return null;
  };

  useEffect(() => {
    return () => {
      for (const item of localPreviews) URL.revokeObjectURL(item.src);
    };
  }, [localPreviews]);

  const updateItem = (id: string, patch: Partial<LocalPreviewItem>) => {
    setLocalPreviews((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadOne = async (item: LocalPreviewItem): Promise<boolean> => {
    setUploadingName(item.name);
    setStatusText("上传中...");
    updateItem(item.id, { status: "uploading", error: "" });
    setProgressMap((prev) => ({ ...prev, [item.id]: 0 }));

    let uploadTarget: File = item.file;
    let compressedBytes: number | undefined;
    if (item.file.type.startsWith("image/")) {
      const compressed = await compressWithFallback(item.file);
      if (!compressed) {
        updateItem(item.id, { status: "failed", error: "压缩失败" });
        setStatusText("上传失败：图片压缩失败");
        setProgressMap((prev) => ({ ...prev, [item.id]: 100 }));
        return false;
      }
      compressedBytes = compressed.blob.size;
      const base = item.file.name.replace(/\.[^/.]+$/, "") || "image";
      uploadTarget = new File([compressed.blob], `${base}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }

    const res = await uploadFileWithProgress(uploadTarget, undefined, (pct) => {
      setProgressMap((prev) => ({ ...prev, [item.id]: pct }));
    });
    setProgressMap((prev) => ({ ...prev, [item.id]: 100 }));
    if (!res.ok) {
      updateItem(item.id, { status: "failed", error: res.error.message || "未知错误", compressedBytes });
      setStatusText(`上传失败：${res.error.message || "未知错误"}`);
      return false;
    }
    onUploaded?.(res.data.key);
    setUploadedKeys((prev) => {
      const next = [res.data.key, ...prev.filter((k) => k !== res.data.key)];
      return next.slice(0, 20);
    });
    updateItem(item.id, { status: "success", error: "", compressedBytes });
    setStatusText("上传成功");
    return true;
  };

  const runBatchUpload = async (items: LocalPreviewItem[]) => {
    let successCount = 0;
    let failedCount = 0;
    let pointer = 0;
    const workers = Array.from({ length: Math.max(1, concurrencyPreset.concurrency) }, async () => {
      while (pointer < items.length) {
        const idx = pointer;
        pointer += 1;
        const current = items[idx];
        // eslint-disable-next-line no-await-in-loop
        const ok = await uploadOne(current);
        setBatchDone((d) => d + 1);
        if (ok) {
          successCount += 1;
          setBatchSuccess(successCount);
        } else {
          failedCount += 1;
          setBatchFailed(failedCount);
        }
      }
    });
    await Promise.all(workers);
    return { successCount, failedCount };
  };

  const uploadFiles = async (files: File[]) => {
    const clean = files.filter(Boolean);
    if (clean.length === 0) return;
    if (uploading) return;

    const batchItems = clean.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      src: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      name: file.name,
      status: "pending" as const,
      attempts: 1,
      originalBytes: file.size,
    }));
    setUploading(true);
    setBatchTotal(clean.length);
    setBatchDone(0);
    setBatchSuccess(0);
    setBatchFailed(0);
    setBatchSummaryText("");
    setStatusText("准备上传...");
    setProgressMap({});
    setLocalPreviews((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.src);
      return batchItems.filter((x) => x.file.type.startsWith("image/"));
    });
    let successCount = 0;
    let failedCount = 0;
    try {
      const result = await runBatchUpload(batchItems);
      successCount = result.successCount;
      failedCount = result.failedCount;
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

  const overallPercent = useMemo(() => {
    if (batchTotal <= 0) return uploadPercent;
    const donePart = batchDone;
    const activePart = Object.values(progressMap).reduce((sum, p) => sum + Math.max(0, Math.min(100, p)) / 100, 0);
    return Math.round(((donePart + activePart) / Math.max(1, batchTotal)) * 100);
  }, [batchDone, batchTotal, progressMap, uploadPercent]);

  const qualityBaseline = useMemo(() => {
    const images = localPreviews.filter((x) => x.originalBytes);
    if (images.length === 0) return null;
    const judged = images.filter((x) => typeof x.compressedBytes === "number" || x.status === "failed");
    const passed = judged.filter((x) => typeof x.compressedBytes === "number" && x.compressedBytes <= qualityPreset.baselineBytes).length;
    return { judged: judged.length, total: images.length, passed };
  }, [localPreviews, qualityPreset.baselineBytes]);

  const retryFailed = async (id: string) => {
    if (uploading) return;
    const target = localPreviews.find((x) => x.id === id && x.status === "failed");
    if (!target) return;
    setUploading(true);
    setBatchTotal(1);
    setBatchDone(0);
    setBatchSuccess(0);
    setBatchFailed(0);
    setBatchSummaryText("");
    setStatusText("重试中...");
    setProgressMap({});
    updateItem(id, { status: "pending", attempts: target.attempts + 1, error: "" });
    try {
      const ok = await uploadOne({ ...target, status: "pending", attempts: target.attempts + 1 });
      setBatchDone(1);
      if (ok) {
        setBatchSuccess(1);
        setBatchSummaryText("重试成功");
      } else {
        setBatchFailed(1);
        setBatchSummaryText("重试失败");
      }
    } finally {
      setUploading(false);
      setUploadingName("");
      setStatusText("");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? "收起高级上传设置" : "展开高级上传设置"}
        </button>
      </div>
      {advancedOpen ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[11px]">
          <label className="inline-flex items-center gap-1 text-slate-600">
            并发：
            <select
              className="rounded-[6px] border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
              value={concurrencyMode}
              disabled={uploading}
              onChange={(e) => setConcurrencyMode(e.target.value as UploadConcurrencyMode)}
            >
              {CONCURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1 text-slate-600">
            画质：
            <select
              className="rounded-[6px] border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
              value={qualityMode}
              disabled={uploading}
              onChange={(e) => setQualityMode(e.target.value as ImageQualityMode)}
            >
              {QUALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <label
        className={[
          "block cursor-pointer rounded-[6px] border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2 text-center",
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
        <div className="flex flex-col items-center gap-1">
          <Inbox className="h-6 w-6 text-slate-500" />
          <div className="text-xs font-medium text-slate-700">{description}</div>
          <div className="text-[11px] text-slate-500">图片自动压缩为 WebP（目标约 {Math.round(qualityPreset.targetBytes / 1024)}KB）</div>
        </div>
      </label>
      {uploading || batchSummaryText ? (
        <div className="rounded-[6px] border border-slate-200 bg-white px-2.5 py-1.5">
          {uploading ? (
            <>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
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
              <div className="mt-0.5 text-[11px] text-slate-500">
                {statusText}
                {batchTotal > 0 ? `（成功 ${batchSuccess}，失败 ${batchFailed}）` : ""}
              </div>
              <div className="mt-1.5">
                <Progress percent={overallPercent} />
              </div>
            </>
          ) : (
            <div className="text-[11px] text-slate-600">{batchSummaryText}</div>
          )}
        </div>
      ) : null}
      {localPreviews.length > 0 ? (
        <div className="overflow-hidden rounded-main border border-[#e5e7eb] bg-[#f8fafc] p-2.5">
          {advancedOpen && qualityBaseline ? (
            <div className="mb-1 text-[10px] text-slate-600">
              质量基线验收：已评估 {qualityBaseline.judged}/{qualityBaseline.total}，通过 {qualityBaseline.passed}（阈值 {Math.round(qualityPreset.baselineBytes / 1024)}KB）
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {localPreviews.map((item, idx) => (
              <div key={item.id} className="overflow-hidden rounded-[6px] border border-slate-200 bg-white">
                <div className="relative">
                  <img src={item.src} alt={`上传预览-${idx + 1}`} className="h-24 w-full object-cover" />
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
                <div className="truncate px-1 py-0.5 text-[10px] text-slate-500" title={item.name}>
                  {item.name}
                </div>
                <div className="flex items-center justify-between px-1 pb-0.5 text-[10px] text-slate-400">
                  <span>
                    {typeof item.compressedBytes === "number"
                      ? `${Math.round(item.compressedBytes / 1024)}KB`
                      : item.status === "failed"
                        ? "压缩/上传失败"
                        : typeof item.originalBytes === "number"
                          ? `原始 ${Math.round(item.originalBytes / 1024)}KB`
                          : "-"}
                  </span>
                  {item.status === "failed" ? (
                    <button
                      type="button"
                      className="rounded border border-slate-200 bg-white px-1 py-0 text-[10px] text-slate-600 hover:bg-slate-50"
                      onClick={() => void retryFailed(item.id)}
                    >
                      重试
                    </button>
                  ) : null}
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
