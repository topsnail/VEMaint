# VEMaint / 车辆与设备维保管理
## 📋 项目简介
- 项目定位：VEMaint 是一个面向工程现场与车队管理的车辆/设备维保管理系统，覆盖资产台账、维保记录、预警提醒、统计分析与附件管理。
- 核心场景：适用于工程项目部、设备管理部门、车队管理人员；支持车辆、机械、检测仪器等资产的统一维保管理。
- 技术亮点：基于 Next.js App Router + Cloudflare D1/KV/R2，支持本地开发与云端部署一致化；具备提醒分级、风险报表、车辆台账、工单字段增强等能力。
- 部署平台：Cloudflare Pages

## 🛠 技术栈
- 前端技术：Next.js 15（应用路由）、React 18、Tailwind CSS、shadcn/ui、Lucide 图标
- 云服务：Cloudflare Pages、Cloudflare Workers（Edge Runtime）、Cloudflare D1（数据库）、Cloudflare KV（应用设置）、Cloudflare R2（附件存储）
- 开发工具：Git、Node.js（LTS）、npm、Wrangler、Drizzle ORM/Drizzle Kit
- 其他依赖：`@cloudflare/next-on-pages`、`xlsx`

## 📁 项目目录结构
```text
VEMaint
├── src/
│   ├── app/                         # Next.js 路由与服务端动作
│   │   ├── actions/                 # 资产/维保/提醒/设置等服务端动作
│   │   ├── page.tsx                 # 仪表盘首页
│   │   ├── records/page.tsx         # 维保记录页
│   │   ├── alerts/page.tsx          # 预警分析页
│   │   ├── devices/page.tsx         # 设备视图页
│   │   ├── settings/page.tsx        # 系统设置页
│   │   └── vehicle-ledger/page.tsx  # 车辆台账页
│   ├── components/                  # 业务组件与 UI 组件
│   ├── db/schema.ts                 # Drizzle 表结构定义
│   └── lib/                         # 数据加载、KV 设置、工具函数
├── drizzle/
│   ├── migrations/                  # D1 迁移文件
│   └── seed.sql                     # 本地初始化数据
├── workers/
│   └── reminders-cron.ts            # 提醒任务 Cron 示例
├── wrangler.toml                    # Cloudflare 资源绑定配置
├── package.json                     # 脚本与依赖
└── README.md                        # 项目说明文档
```

## ⚙️ 环境准备
1. 必备环境：安装 Node.js（建议 LTS 18+/20+）、Git
2. Cloudflare 准备：注册 Cloudflare 账号，创建 Pages 项目（可选绑定自定义域名）
3. 本地调试工具：安装 Wrangler（项目已内置依赖）
   - 全局安装（可选）：`npm i -g wrangler`
4. 依赖安装：
   - `npm install`
   - 如遇 peer 依赖冲突可用：`npm install --legacy-peer-deps`

## 🚀 本地开发与调试
1. 克隆项目到本地  
   `git clone <你的仓库地址>`
2. 进入项目目录  
   `cd VEMaint`
3. 安装项目依赖  
   `npm install`
4. 执行本地数据库迁移  
   `npm run db:migrate:local`
5. 启动开发服务  
   `npm run dev`
6. 本地访问地址  
   `http://localhost:3000`
7. Cloudflare 资源本地调试说明  
   - D1/KV/R2 通过 `wrangler.toml` 绑定，本地开发由 next-on-pages 注入绑定环境  
   - 如端口冲突，Next.js 会自动切换到 3001/3002，请以终端输出为准

## ☁️ Cloudflare Pages 部署流程
### Git 仓库关联自动部署
1. 将代码推送到 GitHub/GitLab
2. 在 Cloudflare Pages 创建项目并关联仓库
3. 构建设置（推荐）
   - 构建命令：`npm run pages:build`
   - 构建输出目录：`.vercel/output/static`
4. 在 Pages 后台配置环境变量（如有）
5. 绑定 Cloudflare 资源
   - D1：绑定 `DB`
   - KV：绑定 `KV`
   - R2：绑定 `R2`
6. 完成部署后访问 Cloudflare 分配域名

## 🔐 环境变量配置
本项目主要依赖 Cloudflare 绑定资源，默认不强制要求额外 `.env`。

- 必填（Cloudflare Pages/Workers 绑定）
  - `DB`：D1 数据库绑定
  - `KV`：KV 命名空间绑定
  - `R2`：R2 Bucket 绑定
- 可选（本地）
  - `NEXT_DISABLE_TRACE=1`：Windows 文件锁场景建议开启（项目 `dev` 脚本已内置）

## 📌 核心功能说明
- 资产管理：车辆/设备资产新增、编辑、状态变更记录、快速复制资产档案
- 维保管理：维保记录新增/编辑/删除、项目/子类、执行人/维保单位/下次计划、附件上传
- 预警管理：到期预警、完成确认、延期、升级通知、30/60/90 天风险报表
- 统计分析：维保费用趋势、项目费用构成、月度汇总、电子表格导出
- 车辆台账：独立车辆台账页，覆盖基础信息、保险、年检、里程保养、易损件、车辆状态
- 系统设置：维保类型、维保项目及子类、提醒推荐类型、提醒提前规则、轻量权限模式

## ⚠️ 注意事项
1. Cloudflare Pages 部署注意事项
   - 确保输出目录与构建命令匹配（`.vercel/output/static`）
   - 资源绑定缺失会导致运行时报错（D1/KV/R2）
2. 本地与线上差异
   - 本地通过 Wrangler 模拟绑定，线上使用真实 Cloudflare 资源
   - 本地数据库与线上数据库数据互不影响
3. 资源绑定与权限
   - `wrangler.toml` 的 `binding` 名称需与代码读取一致（`DB/KV/R2`）
4. 代码提交与维护规范（建议）
   - 避免重复逻辑：优先抽离共用函数/组件
   - 避免硬编码：类型、状态、规则优先放入配置或常量
   - 重要改动先跑 `npm run lint` 与关键页面冒烟测试
   - 数据结构变更必须配套 migration 与回归测试

## 🐛 常见问题排查
1. 本地启动失败
   - 检查 Node 版本、依赖安装、端口占用
   - 端口冲突可先结束旧进程后重启
2. CF Pages 部署失败
   - 核对构建命令/输出目录
   - 核对 D1/KV/R2 绑定名称与权限
3. 页面访问异常（404/500）
   - 清理本地缓存目录：`.next`、`.next-dev`
   - 强制刷新浏览器缓存（`Ctrl + F5`）
   - 确认当前访问端口与 dev 终端输出一致
4. 服务端函数或动作不生效
   - 检查是否使用了服务端动作（`"use server"`）
   - 检查边缘运行环境下不兼容 Node 原生 API 的调用
5. 环境变量/绑定不生效
   - 检查 Cloudflare 后台绑定是否完成
   - 变更后重新部署
   - 校验变量名大小写与绑定名一致
