# 【VEMaint / 车辆综合维保管理系统】
## 📋 项目简介
- 项目定位：`【VEMaint】` 是一个基于 Cloudflare Pages 的车辆与设备维保管理 Web 应用，用于统一管理车辆台账、维保记录、周期预警、附件资料、用户权限与操作日志。
- 核心场景：适用于 `【企业车队管理】`、`【设备维保登记】`、`【后勤保障部门】`、`【轻量级运维台账系统】` 等场景，目标用户包括管理员、维保人员、只读查看人员。
- 技术亮点：前端采用 React + TypeScript + Vite，后端基于 Cloudflare Pages Functions + Hono 构建轻量全栈能力，支持 D1/KV/R2 资源集成、角色权限控制、到期预警、附件上传、日志审计与数据导出；依托 Cloudflare Pages 可获得免费额度、全球加速、边缘部署与无服务器运维优势。
- 部署平台：Cloudflare Pages

## 🛠 技术栈
- 前端技术：React 18、TypeScript、Vite、Ant Design、Tailwind CSS、React Router
- 云服务：Cloudflare Pages、Cloudflare Pages Functions、Cloudflare D1、Cloudflare KV、Cloudflare R2
- 开发工具：Git、Node.js LTS、npm、Wrangler、TypeScript
- 其他依赖：Hono、JOSE、GSAP、`@ant-design/icons`

## 📁 项目目录结构
```plain text
【VEMaint】
├── frontend/               # React 前端源码目录
│   ├── src/
│   │   ├── app.tsx         # 应用主路由与整体布局
│   │   ├── main.tsx        # 前端入口
│   │   ├── pages/          # 页面模块（登录、仪表盘、车辆、维保、配置等）
│   │   ├── lib/            # 鉴权、HTTP、权限等公共能力
│   │   └── components/     # 复用组件
├── functions/              # Cloudflare Pages Functions 服务端目录
│   └── api/
│       ├── [[path]].ts     # Pages Functions 动态入口
│       ├── app.ts          # Hono 应用聚合入口
│       ├── routes/         # API 路由（auth/users/vehicles/maintenance 等）
│       ├── repositories/   # D1 数据访问层
│       ├── middleware/     # 鉴权与权限中间件
│       ├── services/       # 配置、R2 等服务层
│       └── lib/            # JWT、请求解析、响应工具等
├── drizzle/                # D1 初始化与种子 SQL
│   ├── 0000_init.sql       # 数据库初始化脚本
│   └── seed.sql            # 本地/远程测试数据脚本
├── public/                 # 静态资源目录
├── dist/                   # Vite 构建产物，供 Pages 部署使用
├── wrangler.toml           # Cloudflare Pages / D1 / KV / R2 绑定配置
├── vite.config.ts          # Vite 配置，前端根目录为 frontend，输出目录为 dist
├── VEMaint.ps1             # Windows 本地开发辅助启动脚本
├── package.json            # 项目脚本、依赖与构建命令
└── README.md               # 项目说明文档
```

维保模块（`/maintenance`）当前采用“页面编排 + 组件分层 + Hook行为抽离”结构：
- `frontend/src/pages/MaintenancePage.tsx`：页面编排层（数据加载、提交、弹窗、Tab 组装）
- `frontend/src/components/maintenance/MaintenanceBasicSection.tsx`：基础信息表单区
- `frontend/src/components/maintenance/MaintenanceCostSection.tsx`：费用与备注表单区
- `frontend/src/hooks/useMaintenanceColumns.tsx`：表格列定义与编辑回填行为
- `frontend/src/lib/maintenanceMeta.ts`：维保 remark 元数据解析/拼装与配件统计工具

## ⚙️ 环境准备
1. 必备环境：安装 Node.js `【18+/20+ LTS】`、Git。
2. Cloudflare准备：注册 Cloudflare 账号，按需准备域名，并在 Cloudflare Pages 中创建 `【项目名称】`。
3. 本地调试工具：全局安装 Wrangler。
```bash
npm install -g wrangler
```
4. 依赖安装：在项目根目录安装本地依赖。
```bash
npm install
```

## 🚀 本地开发与调试
1. 克隆项目到本地（附Git克隆命令占位符）
```bash
git clone 【你的仓库地址】
```
2. 进入项目目录（附命令）
```bash
cd 【项目目录名】
```
3. 安装项目依赖（附命令）
```bash
npm install
```
4. 本地启动开发服务（附命令）
```bash
npm run db:init:local
npm run db:seed:local
npm run pages:dev
```
如需仅调试前端界面，也可单独运行：
```bash
npm run dev
```
5. 本地访问地址
- 前端开发地址：`http://127.0.0.1:5173`
- Cloudflare Pages 本地调试地址：`http://127.0.0.1:8788`
6. Cloudflare相关资源本地调试方法
- D1：通过 `npm run db:init:local` 初始化本地数据库，通过 `npm run db:seed:local` 导入测试数据。
- KV：本地由 Wrangler 模拟，需保持 `wrangler.toml` 中 `KV` 绑定名称一致。
- R2：本地由 Wrangler 模拟对象存储，附件上传与预览会依赖 `R2` 绑定。
- Pages Functions：执行 `npm run pages:dev` 时，会先构建 `dist`，再使用 `wrangler pages dev dist` 启动前后端联调。
- Windows 环境可按需使用 `VEMaint.ps1` 简化本地启动流程。

## ☁️ Cloudflare Pages 部署流程
### Git仓库关联自动部署
1. 代码推送至GitHub/GitLab
- 将项目代码推送到 `【GitHub/GitLab 仓库】`，建议主分支为 `【main/master】`。
2. Cloudflare Pages后台创建项目，关联对应仓库
- 登录 Cloudflare Dashboard，进入 Pages，创建 `【项目名称】` 并关联仓库。
3. 构建设置：构建命令、构建输出目录（按需填写，纯前端可留空）
- 构建命令：`npm run build`
- 构建输出目录：`dist`
- 根目录：`/`
- Node 版本：`【建议与本地保持一致，如 Node 20】`
4. 环境变量配置：CF后台添加项目所需环境变量
- 在 Pages 项目设置中添加 `AUTH_SECRET`
- 在 Pages 项目设置中添加 `BOOTSTRAP_ADMIN_USER`、`BOOTSTRAP_ADMIN_PASS`（用于初始化唯一管理员账号）
- 生产环境请使用强随机密钥，禁止保留本地默认值
- `BOOTSTRAP_ADMIN_PASS` 建议仅配置在 Cloudflare 控制台（不要写入仓库中的 `wrangler.toml`）
5. 绑定Cloudflare资源（D1/KV/R2）操作步骤
- D1 绑定名称：`DB`
- KV 绑定名称：`KV`
- R2 绑定名称：`R2`
- 绑定名称必须与代码和 `wrangler.toml` 保持完全一致
- 如果你使用不同资源实例，请替换 `【database_id】`、`【KV namespace id】`、`【bucket_name】`
6. 完成部署，访问分配的域名
- 部署成功后访问 Cloudflare Pages 分配域名：`【https://your-project.pages.dev】`
- 如需自定义域名，请在 Pages 后台完成域名绑定和 DNS 配置

## 🔐 环境变量配置

| 变量名 | 必填 | 说明 | 本地配置位置 | Cloudflare Pages 配置位置 |
| --- | --- | --- | --- | --- |
| `AUTH_SECRET` | 是 | JWT 签名密钥，必须使用强随机字符串 | `wrangler.toml` 的 `[vars]` 或本地环境变量 | Pages 项目 Settings -> Environment variables |
| `BOOTSTRAP_ADMIN_USER` | 是（生产建议） | 初始管理员用户名（仅在系统无管理员时生效） | `wrangler.toml` 的 `[vars]` | Pages 项目 Settings -> Environment variables |
| `BOOTSTRAP_ADMIN_PASS` | 是（生产建议） | 初始管理员密码（仅在系统无管理员时生效） | `wrangler.toml` 的 `[vars]` | Pages 项目 Settings -> Environment variables |
| `DB` | 是 | D1 数据库绑定名，不是普通字符串变量 | `wrangler.toml` 的 `[[d1_databases]]` | Pages 项目 Settings -> Bindings -> D1 |
| `KV` | 是 | KV 命名空间绑定名，用于系统配置与 Token 黑名单 | `wrangler.toml` 的 `[[kv_namespaces]]` | Pages 项目 Settings -> Bindings -> KV |
| `R2` | 是 | R2 存储桶绑定名，用于附件上传与读取 | `wrangler.toml` 的 `[[r2_buckets]]` | Pages 项目 Settings -> Bindings -> R2 |

补充说明：
- `AUTH_SECRET` 为必填项，线上环境必须替换 `【local-dev-auth-secret-please-change】`
- `BOOTSTRAP_ADMIN_USER` / `BOOTSTRAP_ADMIN_PASS` 仅在“系统无管理员账号”时用于自动初始化管理员；初始化成功后可在应用内修改密码
- `database_id`、`bucket_name`、`kv namespace id` 等资源标识应替换为你自己的 Cloudflare 实例信息

## 📌 核心功能说明
- 用户登录与鉴权：支持 JWT 登录鉴权，区分管理员、维保员、只读三类角色。
- 权限矩阵：支持基于角色的菜单展示、接口访问控制与系统配置权限分配。
- 车辆台账管理：支持新增、编辑、状态变更、完整度展示与台账检索。
- 维保记录管理：支持车辆维保与通用设备维保录入、编辑、删除与附件管理。
- 周期预警中心：支持保险、年审、保养日期、保养里程等维度的到期预警。
- 附件管理：通过 Cloudflare R2 完成附件上传、预览与受保护访问。
- 系统配置：支持站点名称、预警天数、字典项、角色权限矩阵配置。
- 数据导出：支持车辆与维保数据导出为 CSV。
- 操作日志：支持查看系统关键操作记录，便于审计与追踪。
- 本地联调：支持 D1/KV/R2/Pages Functions 的本地模拟开发。

## 🧩 维保模块说明（2026-04 更新）
- 维保记录支持 `车辆 / 设备 / 其他` 三类对象录入，基础信息与费用信息分层维护。
- 费用与备注支持结构化配件明细（名称、规格、单位、数量、单价），并自动汇总配件金额。
- 维保扩展信息通过 remark 元数据存储（前缀：`__COST_META__`、`__EQUIP_META__`、`__MAINT_META__`），兼容现有后端字段，不强依赖数据库结构变更。
- 列表页支持配件种类与金额汇总展示，编辑时可自动回填结构化数据。

## ⚠️ 注意事项
1. Cloudflare Pages部署注意事项（构建目录、环境变量生效、缓存清理）
- 构建输出目录必须填写 `dist`，否则 Pages 无法正确部署前端产物。
- 修改环境变量、D1/KV/R2 绑定后，通常需要重新触发部署才能生效。
- 若页面仍显示旧资源，请清理 Pages 缓存并重新部署。
2. 本地与线上环境差异说明
- 本地 `npm run pages:dev` 通过 Wrangler 模拟 Cloudflare 资源，不等同于真实线上网络环境。
- 本地默认使用 `wrangler.toml` 中的开发变量，线上必须改成正式值。
- 前端本地开发端口默认为 `5173`，通过 Vite 代理 `/api` 到 `8788`。
3. 资源绑定与权限配置注意事项
- D1/KV/R2 绑定名必须固定为 `DB`、`KV`、`R2`，不可随意更改。
- `AUTH_SECRET` 不可为空，且不得使用弱口令或硬编码生产值。
- 如果导出、附件、日志访问异常，优先检查 Pages Bindings 与权限配置是否完整。
4. 代码提交与维护注意事项
- 禁止在提交中混入 `.wrangler/state`、临时数据库文件、日志文件等本地开发产物。
- 新增配置项时优先抽离到配置层，避免继续引入硬编码、魔法值和重复常量。
- 页面组件、路由处理、表单映射逻辑应控制复杂度，避免单文件持续膨胀。
- 提交前至少执行 `npx tsc --noEmit` 与 `npm run build`（当前项目未配置 `npm run lint` 脚本）。
- 代码审查时重点检查：空值判断、边界输入、权限校验、重复代码、命名一致性、异常处理、性能与安全风险。

## 🐛 常见问题排查
1. 本地启动失败：排查依赖、端口占用、Node版本
- 先确认 Node.js 版本为 `【LTS】`
- 执行 `npm install` 确认依赖完整
- 检查 `5173`、`8788` 端口是否被占用
- Windows 环境可使用 `VEMaint.ps1` 做端口和启动检查
2. CF Pages部署失败：构建命令错误、目录错误、资源绑定失败
- 检查构建命令是否为 `npm run build`
- 检查输出目录是否为 `dist`
- 检查 `DB`、`KV`、`R2` 是否已正确绑定
- 检查 `AUTH_SECRET` 是否已在目标环境配置
3. 页面访问异常：404/522/530错误排查、缓存刷新、Headers配置
- 404：优先检查 Pages 构建输出是否正确、前端路由资源是否已生成
- 522/530：优先检查 Cloudflare 平台状态、域名配置、项目部署状态
- 页面样式或脚本异常时，尝试重新部署并清理缓存
4. 服务端函数（Functions）不生效：文件路径、命名、权限排查
- 确认 Functions 入口位于 `functions/` 目录下
- 确认 `functions/api/[[path]].ts` 与 `functions/api/app.ts` 正常存在
- 确认接口访问路径以 `/api` 开头，且 Vite 代理配置正确
- 确认对应接口已通过 `requireAuth` / `permitPerm` 正确放行或拦截
5. 环境变量不生效：配置位置、重启部署、变量名大小写问题
- 确认变量配置在正确的 Pages 环境中（Production / Preview）
- 修改变量后重新部署，不要只刷新页面
- 检查变量名大小写是否完全一致
- 检查本地 `wrangler.toml` 与线上 Pages Settings 是否存在不一致配置
