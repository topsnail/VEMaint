import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const seedSqlPath = join(ROOT, "drizzle", "seed.sql");
const tmpPdfPath = join(ROOT, "scripts", ".tmp-dev-seed.pdf");
const bucket = process.env.R2_BUCKET_NAME || "vemaint";

const sql = readFileSync(seedSqlPath, "utf8");
const keys = Array.from(new Set(sql.match(/demo\/[a-zA-Z0-9/_-]+\.pdf/g) ?? [])).sort();

if (keys.length === 0) {
  console.log("[r2:seed:local] No demo PDF keys found in drizzle/seed.sql");
  process.exit(0);
}

// Minimal valid PDF bytes so browser preview/open flow works.
const minimalPdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 40 80 Td (VEMaint local demo file) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000118 00000 n 
0000000207 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
300
%%EOF
`;

writeFileSync(tmpPdfPath, minimalPdf, "utf8");

const npx = "npx";
let failed = 0;

for (const key of keys) {
  const args = [
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--local",
    "--file",
    tmpPdfPath,
    "--content-type",
    "application/pdf",
  ];
  const ret = spawnSync(npx, args, {
    shell: true,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (ret.status !== 0) {
    failed += 1;
    if (ret.stdout) process.stdout.write(ret.stdout);
    if (ret.stderr) process.stderr.write(ret.stderr);
    if (ret.error) console.error(ret.error.message);
    console.error(`[r2:seed:local] Failed: ${key}`);
  }
}

unlinkSync(tmpPdfPath);

if (failed > 0) {
  console.error(`[r2:seed:local] Completed with ${failed} failures.`);
  process.exit(1);
}

console.log(`[r2:seed:local] Done. Seeded ${keys.length} objects to local R2 bucket '${bucket}'.`);
