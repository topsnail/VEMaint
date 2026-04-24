import { useCallback, useState } from "react";
import { apiFetch } from "../lib/http";
import type { UserRow } from "../types";

type Role = "admin" | "maintainer" | "reader";

export function useUsersAdmin() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ users: UserRow[] }>("/users");
      if (res.ok) setRows(res.data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (body: { username: string; password: string; role: Role }) => {
    return apiFetch<{ ok: true }>("/users", { method: "POST", body: JSON.stringify(body) });
  }, []);

  const changeRole = useCallback(async (id: string, role: Role, reason?: string | null) => {
    return apiFetch<{ ok: true }>(`/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }), opReason: reason });
  }, []);

  const removeUser = useCallback(async (id: string, reason?: string | null) => {
    return apiFetch<{ ok: true }>(`/users/${id}`, { method: "DELETE", opReason: reason });
  }, []);

  const setDisabled = useCallback(async (id: string, disabled: boolean, reason?: string | null) => {
    return apiFetch<{ ok: true }>(`/users/${id}/disabled`, { method: "PUT", body: JSON.stringify({ disabled }), opReason: reason });
  }, []);

  const resetPassword = useCallback(async (id: string, password: string, reason?: string | null) => {
    return apiFetch<{ ok: true }>(`/users/${id}/password`, { method: "PUT", body: JSON.stringify({ password }), opReason: reason });
  }, []);

  return { rows, loading, load, createUser, changeRole, removeUser, setDisabled, resetPassword };
}
