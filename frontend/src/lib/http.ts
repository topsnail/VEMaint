import { getToken, clearToken } from "./auth";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers });
  if (res.status === 401) clearToken();
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
  return (json as ApiResult<T>) ?? { ok: false, error: { code: "BAD_RESPONSE", message: "响应格式错误" } };
}

