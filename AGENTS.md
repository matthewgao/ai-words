# AGENTS.md

## 项目概述

ai-words 是一个基于 React + Vite + Hono + Cloudflare Workers 的全栈应用。前端使用 React 19 SPA，后端使用 Hono 框架运行在 Cloudflare Workers 上。

## 技术栈

- **前端**: React 19, TypeScript, Vite 6
- **后端**: Hono 4, Cloudflare Workers
- **构建**: Vite + @cloudflare/vite-plugin
- **部署**: Wrangler (Cloudflare Workers)
- **代码检查**: ESLint 9 (flat config), typescript-eslint, react-hooks, react-refresh

## 项目结构

```
src/
  worker/index.ts        # Hono API 入口，所有后端路由
  react-app/
    main.tsx             # React 入口
    App.tsx              # 主组件
    App.css / index.css  # 样式
    assets/              # 静态资源（SVG 等）
```

- `wrangler.json` — Cloudflare Workers 配置
- `vite.config.ts` — Vite 构建配置
- `tsconfig.json` — 引用 app / worker / node 三份子配置
- `worker-configuration.d.ts` — Wrangler 自动生成的类型（`Env`）

## 常用命令

- `npm run dev` — 启动开发服务器（Vite + Workers 本地模拟）
- `npm run build` — TypeScript 编译 + Vite 构建
- `npm run preview` — 构建后本地预览
- `npm run deploy` — 部署到 Cloudflare Workers
- `npm run lint` — ESLint 检查
- `npm run cf-typegen` — 生成 Wrangler 类型声明

## 编码规范

- 使用 **TypeScript strict 模式**，开启 `noUnusedLocals`、`noUnusedParameters`
- 使用 **Tab 缩进**
- React 组件使用 **函数式组件 + Hooks**
- 交互元素需添加 `aria-label` 以保证可访问性
- Worker 端通过 `Hono<{ Bindings: Env }>` 绑定 Cloudflare 环境类型
- ESLint 使用 flat config 格式（`eslint.config.js`）

## 架构要点

- 前后端同仓库，Vite 负责前端构建，Hono 处理 API 请求
- `@cloudflare/vite-plugin` 统一开发与构建流程
- Workers 入口文件默认导出 Hono app
- 静态资源构建到 `dist/client`，通过 Workers Assets 托管，配置了 SPA fallback
- 兼容日期 `2025-10-08`，启用 `nodejs_compat`

## 添加 API 路由

在 `src/worker/index.ts` 中使用 Hono 的路由方法：

```typescript
app.get("/api/example", (c) => c.json({ data: "value" }));
app.post("/api/example", async (c) => {
  const body = await c.req.json();
  return c.json({ received: body });
});
```

## 添加 Cloudflare Bindings

1. 在 `wrangler.json` 中配置 binding（KV、D1、R2 等）
2. 运行 `npm run cf-typegen` 更新 `Env` 类型
3. 在 Hono 路由中通过 `c.env` 访问 binding

## 注意事项

- `.env` 及其变体文件已在 `.gitignore` 中，不要提交敏感信息
- `worker-configuration.d.ts` 为自动生成文件，不要手动修改
- 部署前用 `npm run check` 做完整检查（类型 + 构建 + dry-run 部署）
