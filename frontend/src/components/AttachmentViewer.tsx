import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Space } from "@/components/ui/legacy";
import { apiFetchBlob, deleteProtectedFile } from "@/lib/http";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type GalleryThumbProps = {
  open: boolean;
  path: string;
  onDeleted?: (path: string) => void;
  onPreview?: () => void;
};

function GalleryThumb({ open, path, onDeleted, onPreview }: GalleryThumbProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !path) return;
    let alive = true;
    setLoading(true);
    setError("");
    setContentType(null);
    setFilename(null);
    (async () => {
      let res;
      if (isLikelyImagePath(path)) {
        if (isDirectWebpPath(path)) {
          res = await apiFetchBlob(path);
        } else {
          const previewPath = `${path}.preview.webp`;
          res = await apiFetchBlob(previewPath);
          if (!res.ok) {
            setError("预览不可用，请下载原图");
            return;
          }
        }
      } else {
        res = await apiFetchBlob(path);
      }
      if (!alive) return;
      if (!res.ok) {
        setError(res.error.message || "加载失败");
        return;
      }
      const url = URL.createObjectURL(res.data.blob);
      setBlobUrl(url);
      setFilename(res.data.filename);
      setContentType(res.data.contentType);
    })()
      .catch(() => {
        if (!alive) return;
        setError("加载失败");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, path]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const download = async () => {
    const res = await apiFetchBlob(path);
    if (!res.ok) {
      setError(res.error.message || "下载失败");
      return;
    }
    const url = URL.createObjectURL(res.data.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = res.data.filename || guessNameFromPath(path);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await deleteProtectedFile(path);
      if (!res.ok) {
        setError(res.error.message || "删除失败");
        return;
      }
      onDeleted?.(path);
    } finally {
      setDeleting(false);
    }
  };

  const ct = (contentType || "").toLowerCase();
  const isImage = ct.startsWith("image/");

  return (
    <div className="group overflow-hidden rounded-[6px] border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-2.5 py-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium text-slate-700">{filename || guessNameFromPath(path)}</div>
          <div className="truncate font-mono text-[10px] text-slate-400">{contentType || (loading ? "loading..." : "")}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="small"
            className="h-7 rounded-[6px] border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
            onClick={download}
          >
            下载
          </Button>
          <Button
            size="small"
            className="h-7 rounded-[6px] border border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? "删除中..." : "删除"}
          </Button>
        </div>
      </div>

      <div className="aspect-[4/3] bg-slate-50">
        {loading ? <div className="flex h-full items-center justify-center text-xs text-slate-500">加载中...</div> : null}
        {error ? <div className="flex h-full items-center justify-center px-2 text-center text-xs text-red-600">{error}</div> : null}
        {!loading && !error && blobUrl && isImage ? (
          <button
            type="button"
            className="h-full w-full"
            onClick={onPreview}
            title="点击放大预览"
          >
            <img src={blobUrl} alt={filename || "attachment"} className="h-full w-full object-contain" />
          </button>
        ) : null}
        {!loading && !error && blobUrl && !isImage ? (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-600">
            非图片附件（点击“放大”预览）
          </div>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  /** Single-path mode (backward compatible) */
  path: string | null;
  /** Multi-path mode: show a list and preview selected item */
  paths?: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
  onPathsChange?: (paths: string[]) => void;
  className?: string;
};

function guessNameFromPath(path: string) {
  const idx = path.lastIndexOf("/");
  const raw = idx >= 0 ? path.slice(idx + 1) : path;
  if (!raw) return "attachment";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isLikelyImagePath(path: string) {
  const lower = path.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".avif", ".heic", ".heif"].some((ext) => lower.endsWith(ext));
}

function isDirectWebpPath(path: string) {
  const lower = path.toLowerCase();
  return lower.endsWith(".webp") && !lower.endsWith(".preview.webp");
}

export function AttachmentViewer({
  open,
  path,
  paths,
  initialIndex = 0,
  title = "附件预览",
  onClose,
  onPathsChange,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null); // used for display
  const [originalBlobUrl, setOriginalBlobUrl] = useState<string | null>(null); // used for download (original)
  const [contentType, setContentType] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string>("");
  const [reloadSeq, setReloadSeq] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const list = useMemo(() => {
    if (Array.isArray(paths) && paths.length > 0) return paths.filter(Boolean);
    return path ? [path] : [];
  }, [paths, path]);
  const [visiblePaths, setVisiblePaths] = useState<string[]>([]);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState("");
  const [zoomBlobUrl, setZoomBlobUrl] = useState<string | null>(null);
  const [zoomFilename, setZoomFilename] = useState<string>("");

  useEffect(() => {
    setVisiblePaths(list);
  }, [list]);

  const multi = visiblePaths.length > 1;
  const currentPath = visiblePaths[activeIndex] || "";
  const fallbackName = useMemo(() => (currentPath ? guessNameFromPath(currentPath) : "attachment"), [currentPath]);
  const imagePaths = useMemo(() => visiblePaths.filter((p) => isLikelyImagePath(p)), [visiblePaths]);
  const zoomPath = imagePaths[zoomIndex] || "";

  // Initialize active index when opening / paths change
  useEffect(() => {
    if (!open) return;
    if (visiblePaths.length === 0) return;
    const init = Math.max(0, Math.min(visiblePaths.length - 1, initialIndex));
    setActiveIndex(init);
  }, [open, visiblePaths.length, initialIndex]);

  useEffect(() => {
    if (activeIndex <= Math.max(0, visiblePaths.length - 1)) return;
    setActiveIndex(Math.max(0, visiblePaths.length - 1));
  }, [activeIndex, visiblePaths.length]);

  useEffect(() => {
    if (!zoomOpen) return;
    if (zoomIndex <= Math.max(0, imagePaths.length - 1)) return;
    setZoomIndex(Math.max(0, imagePaths.length - 1));
  }, [zoomOpen, zoomIndex, imagePaths.length]);

  useEffect(() => {
    if (!open || !currentPath || multi) return;
    let alive = true;
    setLoading(true);
    setError("");
    setTextPreview("");
    setOriginalBlobUrl(null);
    (async () => {
      // For images, prefer a WebP preview stored in R2: `${key}.preview.webp`.
      let res;
      if (isLikelyImagePath(currentPath)) {
        if (isDirectWebpPath(currentPath)) {
          res = await apiFetchBlob(currentPath);
        } else {
          const previewPath = `${currentPath}.preview.webp`;
          res = await apiFetchBlob(previewPath);
          if (!res.ok) {
            setError("预览不可用，请下载原图");
            return;
          }
        }
      } else {
        res = await apiFetchBlob(currentPath);
      }
      if (!alive) return;
      if (!res.ok) {
        setError(res.error.message || "加载失败");
        return;
      }
      const url = URL.createObjectURL(res.data.blob);
      setBlobUrl(url);
      setFilename(res.data.filename);
      setContentType(res.data.contentType);
      const ct = (res.data.contentType || "").toLowerCase();
      if (ct.startsWith("text/") || ct.includes("json") || ct.includes("xml") || ct.includes("csv")) {
        try {
          const t = await res.data.blob.text();
          if (!alive) return;
          setTextPreview(t.slice(0, 200_000));
        } catch {
          // ignore
        }
      }

      // Display path always uses preview for images; original is fetched lazily on download only.
      if (!isLikelyImagePath(currentPath)) setOriginalBlobUrl(url);
    })()
      .catch(() => {
        if (!alive) return;
        setError("加载失败");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, currentPath, reloadSeq, multi]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    return () => {
      if (originalBlobUrl && originalBlobUrl !== blobUrl) URL.revokeObjectURL(originalBlobUrl);
    };
  }, [originalBlobUrl, blobUrl]);

  useEffect(() => {
    if (!zoomOpen || !zoomPath) return;
    let alive = true;
    setZoomLoading(true);
    setZoomError("");
    (async () => {
      const res = isDirectWebpPath(zoomPath)
        ? await apiFetchBlob(zoomPath)
        : await apiFetchBlob(`${zoomPath}.preview.webp`);
      if (!alive) return;
      if (!res.ok) {
        setZoomError("预览不可用，请下载原图");
        return;
      }
      const url = URL.createObjectURL(res.data.blob);
      setZoomBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setZoomFilename(res.data.filename || guessNameFromPath(zoomPath));
    })()
      .catch(() => {
        if (!alive) return;
        setZoomError("加载失败");
      })
      .finally(() => {
        if (!alive) return;
        setZoomLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [zoomOpen, zoomPath]);

  useEffect(() => {
    return () => {
      if (zoomBlobUrl) URL.revokeObjectURL(zoomBlobUrl);
    };
  }, [zoomBlobUrl]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setZoomIndex((prev) => (prev <= 0 ? Math.max(0, imagePaths.length - 1) : prev - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setZoomIndex((prev) => (prev >= imagePaths.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomOpen, imagePaths.length]);

  const openZoomByPath = (pathToOpen: string) => {
    const idx = imagePaths.findIndex((p) => p === pathToOpen);
    if (idx < 0) return;
    setZoomIndex(idx);
    setZoomOpen(true);
  };
  const gotoPrevZoom = () => {
    setZoomIndex((prev) => (prev <= 0 ? Math.max(0, imagePaths.length - 1) : prev - 1));
  };
  const gotoNextZoom = () => {
    setZoomIndex((prev) => (prev >= imagePaths.length - 1 ? 0 : prev + 1));
  };

  const download = async () => {
    if (!currentPath) return;
    // Ensure download uses original file, not the WebP preview.
    let url = originalBlobUrl;
    let name = filename || fallbackName;
    if (!url) {
      const res = await apiFetchBlob(currentPath);
      if (!res.ok) {
        setError(res.error.message || "下载失败");
        return;
      }
      url = URL.createObjectURL(res.data.blob);
      setOriginalBlobUrl(url);
      name = res.data.filename || name;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const ct = (contentType || "").toLowerCase();
  const isImage = ct.startsWith("image/");
  const isPdf = ct.includes("pdf");
  const isText = !!textPreview && !isImage && !isPdf;
  const removeSingle = async () => {
    if (!currentPath || singleDeleting) return;
    setSingleDeleting(true);
    try {
      const res = await deleteProtectedFile(currentPath);
      if (!res.ok) {
        setError(res.error.message || "删除失败");
        return;
      }
      onPathsChange?.([]);
      onClose();
    } finally {
      setSingleDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      centered
      title={title}
      onCancel={onClose}
      width={980}
      className={cn("ve-attachment-viewer", className)}
      footer={
        multi ? (
          <Button className="rounded-[6px]" onClick={onClose}>
            关闭
          </Button>
        ) : (
          <Space size={8}>
            <Button className="rounded-[6px]" onClick={onClose}>
              关闭
            </Button>
            <Button
              className="rounded-[6px] border border-red-200 bg-white text-red-700 hover:bg-red-50"
              disabled={!currentPath || singleDeleting}
              onClick={removeSingle}
            >
              {singleDeleting ? "删除中..." : "删除"}
            </Button>
            <Button type="primary" className="rounded-[6px]" disabled={!blobUrl} onClick={download}>
              下载
            </Button>
          </Space>
        )
      }
    >
      <div className={cn(multi ? "space-y-3" : "space-y-3")}>
        {multi ? (
          <div className="rounded-[6px] border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <div className="text-xs font-medium tracking-wide text-slate-600">已上传附件（{visiblePaths.length}）</div>
              <div className="text-xs text-slate-400">图片将优先加载 WebP 预览</div>
            </div>
            <div className="max-h-[70vh] overflow-auto p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePaths.map((p, idx) => (
                  <GalleryThumb
                    key={`${p}-${idx}`}
                    open={open}
                    path={p}
                    onPreview={() => openZoomByPath(p)}
                    onDeleted={(deletedPath) =>
                      setVisiblePaths((prev) => {
                        const next = prev.filter((x) => x !== deletedPath);
                        onPathsChange?.(next);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!multi ? (
          <div className="space-y-3">
          {loading ? <div className="text-sm text-slate-600">加载中...</div> : null}
          {error ? (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{error}</span>
                <Button
                  size="small"
                  className="rounded-[6px] border border-red-200 bg-white px-2.5 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => setReloadSeq((s) => s + 1)}
                >
                  重试
                </Button>
              </div>
            </div>
          ) : null}

          {!loading && !error && blobUrl ? (
            <div className="rounded-[6px] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-500">
                {filename ? <span className="font-medium text-slate-700">{filename}</span> : null}
                {filename ? <span className="mx-2 text-slate-300">|</span> : null}
                <span className="font-mono">{contentType || "unknown"}</span>
                {isImage && String(contentType || "").toLowerCase().includes("webp") ? <span className="ml-2 text-slate-400">预览 WebP</span> : null}
              </div>

              <div className="max-h-[70vh] overflow-auto p-3">
                {isImage ? (
                  <img
                    src={blobUrl}
                    alt={filename || "attachment"}
                    className="max-h-[66vh] w-auto max-w-full rounded-[6px] border border-slate-100 object-contain"
                  />
                ) : null}
                {isPdf ? (
                  <iframe
                    title={filename || "pdf"}
                    src={blobUrl}
                    className="h-[66vh] w-full rounded-[6px] border border-slate-100 bg-white"
                  />
                ) : null}
                {isText ? (
                  <pre className="whitespace-pre-wrap break-words rounded-[6px] border border-slate-100 bg-slate-50 p-3 text-xs text-slate-800">
                    {textPreview}
                  </pre>
                ) : null}
                {!isImage && !isPdf && !isText ? (
                  <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    当前文件类型不支持直接预览，请点击“下载”查看。
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          </div>
        ) : null}
      </div>
      <Modal
        open={zoomOpen}
        centered
        title={zoomFilename || "图片预览"}
        width={980}
        onCancel={() => setZoomOpen(false)}
        footer={null}
      >
        <div className="space-y-2">
          <div className="max-h-[80vh] overflow-auto rounded-[6px] border border-slate-200 bg-slate-50 p-2">
            {zoomLoading ? <div className="py-8 text-center text-sm text-slate-500">加载中...</div> : null}
            {!zoomLoading && zoomError ? <div className="py-8 text-center text-sm text-red-600">{zoomError}</div> : null}
            {!zoomLoading && !zoomError && zoomBlobUrl ? (
              <div className="relative flex items-center justify-center">
                {imagePaths.length > 1 ? (
                  <button
                    type="button"
                    className="absolute left-1.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-white"
                    onClick={gotoPrevZoom}
                    title="上一张"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <img src={zoomBlobUrl} alt={zoomFilename || "attachment"} className="max-h-[76vh] w-auto max-w-full object-contain" />
                {imagePaths.length > 1 ? (
                  <button
                    type="button"
                    className="absolute right-1.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-white"
                    onClick={gotoNextZoom}
                    title="下一张"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

