/// <reference types="@cloudflare/workers-types" />

export type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AUTH_SECRET?: string;
  TOKEN_BLACKLIST_PREFIX?: string;
  BOOTSTRAP_ADMIN_USER?: string;
  BOOTSTRAP_ADMIN_PASS?: string;
};

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

export {};
