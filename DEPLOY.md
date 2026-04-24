# VEMaint 发布与部署指南（Cloudflare Pages）——新手版（一步一步 + 为什么）

这份文档面向「第一次部署 Cloudflare Pages + Functions + D1/KV/R2」的同学。你可以完全照抄命令执行；每一步后面都写了**为什么要这样做**和**常见坑**。

---

## 0) 你需要准备什么（先看 2 分钟）

### 必备软件（本机）

- **Node.js（LTS）**：用于构建前端、执行脚本与 wrangler CLI。
- **Git**：可选（如果你用 Pages 直接连接 GitHub 仓库就会用到）。
- **Wrangler（Cloudflare 官方 CLI）**：用于本地联调、创建/操作 D1、部署 Pages。

安装 wrangler：

```bash
npm install -g wrangler
```

登录 Cloudflare（会打开浏览器授权）：

```bash
wrangler login
```

**为什么**：wrangler 需要你的 Cloudflare 身份来创建 D1/KV/R2、部署 Pages、执行远端 SQL。

**常见坑**：
- 公司网络/代理导致 `wrangler login` 失败：先确保能访问 Cloudflare Dashboard。

---

## 1) 发布前检查（强烈建议必做）

在项目根目录执行：

```bash
npm install
npm run release:check
```

`release:check` 会做两件事：
- **TypeScript 类型检查**（提前发现运行时风险）
- **生产构建**（确保能产出 `dist/`）

**为什么**：Cloudflare Pages 本质上就是部署构建产物；如果本地都 build 不过，线上一定会失败。

---

## 2) Cloudflare 需要创建哪些资源（以及它们分别干什么）

本项目依赖以下绑定（**名称必须与代码一致**）：

- **D1**：`DB`（数据库：车辆、维保、用户、日志等）
- **KV**：`KV`（系统配置、字典项、黑名单/状态等轻量键值数据）
- **R2**：`R2`（附件文件存储：上传、预览、下载）

**为什么要用这些服务**：
- D1 负责“结构化数据”和查询（SQL）。
- KV 负责“配置类/小数据/读多写少”的键值（比 D1 更适合做配置）。
- R2 专门存文件，成本和能力都适合附件。

对应绑定名在 `wrangler.toml` 中声明，Pages 线上也要按相同名字绑定。

---

## 3) 环境变量是什么？为什么改了要重新部署？

### 必要环境变量（Production / Preview 都建议配置）

- `AUTH_SECRET`（必填，强随机字符串）
- `BOOTSTRAP_ADMIN_USER`（建议）
- `BOOTSTRAP_ADMIN_PASS`（建议）
- `LOG_RETENTION_DAYS`（可选，默认 180，范围 30-3650）

**为什么需要 `AUTH_SECRET`**：
- 用于 JWT 签名/校验。它相当于“系统的私钥”，泄露后别人可能伪造登录态。
- 必须是强随机字符串（不要用 `123456`、公司名、日期等）。

**为什么有 `BOOTSTRAP_ADMIN_*`**：
- 这是“首次上线救命绳”：当系统里还没有管理员时，会用它创建/引导管理员。
- 一旦系统已有管理员，这两个变量不会反复覆盖已有管理员（避免误伤）。

**为什么改环境变量要重新部署**：
- Pages Functions 在每次部署时把环境变量打包进运行环境；只改设置不重新部署，旧的运行版本仍然拿到旧变量。

---

## 4) 最推荐的上线流程（最稳：先在 Dashboard 建 Pages 项目）

### 4.1 创建 Pages 项目（Dashboard 操作）

1. 打开 Cloudflare Dashboard -> **Workers & Pages** -> **Pages** -> **Create**
2. 选择 **Connect to Git**（推荐）并选择你的仓库
3. 构建设置（非常重要）：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
   - 根目录：项目根目录（默认）

**为什么输出目录是 `dist`**：`vite build` 默认产物就是 `dist/`，而 `wrangler pages deploy dist` 也是部署这个目录。

### 4.2 绑定 D1/KV/R2（Dashboard 操作）

在 Pages 项目 -> **Settings** -> **Bindings**：

- 添加 **D1 database**，变量名填：`DB`
- 添加 **KV namespace**，变量名填：`KV`
- 添加 **R2 bucket**，变量名填：`R2`

**为什么变量名必须一致**：代码里就是按 `DB/KV/R2` 读取绑定；名字不一致会导致运行时取不到资源（表现为 500/绑定为空）。

### 4.3 配置环境变量（Dashboard 操作）

Pages 项目 -> **Settings** -> **Environment variables**：

建议在 **Production** 和 **Preview** 都配置：
- `AUTH_SECRET`
- `BOOTSTRAP_ADMIN_USER`
- `BOOTSTRAP_ADMIN_PASS`
- `LOG_RETENTION_DAYS`（可选）

**常见坑**：
- 只配了 Production，结果预览环境（Preview）访问报错。
- 变量名大小写写错（Cloudflare 是区分大小写的）。

---

## 5) 数据库初始化（首次上线必须做）

### 5.1 你需要先确认 D1 数据库名称

项目脚本默认 D1 名称是 `vemaint`（见 `package.json` 里的 `wrangler d1 execute vemaint ...`）。

**如果你的 D1 不是这个名字**：要么把你的 D1 建成 `vemaint`，要么修改脚本里的数据库名（推荐保持一致，省事）。

### 5.2 首次上线在远端执行（推荐）

```bash
npm run db:init:remote
npm run db:migrate:remote
```

如果你希望导入示例数据（演示/测试用）：

```bash
npm run db:seed:remote
```

**每个命令做什么**：
- `db:init:remote`：创建基础表结构（第一次必须）
- `db:migrate:remote`：执行后续变更（新增字段/索引等）
- `db:seed:remote`：写入示例数据（可跳过）

**为什么要分 init / migrate**：更接近真实项目的升级方式；以后你新增迁移只需要追加 migrate 脚本。

---

## 6) 发布（两种方式）

### 方式 A：让 Pages 自动从 Git 构建（推荐新手）

你只需要 `git push`，Pages 会自动 build + deploy。  
**前提**：你已经在 Dashboard 配好了 build command / dist / bindings / env vars。

### 方式 B：本地一键部署到 Pages（适合你想手动控制）

```bash
npm run release:prod
```

它会执行：
- `npm run release:check`
- `npm run release:deploy`（等价于 `wrangler pages deploy dist --project-name vemaint`）

**常见坑**：
- `--project-name` 必须与 Pages 项目名一致（这里默认是 `vemaint`）。如果你项目名不叫这个，需要改脚本或改 Pages 项目名。

---

## 7) 首次登录与安全建议（上线后立刻做）

- 系统无管理员时，会使用 `BOOTSTRAP_ADMIN_USER/PASS` 创建/引导管理员。
- **第一次登录后立刻修改管理员密码**（避免环境变量泄露造成风险）。
- `AUTH_SECRET` 建议妥善保存，定期轮换（轮换后旧 token 会失效，属正常）。

---

## 8) 常见问题（对小白最容易卡住的点）

### Q1：页面能打开，但接口 401/500？
- 先看是否配置了 **Bindings（DB/KV/R2）** 和 **环境变量（AUTH_SECRET 等）**
- 修改 env vars 后是否 **重新部署** 了

### Q2：日志接口 500 / 数据字段缺失？
- 多半是远端 D1 没执行迁移：重新跑一次：

```bash
npm run db:migrate:remote
```

### Q3：我不懂是否该 seed？
- 生产正式数据：**不 seed**
- 演示/测试：可以 seed，后续再清库

