import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src/app", "src/components"];
const ALLOWLIST = new Set([
  "src/components/page-container.tsx",
  "src/components/login-form.tsx",
]);

const CONTAINER_WIDTH_PATTERN = /className\s*=\s*["'`][^"'`\n]*mx-auto[^"'`\n]*w-full[^"'`\n]*max-w-[^"'`\n]*["'`]/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const violations = [];

for (const dir of TARGET_DIRS) {
  const absDir = join(ROOT, dir);
  for (const file of walk(absDir)) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    const matches = text.match(CONTAINER_WIDTH_PATTERN);
    if (matches?.length) {
      violations.push({ rel, sample: matches[0] });
    }
  }
}

if (violations.length) {
  console.error("检测到手写页面宽度（mx-auto + max-w-*），请改用 PageContainer 或 ui-style 令牌：\n");
  for (const v of violations) {
    console.error(`- ${v.rel}`);
    console.error(`  示例: ${v.sample}`);
  }
  process.exit(1);
}

console.log("布局宽度检查通过。");
