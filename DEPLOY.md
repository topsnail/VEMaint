# VEMaint 发布与部署指南（Cloudflare Pages）

## 1) 发布前检查

```bash
npm install
npm run release:check
```

`release:check` 会执行 TypeScript 检查与生产构建，确保可发布。

## 2) Cloudflare 资源准备

本项目依赖以下绑定（名称必须与代码一致）：

- D1: `DB`
- KV: `KV`
- R2: `R2`

对应配置已在 `wrangler.toml` 中声明。

## 3) 必要环境变量（Production / Preview 都建议配置）

- `AUTH_SECRET`（必填，强随机字符串）
- `BOOTSTRAP_ADMIN_USER`（建议）
- `BOOTSTRAP_ADMIN_PASS`（建议）
- `LOG_RETENTION_DAYS`（可选，默认 180，范围 30-3650）

> 注意：修改环境变量后需要重新部署才能生效。

## 4) 数据库初始化（首次上线）

首次上线建议在远端执行：

```bash
npm run db:init:remote
npm run db:migrate:remote
npm run db:seed:remote
```

如果生产库不希望导入示例数据，请跳过 `db:seed:remote`。

## 5) 发布命令

```bash
npm run release:prod
```

该命令会先本地检查，再部署到 Cloudflare Pages：

- `npm run release:check`
- `npm run release:deploy`（实际执行 `wrangler pages deploy dist --project-name vemaint`）

## 6) 首次登录与安全建议

- 系统无管理员时，会使用 `BOOTSTRAP_ADMIN_USER/PASS` 自动引导创建管理员。
- 上线后请立即修改默认管理员密码。
- 建议定期轮换 `AUTH_SECRET` 与管理员密码，并启用最小权限角色策略。
