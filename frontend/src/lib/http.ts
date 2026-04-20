import { getToken, getCsrfToken, clearToken } from "./auth";
import { API_CONFIG } from "./config";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiOk<T> | ApiErr;
export type BlobResult = {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
};

// API 基础配置
const API_BASE_URL = API_CONFIG.BASE_URL;

function requestPath(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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

// 通用请求处理函数
async function handleRequest<T>(path: string, init?: RequestInit): Promise<ApiResult<T>>;
async function handleRequest(path: string, init: RequestInit | undefined, isBlob: true): Promise<ApiResult<BlobResult>>;
async function handleRequest<T>(
  path: string,
  init?: RequestInit,
  isBlob = false,
): Promise<ApiResult<T> | ApiResult<BlobResult>> {
  const token = getToken();
  const csrfToken = getCsrfToken();
  const headers = new Headers(init?.headers);
  
  // 设置默认头部
  if (!isBlob) {
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }
  
  // 添加认证信息
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  let res: Response;
  try {
    res = await fetch(requestPath(path), { ...init, headers });
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "网络异常，请检查服务是否可用" } };
  }
  
  // 处理 401 错误
  if (res.status === 401 && token && !token.startsWith("mock_token_")) {
    clearToken();
  }
  
  // 处理非成功响应
  if (!res.ok) {
    let errorMessage = "请求失败";
    try {
      const json = await res.json();
      if (json && typeof json === "object" && "error" in json) {
        errorMessage = String((json as any).error?.message ?? errorMessage);
      }
    } catch {
      try {
        const text = await res.text();
        if (text) {
          errorMessage = text;
        }
      } catch {
        // ignore
      }
    }
    return { ok: false, error: { code: `HTTP_${res.status}`, message: errorMessage } };
  }
  
  // 处理成功响应
  if (isBlob) {
    const blob = await res.blob();
    return {
      ok: true,
      data: {
        blob,
        filename: parseFilename(res.headers.get("Content-Disposition")),
        contentType: res.headers.get("Content-Type"),
      },
    };
  } else {
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: { code: "BAD_RESPONSE", message: "响应格式错误" } };
    }
    return isApiResult<T>(json) ? json : { ok: false, error: { code: "BAD_RESPONSE", message: "响应格式错误" } };
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  return handleRequest<T>(path, init);
}

export async function uploadFile(file: File): Promise<ApiResult<{ key: string; url: string }>> {
  const token = getToken();
  if (!token) return { ok: false, error: { code: "UNAUTHORIZED", message: "未登录" } };
  
  const form = new FormData();
  form.append("file", file);
  
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    form.append("csrfToken", csrfToken);
  }
  
  return handleRequest<{ key: string; url: string }>("/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export async function apiFetchBlob(path: string, init?: RequestInit): Promise<ApiResult<BlobResult>> {
  return handleRequest(path, init, true);
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

