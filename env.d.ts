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
      /** KV 无用户时，与 BOOTSTRAP_ADMIN_USERNAME 一起用于首次创建超级管理员（仅首次有效） */
      BOOTSTRAP_ADMIN_PASSWORD?: string;
      /** 可选，默认 admin */
      BOOTSTRAP_ADMIN_USERNAME?: string;
      AUTH_SECRET?: string;
    }
  }
}
