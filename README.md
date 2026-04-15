# VEMaint

## 技术栈
- 前端：React 18 + TypeScript + Vite + Ant Design + Tailwind CSS（`/frontend`）
- 后端：Hono（Cloudflare Pages Functions，`/functions`）
- 鉴权：JWT（HS256），token 存 `localStorage`，请求走 `Authorization: Bearer <token>`
- 存储：D1 / KV / R2（绑定名：`DB` / `KV` / `R2`）
- 部署：Cloudflare Pages

## 项目结构（极简）
```text
.
├── frontend/
│   └── src/
├── functions/
│   └── api/
├── drizzle/                 # D1 migrations + seed（可用于本地/线上初始化）
├── public/                  # Vite 静态资源（被 vite.config.ts 指向）
├── env.d.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.cjs
├── vite.config.ts
└── wrangler.toml
```

## 本地运行
1) 安装依赖
```bash
npm install
```

2) 初始化本地 D1（可选）
```bash
npm run db:migrate:local
npm run db:seed:local
```

3) 启动前端（仅前端）
```bash
npm run dev
```

4) 启动 Pages 本地全栈（前端 dist + functions）
```bash
npm run pages:dev
```

## 部署到 Cloudflare Pages
- **Build command**：`npm run build`
- **Build output directory**：`dist`
- **Functions**：仓库内 `/functions` 自动生效
- **环境变量**：`AUTH_SECRET`（必填）
- **绑定**：D1=`DB`，KV=`KV`，R2=`R2`
