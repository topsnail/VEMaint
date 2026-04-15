import { copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const srcHeaders = resolve(projectRoot, "public", "_headers");
const openNextRoot = resolve(projectRoot, ".open-next");
const srcWorker = resolve(openNextRoot, "worker.js");
const dstWorker = resolve(openNextRoot, "_worker.js");
const dstHeaders = resolve(openNextRoot, "_headers");

async function main() {
  if (!existsSync(openNextRoot)) {
    throw new Error("未找到 .open-next 目录，请先执行 opennextjs-cloudflare build");
  }
  if (!existsSync(srcWorker)) {
    throw new Error("未找到 .open-next/worker.js，无法生成 Pages 所需 _worker.js");
  }

  await copyFile(srcWorker, dstWorker);
  await copyFile(srcHeaders, dstHeaders);
  console.log(`已复制 _worker.js -> ${dstWorker}`);
  console.log(`已复制 _headers -> ${dstHeaders}`);
}

main().catch((e) => {
  console.error("复制 OpenNext Pages 配置失败：", e);
  process.exit(1);
});

