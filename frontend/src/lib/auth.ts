const KEY = "ve_token";

export function getToken(): string | null {
  const v = localStorage.getItem(KEY);
  return v && v.trim() ? v : null;
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

