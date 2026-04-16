import { getToken, clearToken } from "./auth";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiOk<T> | ApiErr;
export type BlobResult = {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
};

function requestPath(path: string) {
  return `/api${path.startsWith("/") ? path : `/${path}`}`;
}

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  return value !== null && typeof value === "object" && "ok" in value;
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(requestPath(path), { ...init, headers });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "网络异常，请检查服务是否可用" } };
  }
  // mock 登录模式下不依赖后端鉴权，避免 401 把本地 mock token 清掉导致回登录页
  if (res.status === 401 && token && !token.startsWith("mock_token_")) clearToken();
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json
        ? String((json as any).error?.message ?? "请求失败")
        : "请求失败";
    return { ok: false, error: { code: `HTTP_${res.status}`, message: msg } };
  }
  return isApiResult<T>(json) ? json : { ok: false, error: { code: "BAD_RESPONSE", message: "响应格式错误" } };
}

export async function uploadFile(file: File): Promise<ApiResult<{ key: string; url: string }>> {
  const token = getToken();
  if (!token) return { ok: false, error: { code: "UNAUTHORIZED", message: "未登录" } };
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(requestPath("/upload"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "上传失败，请检查网络连接" } };
  }
  const json = (await res.json().catch(() => null)) as ApiResult<{ key: string; url: string }> | null;
  if (res.status === 401 && token && !token.startsWith("mock_token_")) clearToken();
  if (!res.ok || !json) return { ok: false, error: { code: "UPLOAD_FAILED", message: "上传失败" } };
  return json;
}

export async function apiFetchBlob(path: string, init?: RequestInit): Promise<ApiResult<BlobResult>> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(requestPath(path), { ...init, headers });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "网络异常，请检查服务是否可用" } };
  }

  if (res.status === 401 && token && !token.startsWith("mock_token_")) clearToken();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: { code: `HTTP_${res.status}`, message: text || "请求失败" } };
  }

  const blob = await res.blob();
  return {
    ok: true,
    data: {
      blob,
      filename: parseFilename(res.headers.get("Content-Disposition")),
      contentType: res.headers.get("Content-Type"),
    },
  };
}

export async function openProtectedFile(path: string) {
  const res = await apiFetchBlob(path);
  if (!res.ok) return res;
  const url = URL.createObjectURL(res.data.blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return res;
}

export async function downloadProtectedFile(path: string, fallbackFilename: string) {
  const res = await apiFetchBlob(path);
  if (!res.ok) return res;
  const url = URL.createObjectURL(res.data.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = res.data.filename || fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return res;
}

