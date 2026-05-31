# NTE Flowboard

每日与每周事项追踪看板，支持多设备云端同步。

## 功能

- **每日/每周清单** — 自动按服务器时区重置（含夏令时）
- **拖拽排序** — 基于 @dnd-kit 的流畅拖拽体验
- **标签系统** — 8 色标签分类
- **主题切换** — 浅色 / 深色 / 跟随系统
- **布局切换** — 单列 / 双列（桌面端）
- **云端同步** — Supabase Realtime 跨设备实时同步
- **安全加密** — 同步密钥加密本地凭据 + RLS 验证云端访问
- **虚拟滚动** — 超过 50 项自动启用
- **离线提示** — 断网时显示状态
- **单文件部署** — 构建为单个 HTML，可直接打开

## 技术栈

- React 19 + TypeScript
- Vite 7（vite-plugin-singlefile）
- Tailwind CSS 4
- Motion（动画）
- @dnd-kit（拖拽排序）
- @tanstack/react-virtual（虚拟滚动）
- Supabase JS（云同步）

## 开发

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 生产构建
npm run preview    # 预览构建产物
npm run typecheck  # 类型检查
```

## 部署

推送到 `main` 分支自动通过 GitHub Actions 部署到 GitHub Pages。

## License

[MIT](LICENSE)
