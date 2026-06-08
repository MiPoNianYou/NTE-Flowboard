<div align="center">

<img src="src/assets/Nanally.png" width="200" style="border-radius: 50%;" />

# NTE Flowboard

**每日与每周事项追踪看板**

*多设备云端同步 · 拖拽排序 · 标签分类*

[**在线使用 →**](https://miponianyou.github.io/NTE-Flowboard/)

</div>

---

## 功能特性

<div align="center">

| 核心功能 | 说明 |
|:--------:|:-----|
| 📋 **每日/每周清单** | 自动按服务器时区重置（含夏令时） |
| 🎯 **拖拽排序** | 流畅的拖拽体验 |
| 🏷️ **标签分类** | 16 种颜色标签，按序自动分配 |
| 🌙 **Halo 暗色主题** | 深色设计系统，三级表面层深度 |
| 📐 **布局切换** | 单列 / 双列（桌面端） |
| ☁️ **云端同步** | Supabase Realtime 跨设备实时同步 |
| 📜 **虚拟滚动** | 超过 50 项自动启用 |
| 📡 **离线提示** | 断网时显示状态 |
| ♿ **无障碍支持** | WAI-ARIA 标签、焦点陷阱、键盘导航 |
| 🧪 **单元测试** | 88 个测试用例覆盖核心逻辑 |

</div>

---

## 技术栈

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=flat&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.107-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-12.40-4F4F4F?style=flat&logo=motion&logoColor=white)
![dnd-kit](https://img.shields.io/badge/dnd--kit-6.3-FF6B6B?style=flat&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4.1-729B1B?style=flat&logo=vitest&logoColor=white)

</div>

---

## 快速开始

```bash
# 克隆项目
git clone https://github.com/MiPoNianYou/NTE-Flowboard.git
cd NTE-Flowboard

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 项目结构

```
src/
├── components/            # UI 组件
│   ├── base/              # 基础组件层（11 个）
│   │   ├── Button         # 按钮（9 种变体）
│   │   ├── Card           # 卡片容器
│   │   ├── Input          # 输入框
│   │   ├── Badge          # 徽章
│   │   ├── ToggleSwitch   # 开关
│   │   ├── SettingRow     # 设置行
│   │   ├── CollapsibleSection  # 可折叠区块
│   │   ├── NavBar         # 导航栏
│   │   ├── IconBox        # 图标容器
│   │   ├── StatusMessage  # 状态消息
│   │   └── ErrorMessage   # 错误消息
│   ├── Header             # 顶部栏（含设置面板）
│   ├── ChecklistPanel     # 清单面板
│   ├── ChecklistItemRow   # 清单项行（拖拽 + 编辑）
│   ├── SettingsContent    # 设置内容（侧边栏 + 内容区）
│   ├── CloudSyncSection   # 云同步配置
│   ├── ProgressCard       # 进度卡片
│   ├── ProgressRing       # 环形进度条
│   ├── Counter            # 数字动画组件
│   ├── TabSwitch          # 标签切换
│   ├── TagPill            # 标签胶囊
│   ├── TagInput           # 标签输入
│   ├── ConfirmDialog      # 确认对话框
│   ├── EmptyState         # 空状态插画
│   └── HiddenSection      # 隐藏事项区
├── hooks/                 # 自定义 Hooks（11 个）
│   ├── useChecklist       # 清单数据管理
│   ├── useSupabaseSync   # 云端同步
│   ├── useSettings        # 行为设置
│   ├── usePendingDelete   # 删除确认状态
│   ├── useTabManagement   # 标签页管理
│   ├── useLayoutManagement # 布局管理
│   ├── useItemAnimation   # 新增项动画
│   ├── useNextResetLabel  # 下次重置时间
│   ├── useSortedItems     # 排序逻辑
│   └── useAutoMoveCompleted # 自动移动已完成项
├── utils/                 # 工具函数
│   ├── storage            # 本地存储 + 数据验证
│   ├── supabase           # Supabase 客户端 + RPC
│   ├── constants          # 常量定义
│   ├── cn                 # className 合并工具
│   ├── tagColors          # 标签颜色计算
│   └── styles             # 卡片样式常量
├── types.ts               # 共享类型定义
├── index.css              # Halo 设计系统 Token
└── App.tsx                # 根组件（编排 8 个 Hook）
```

---

## 开发命令

| 命令 | 说明 |
|:-----|:-----|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本（含 lint + typecheck） |
| `npm run test` | 运行单元测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run lint:fix` | 自动修复 lint 问题 |
| `npm run format` | Prettier 代码格式化 |

---

<div align="center">

**License:** MIT

</div>
