import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const srcHeaders = resolve(projectRoot, "public", "_headers");
const srcOutDir = resolve(projectRoot, ".vercel", "output", "static");
const dstOutDir = resolve(projectRoot, "dist");
const dstHeaders = resolve(dstOutDir, "_headers");

async function main() {
  // dist 作为 Pages 输出目录：每次构建后用 .vercel/output/static 覆盖 dist
  await rm(dstOutDir, { recursive: true, force: true });
  await mkdir(dstOutDir, { recursive: true });

  // 复制 next-on-pages 产物
  if (existsSync(srcOutDir)) {
    await cp(srcOutDir, dstOutDir, { recursive: true, force: true });
    console.log(`已复制构建产物 -> ${dstOutDir}`);
  } else {
    console.log(`未找到 ${srcOutDir}（通常仅在未运行 next-on-pages 时出现），跳过产物复制`);
  }

  // 复制 _headers 到 dist 根目录
  await copyFile(srcHeaders, dstHeaders);
  console.log(`已复制 _headers -> ${dstHeaders}`);
}

main().catch((e) => {
  console.error("复制 Pages 配置失败：", e);
  process.exit(1);
});

