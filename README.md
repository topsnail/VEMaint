# VEMaint 车辆综合维保管理系统

## 项目简介
VEMaint 是基于 Cloudflare Pages 的车辆综合维保管理系统，用于管理车辆完整档案、车辆周期（保险/年审/保养）与车辆/设备维保记录。  
系统支持三角色权限（管理员、维保员、只读），并提供到期预警、附件管理、操作日志与数据导出能力。

## 技术栈
- 前端：React 18 + TypeScript + Vite + Ant Design + Tailwind CSS + React Router
- 后端：Cloudflare Pages Functions + Hono + JWT
- 数据与存储：Cloudflare D1（业务数据）+ KV（系统配置/JWT黑名单）+ R2（附件）
- 工具链：Node.js、npm、Wrangler

## 目录结构
```text
VEMaint
├── frontend/               # React 前端
├── functions/              # Cloudflare Pages Functions + Hono API
├── drizzle/                # D1 初始化与种子 SQL
├── dist/                   # 构建产物
├── wrangler.toml           # Cloudflare 绑定配置
├── package.json            # 根脚本与依赖
└── README.md
```

## 本地开发
```bash
npm install
npm run db:init:local
npm run db:seed:local
npm run pages:dev
```

本地访问：`http://127.0.0.1:8788`

默认测试账号（seed）：
- `admin / admin123`
- `maintainer / maintainer123`
- `reader / reader123`

## Cloudflare Pages 部署
1. 将仓库连接到 Cloudflare Pages。
2. Build command 填写：`npm run build`
3. Build output directory 填写：`dist`
4. 在 Pages 项目中绑定：
   - D1：`DB`
   - KV：`KV`
   - R2：`R2`
5. 配置环境变量：`AUTH_SECRET`（生产强随机密钥）。
6. 触发部署。

## 环境变量
| 变量名 | 必填 | 说明 | 配置位置 |
|---|---|---|---|
| `AUTH_SECRET` | 是 | JWT 签名密钥 | Pages 环境变量 |

## 核心功能
- 登录鉴权与三角色权限控制（管理员/维保员/只读）
- 用户管理（新增、禁用、角色调整、重置密码）
- 车辆完整档案管理（状态流转：正常/维修中/停用/报废）
- 车辆周期管理（保险、年审、保养周期）
- 维保记录管理（车辆维保 + 设备维保，无设备档案）
- R2 附件上传/预览/下载
- 预警中心（保险/年审/保养到期）
- 系统设置（站点名、预警提前天数、版本说明）
- 操作日志与数据导出（车辆、维保）

## 注意事项
- 绑定名称必须与代码一致：`DB`、`KV`、`R2`。
- 修改环境变量后需重新部署。
- 本地结构升级时先执行 `npm run db:init:local`（会重建本地 D1 表）。
