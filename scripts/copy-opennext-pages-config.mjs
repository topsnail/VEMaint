import { copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const srcHeaders = resolve(projectRoot, "public", "_headers");
const dstHeaders = resolve(projectRoot, ".open-next", "_headers");

async function main() {
  if (!existsSync(resolve(projectRoot, ".open-next"))) {
    throw new Error("未找到 .open-next 目录，请先执行 opennextjs-cloudflare build");
  }
  await copyFile(srcHeaders, dstHeaders);
  console.log(`已复制 _headers -> ${dstHeaders}`);
}

main().catch((e) => {
  console.error("复制 OpenNext Pages 配置失败：", e);
  process.exit(1);
});

