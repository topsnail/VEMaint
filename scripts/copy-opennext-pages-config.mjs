import { copyFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const srcHeaders = resolve(projectRoot, "public", "_headers");
const openNextRoot = resolve(projectRoot, ".open-next");
const assetsRoot = resolve(openNextRoot, "assets");
const srcWorker = resolve(openNextRoot, "worker.js");
const dstWorker = resolve(assetsRoot, "_worker.js");
const dstHeaders = resolve(assetsRoot, "_headers");
const runtimeDirs = [
  ".build",
  "cloudflare",
  "middleware",
  "server-functions",
];

async function main() {
  if (!existsSync(openNextRoot)) {
    throw new Error("未找到 .open-next 目录，请先执行 opennextjs-cloudflare build");
  }
  if (!existsSync(assetsRoot)) {
    throw new Error("未找到 .open-next/assets 目录，OpenNext 构建产物不完整");
  }
  if (!existsSync(srcWorker)) {
    throw new Error("未找到 .open-next/worker.js，无法生成 Pages 所需 _worker.js");
  }

  for (const dir of runtimeDirs) {
    const srcDir = resolve(openNextRoot, dir);
    const dstDir = resolve(assetsRoot, dir);
    if (!existsSync(srcDir)) {
      throw new Error(`未找到运行时目录: ${srcDir}`);
    }
    await cp(srcDir, dstDir, { recursive: true, force: true });
    console.log(`已同步目录 -> ${dstDir}`);
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

