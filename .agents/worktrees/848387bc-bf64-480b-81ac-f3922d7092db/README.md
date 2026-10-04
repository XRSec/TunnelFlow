# TunnelFlow ⚡

> **Next-Generation Cross-Platform SSH Tunnel & Port Forwarding Manager**  
> *Designed for macOS, Windows, and Linux.*

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)

---

## 🌟 核心亮点 (Key Features)

- 🚀 **极轻量原生体验**：安装包仅约 **8MB**，空闲内存占用仅 **~35MB**（相比 Electron 节省 80%+ 内存）。
- 🔄 **无损同步 `~/.ssh/config`**：Rust 原生无损语法解析器，严格保留现有配置文件中的所有自定义注释（`# ...`）、缩进格式与未知指令。
- 🛡️ **全模式端口转发**：
  - **动态端口转发 (Dynamic, `-D`)**：一键生成本地 SOCKS5 代理。
  - **本地端口转发 (Local, `-L`)**：将本地流量穿透转发到远端内网服务。
  - **远程端口转发 (Remote, `-R`)**：公网反向代理 / 内网穿透到本地端口。
- ⚡ **连接弹性与保活 (Resilience)**：心跳探测间隔 (`ServerAliveInterval`)、最大重试次数 (`ServerAliveCountMax`)、连接超时 (`ConnectTimeout`) 视觉化配置。
- 🔑 **无缝密钥发现**：原生动态检索 `~/.ssh/` 密钥与证书，无需导入私钥。
- 📦 **连接多路复用 (Multiplexing)**：全面支持 `ControlMaster`、`ControlPersist` 与 `ControlPath` 套接字复用。
- 📋 **一键剪贴板导入**：任意复制类似 `ssh -N -L 127.0.0.1:8080:10.0.0.1:80 root@vps` 的命令行，TunnelFlow 自动解析为结构化配置。
- 💻 **真正跨平台**：
  - **macOS**：原生 Overlay 磨砂标题栏与窗口控制。
  - **Windows**：原生 WebView2 驱动，兼容 Windows 10/11 OpenSSH。
  - **Linux**：GTK3 WebKit 渲染，支持主流发行版（Ubuntu / Debian / Fedora / Arch）。

---

## 🛠️ 技术架构 (Architecture)

```text
TunnelFlow/
├── src/                        # 前端 (React 19 + TypeScript + Tailwind v4 + Lucide)
│   ├── components/
│   │   ├── ui/                 # 现代化组件 (Card, Field, Button, Input, Select, Toggle, Badge)
│   │   ├── tabs/
│   │   │   ├── GeneralTab.tsx  # 主机配置 & 端口转发管理
│   │   │   ├── ConnectionTab.tsx# 弹性保活 / 认证密钥 / 多路复用 (严格双列布局)
│   │   │   └── AdvancedTab.tsx # 自定义指令扩展 & SSH Config 原文预览
│   │   ├── Sidebar.tsx         # 隧道列表 / 分组折叠 / 实时状态 / 搜索
│   │   ├── TunnelHeader.tsx    # 连接状态 / 一键开关 / SSH 命令行预览
│   │   ├── KeysModal.tsx       # SSH 密钥库弹窗
│   │   └── ImportCommandModal.tsx # SSH 命令行解析导入器
│   ├── services/
│   │   └── api.ts              # Tauri IPC 命令调用与 Mock 降级
│   ├── types/
│   │   └── tunnel.ts           # 核心领域模型与状态定义
│   └── App.tsx                 # 主工作台根组件
│
└── src-tauri/                  # 后端 (Rust + Tauri v2)
    ├── src/
    │   ├── models.rs           # 跨语言类型定义与序列化
    │   ├── ssh_config.rs       # 无损 ~/.ssh/config 读写解析器
    │   ├── process_manager.rs  # SSH 后台进程生命周期管理 (启动 / 守护 / 回收)
    │   ├── key_manager.rs      # ~/.ssh/ 私钥与证书扫描器
    │   ├── commands.rs         # Tauri IPC 暴露指令
    │   └── lib.rs              # 应用程序主配置与初始化
    ├── Cargo.toml
    └── tauri.conf.json
```

---

## 🚀 快速上手 (Quick Start)

### 1. 安装依赖

```bash
cd /Users/xr/IDEA.localized/TunnelFlow
pnpm install
```

### 2. 本地开发预览 (Web 模式)

```bash
pnpm dev
# 浏览器访问 http://localhost:1420
```

### 3. 本地开发运行 (桌面端模式)

```bash
pnpm tauri dev
```

### 4. 生产构建打包

```bash
pnpm tauri build
```
生成产物位于 `src-tauri/target/release/bundle/`:
- **macOS**: `.dmg` (Universal binary 支持 Intel / Apple Silicon)
- **Windows**: `.msi` / `.exe`
- **Linux**: `.AppImage` / `.deb`
