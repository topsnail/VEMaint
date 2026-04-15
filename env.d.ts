/// <reference types="@cloudflare/workers-types" />

export type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AUTH_SECRET?: string;
};

export {};
