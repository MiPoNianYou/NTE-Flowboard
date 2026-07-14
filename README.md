<p align="center">
  <img src="src/assets/nanally.webp" width="112" alt="NTE Flowboard" />
</p>

<h1 align="center">NTE Flowboard</h1>

<p align="center">
  每日 · 每周 · 每月任务追踪看板<br />
  <a href="https://miponianyou.github.io/NTE-Flowboard/">在线使用</a>
  <span>&nbsp;·&nbsp;</span>
  <a href="#云端同步">云端同步</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript_6-20232A?logo=typescript&logoColor=3178C6" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Vite_8-20232A?logo=vite&logoColor=646CFF" alt="Vite 8" />
</p>

---

## NTE 周期事项

| 周期 | 追踪内容 | 重置时点 |
| --- | --- | --- |
| 每日 | 地图交互、咖舍收益、角色羁遇、像素与家具材料 | 每日 05:00 |
| 每周 | 异象巡礼、都市活力、宝库、送货、拍卖与通行证任务 | 每周一 05:00 |
| 每月 | 集市迷迭、大亨猎人、玩法异境等商店兑换 | 每月 1 日 05:00 |

每日 05:00、每周一 05:00、每月 1 日 05:00 重置。可按游戏服务器选择亚太服、美服或欧服；美服和欧服的夏令时会自动处理。

## 清单功能

| 添加与编辑 | 整理 | 完成 | 保留 |
| --- | --- | --- | --- |
| 添加自定义事项，修改文字和标签 | 拖拽排序，按标签查找 | 勾选完成，可自动移到列表末尾 | 隐藏暂时不做的事项，随时恢复 |

任务支持键盘操作和删除二次确认。进度环显示每份清单的完成数量。数据保存在浏览器中，离线可用；打开多个标签页时会自动同步。

## 云端同步

默认只使用浏览器本地存储。填入自己的 Supabase 项目配置后，数据会在设备间同步。

```text
本地变更  →  upsert_sync  →  Supabase
Supabase  →  pull_sync    →  本地状态
```

Project ID 与 Anon Key 保存在当前浏览器的 `localStorage`。Anon Key 是前端公开凭据，数据访问由 Supabase 的 **Row Level Security (RLS)** 控制。

> 配置同步前，先在 Supabase 项目中启用并验证 RLS。RLS 配置错误时，持有项目公开凭据的人可能读写同步数据。

## 本地运行

需要 Node.js 20+。

```bash
git clone https://github.com/MiPoNianYou/NTE-Flowboard.git
cd NTE-Flowboard
npm install
npm run dev
```

## 开发

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run test:watch` | 监听测试变更 |
| `npm run lint` | 检查 `src/` |
| `npm run typecheck` | TypeScript 检查 |
| `npm run format:check` | Prettier 检查 |
| `npm run build` | lint、类型检查、生产构建 |

提交前验证：

```bash
npm run format:check
npm run test
npm run build
```

## 结构

```text
src/
  components/       界面与交互组件
  context/          全局设置状态
  hooks/            清单、同步、交互逻辑
  tests/            对应业务行为与数据契约的测试
  utils/            存储、迁移、时间与服务接口
  system.css        Liquid Glass 设计令牌
```

## 技术

`React 19` · `TypeScript` · `Vite 8` · `Tailwind CSS 4` · `Motion` · `dnd-kit` · `Supabase` · `Vitest`

## 发布

推送 `main` 后，GitHub Actions 自动完成格式检查、测试、构建和 GitHub Pages 部署。

<p align="center"><sub>MIT License</sub></p>
