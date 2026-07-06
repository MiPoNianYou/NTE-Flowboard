<div align="center">

<img src="src/assets/nanally.webp" width="180" style="border-radius: 50%;" />

# NTE Flowboard

**每日 · 每周 · 每月任务追踪看板**

*多设备云端同步 · 拖拽排序 · 标签分类*

[**在线使用 →**](https://miponianyou.github.io/NTE-Flowboard/)

![License](https://img.shields.io/badge/License-MIT-green)
![Tests](https://img.shields.io/badge/Tests-396_passing-brightgreen)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

</div>

---

## 功能特性

<div align="center">

| 功能 | 说明 |
|:---:|:---|
| 每日/每周/每月清单 | 自动按服务器时区重置（含夏令时） |
| 拖拽排序 | dnd-kit 流畅拖拽体验 |
| 标签分类 | 10 种颜色标签，按序自动分配 |
| 云端同步 | Supabase Realtime 跨设备实时同步 |
| Liquid Glass 暗色主题 | 深色设计系统，玻璃态表面层 |
| 离线提示 | 断网时显示状态 |
| 无障碍支持 | WAI-ARIA 标签、焦点陷阱、键盘导航 |
| 单元测试 | 396 个测试用例覆盖核心逻辑 |

</div>

---

## 技术栈

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white)

![Supabase](https://img.shields.io/badge/Supabase-2.107-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-12.40-4F4F4F?style=flat&logo=motion&logoColor=white)
![dnd-kit](https://img.shields.io/badge/dnd--kit-6.3-FF6B6B?style=flat&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4.1-729B1B?style=flat&logo=vitest&logoColor=white)

</div>

---

## 快速开始

```bash
git clone https://github.com/MiPoNianYou/NTE-Flowboard.git
cd NTE-Flowboard
npm install
npm run dev
```

---

## 项目结构

```
src/
├── components/                # UI 组件
│   ├── base/                  # 基础组件（9 个）
│   ├── ChecklistItemRow/      # 清单项行（拖拽 + 编辑）
│   ├── settings/              # 设置页面（11 个）
│   └── ...                    # 业务组件
├── hooks/                     # 自定义 Hooks（19 个）
├── utils/                     # 工具函数（14 个）
├── types.ts                   # 共享类型定义
├── system.css                 # Liquid Glass 设计令牌
└── App.tsx                    # 根组件
```

---

## 开发命令

| 命令 | 说明 |
|:---|:---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本（含 lint + typecheck） |
| `npm run test` | 运行单元测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run lint:fix` | 自动修复 lint 问题 |
| `npm run format` | Prettier 代码格式化 |
| `npm run format:check` | 检查代码格式（CI 用） |

---

<div align="center">

**License:** MIT

</div>
