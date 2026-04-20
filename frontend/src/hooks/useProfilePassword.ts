import { useCallback, useState } from "react";
import { apiFetch } from "../lib/http";

export function useProfilePassword() {
  const [submitting, setSubmitting] = useState(false);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    setSubmitting(true);
    try {
      return await apiFetch<{ ok: true }>("/profile/password", {
        method: "PUT",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, changePassword };
}
