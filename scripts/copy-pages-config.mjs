import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const srcHeaders = resolve(projectRoot, "public", "_headers");
const dstHeaders = resolve(projectRoot, ".vercel", "output", "static", "_headers");

async function main() {
  await mkdir(dirname(dstHeaders), { recursive: true });
  await copyFile(srcHeaders, dstHeaders);
  console.log(`已复制 _headers -> ${dstHeaders}`);
}

main().catch((e) => {
  console.error("复制 Pages 配置失败：", e);
  process.exit(1);
});

