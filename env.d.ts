/// <reference types="@cloudflare/workers-types" />

export type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_APP_NAME?: string;
    }
  }
}
