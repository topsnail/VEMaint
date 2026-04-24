import { useCallback, useState } from "react";
import { apiFetch } from "../lib/http";

export function useProfilePassword() {
  const [submitting, setSubmitting] = useState(false);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string, reason?: string | null) => {
    setSubmitting(true);
    try {
      return await apiFetch<{ ok: true }>("/profile/password", {
        method: "PUT",
        body: JSON.stringify({ oldPassword, newPassword }),
        opReason: reason,
      });
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, changePassword };
}
