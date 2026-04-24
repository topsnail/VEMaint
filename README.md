# VEMaint（车辆/设备维保管理）

## 📋 项目简介

- **用途**：车辆与设备维保管理 Web 应用（Cloudflare Pages 一体化部署），用于统一管理台账、维保记录、到期预警、附件资料、角色权限与操作日志。
- **适用场景**：企业车队管理、设备维保登记、后勤保障管理、轻量级运维台账系统。
- **部署形态**：前端静态站点 + Pages Functions（API）+ D1（数据库）+ KV（系统配置/黑名单等）+ R2（附件存储）。

## 🛠 技术栈
- 前端技术：React 18、TypeScript、Vite、Tailwind CSS、shadcn/ui、React Router、TanStack Query、React Hook Form、Zod
- 云服务：Cloudflare Pages、Cloudflare Pages Functions、Cloudflare D1、Cloudflare KV、Cloudflare R2
- 开发工具：Git、Node.js（LTS）、npm、Wrangler、TypeScript
- 其他依赖：Hono、JOSE、Lucide React、GSAP、Sonner

## 📁 项目目录结构

```plain text
VEMaint
├── frontend/                  # 前端源码（React + Vite）
│   ├── index.html             # 前端 HTML 入口
│   └── src/
│       ├── app.tsx            # 应用主路由与布局
│       ├── pages/             # 页面模块（登录、仪表盘、车辆、维保、配置等）
│       ├── components/        # 复用组件（含 ui 组件）
│       ├── hooks/             # 数据与行为 Hook（含 React Query）
│       └── lib/               # HTTP、鉴权、权限、schema、工具函数
├── functions/                 # Cloudflare Pages Functions 服务端目录
│   └── api/
│       ├── [[path]].ts        # Functions 动态入口
│       ├── app.ts             # Hono 聚合入口
│       ├── routes/            # API 路由（auth/users/vehicles/maintenance/config 等）
│       ├── middleware/        # 鉴权与权限中间件
│       ├── repositories/      # D1 数据访问层
│       ├── services/          # 配置与业务服务层
│       └── lib/               # JWT、请求解析、响应、校验工具
├── drizzle/                   # D1 初始化与迁移 SQL
├── public/                    # 静态资源目录
├── dist/                      # 前端构建产物（Pages 部署目录）
├── public/_headers            # CF Pages 响应头配置（可选）
├── wrangler.toml              # Cloudflare 资源绑定配置
├── vite.config.ts             # Vite 配置
├── package.json               # 依赖与脚本配置
└── README.md                  # 项目说明文档
```

## ⚙️ 环境准备

- **必备**：Node.js（LTS）、Git
- **Cloudflare**：需要 Cloudflare 账号；域名可选（不绑定也能用 `*.pages.dev`）
- **Wrangler**：Cloudflare 官方 CLI（本地联调/部署/操作 D1/KV/R2 都要用）

```bash
npm install -g wrangler
```

- **安装依赖**

```bash
npm install
```

## 🚀 本地开发与调试

- **启动方式 A（只跑前端 UI）**

```bash
npm run dev
```

- **启动方式 B（前后端联调：Pages Functions + D1/KV/R2 本地模拟）**

```bash
npm run pages:dev
```

- **访问地址**
  - 前端：`http://127.0.0.1:5173`
  - 联调（含 API）：`http://127.0.0.1:8788`

- **本地数据准备（联调时建议执行）**

```bash
npm run dev:reset-data:local
```

该命令会依次初始化/迁移/导入 D1 数据，并写入本地 KV 默认配置，种子化本地 R2。

## ☁️ Cloudflare Pages 部署流程

部署请看更详细的新手版文档：`DEPLOY.md`。

## 🔐 环境变量配置
| 变量名 | 必填 | 说明 | 本地配置位置 | Cloudflare Pages 配置位置 |
| --- | --- | --- | --- | --- |
| `AUTH_SECRET` | 是 | JWT 签名密钥，必须为高强度随机字符串 | `.dev.vars`（参考 `.dev.vars.example`） | Pages -> Settings -> Environment variables |
| `BOOTSTRAP_ADMIN_USER` | 建议 | 初始化管理员用户名（系统无管理员时生效） | `.dev.vars`（参考 `.dev.vars.example`） | Pages -> Settings -> Environment variables |
| `BOOTSTRAP_ADMIN_PASS` | 建议 | 初始化管理员密码（系统无管理员时生效） | `.dev.vars`（不建议入库） | Pages -> Settings -> Environment variables |
| `LOG_RETENTION_DAYS` | 否 | 操作日志保留天数（默认 180，范围 30-3650） | `.dev.vars` | Pages -> Settings -> Environment variables |
| `DB` | 是 | D1 数据库绑定名（非普通字符串变量） | `wrangler.toml` 的 `[[d1_databases]]` | Pages -> Settings -> Bindings -> D1 |
| `KV` | 是 | KV 命名空间绑定名（配置与 token 黑名单） | `wrangler.toml` 的 `[[kv_namespaces]]` | Pages -> Settings -> Bindings -> KV |
| `R2` | 是 | R2 存储桶绑定名（附件上传/读取） | `wrangler.toml` 的 `[[r2_buckets]]` | Pages -> Settings -> Bindings -> R2 |

## 📌 核心功能说明
- 用户登录与鉴权：JWT 登录、登出、个人密码修改、初始化管理员
- 权限控制：管理员/维保员/只读角色 + 路由级权限校验
- 车辆台账：车辆新增、编辑、状态变更、检索、周期信息管理
- 维保管理：车辆/设备/其他对象维保记录录入、编辑、删除、附件管理
- 周期预警：保险、年审、保养日期/里程等维度的到期提醒
- 系统配置：站点配置、字典项、角色权限矩阵、所有人住址映射
- 数据导出与日志：车辆/维保 CSV 导出与操作日志审计
- 前后端校验：前端 React Hook Form + Zod，后端 Hono 路由统一 Zod 校验

## ⚠️ 注意事项
1. Cloudflare Pages部署注意事项（构建目录、环境变量生效、缓存清理）
- 输出目录必须为 `dist`；改环境变量后需重新部署
- 静态资源异常时优先清理缓存并触发新部署
2. 本地与线上环境差异说明
- 本地由 Wrangler 模拟 D1/KV/R2/Functions，不等同真实线上网络环境
- 本地默认读取 `.dev.vars` / `wrangler.toml`，线上变量以 Pages 配置为准
3. 资源绑定与权限配置注意事项
- 绑定名 `DB`、`KV`、`R2` 必须与代码一致
- `AUTH_SECRET` 不可为空，不可使用弱口令
- 接口访问异常时先检查 `requireAuth` 与 `permitPerm` 权限链
4. 代码提交与维护注意事项
- 禁止提交本地状态文件（如 `.wrangler/state`、临时 DB、日志）
- 新增功能优先抽离公共 schema、常量与工具，避免重复逻辑和硬编码
- 提交前至少执行：
```bash
npx tsc --noEmit
npm run build
```

## 🐛 常见问题排查
1. 本地启动失败：排查依赖、端口占用、Node版本
- 检查 Node.js 版本是否为 `【LTS】`
- 执行 `npm install` 确认依赖完整
- 检查 `5173` 与 `8788` 端口是否被占用
2. CF Pages部署失败：构建命令错误、目录错误、资源绑定失败
- 构建命令应为 `npm run build`，输出目录应为 `dist`
- 检查 `DB`、`KV`、`R2` 绑定是否完整
3. 页面访问异常：404/522/530错误排查、缓存刷新、Headers配置
- 404：检查构建产物与前端路由资源是否完整
- 522/530：检查 Cloudflare 平台状态、域名配置、部署状态
- 样式/脚本异常：尝试清缓存并重新部署
4. 服务端函数（Functions）不生效：文件路径、命名、权限排查
- 确认 `functions/api/[[path]].ts` 与 `functions/api/app.ts` 存在
- 确认请求路径以 `/api` 开头且前端代理配置正确
- 检查中间件是否拦截（`requireAuth`、`permitPerm`）
5. 环境变量不生效：配置位置、重启部署、变量名大小写问题
- 确认配置在正确环境（Production/Preview）
- 修改变量后需重新部署，不是仅刷新页面
- 检查变量名大小写是否完全一致
