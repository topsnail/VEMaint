export const APP_DATA_CHANGED_EVENT = "app:data-changed";

export type AppDataDomain = "dashboard" | "maintenance" | "vehicles" | "settings" | "users";

export type AppDataChangedDetail = {
  domains: AppDataDomain[];
  reason?: string;
  at: number;
};

export function emitAppDataChanged(domains: AppDataDomain[], reason?: string) {
  if (typeof window === "undefined") return;
  const uniq = Array.from(new Set(domains));
  window.dispatchEvent(
    new CustomEvent<AppDataChangedDetail>(APP_DATA_CHANGED_EVENT, {
      detail: {
        domains: uniq,
        reason,
        at: Date.now(),
      },
    }),
  );
}

