# TunnelFlow ⚡

[English](README.md) | [简体中文](docs/README.md)

> **Next-Generation Cross-Platform SSH Tunnel & Port Forwarding Manager**  
> *Designed for macOS, Windows, and Linux.*

[![Release](https://img.shields.io/github/v/release/your-repo/TunnelFlow?label=Release)](https://github.com/your-repo/TunnelFlow/releases)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](#)

---

## 🌟 Key Features

- **Multi-protocol SSH tunnels**: Supports Local forward (`-L`), Remote forward (`-R`), and Dynamic SOCKS5 (`-D`).
- **Modern UI**: Built with Tauri v2 + React 18 + Tailwind CSS + Radix UI + Lucide.
- **Bilingual i18n support**: English & 简体中文 instant UI toggle and native macOS application menu integration.
- **1D Vertical Drag-and-Drop Reordering**: Smooth drag & drop tunnel reordering with group hierarchy support.
- **System Tray integration & Compact Mini Mode**: Native tray menu and a compact 370x660 floating view.
- **Real-time traffic metrics & auto-reconnection**: Heartbeat checks, visual retry config, and exact process lifecycle management.

---

## 📸 UI Previews

### General
![General](docs/general.png)

### Connection
![Connection](docs/connection.png)

### Advanced
![Advanced](docs/advanced.png)

### Source Mode
![Source Mode](docs/source_mode.png)

### Mini Mode
![Mini Mode](docs/mini.png)

---

## 🛠️ Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Local development preview (Web mode)
pnpm dev
# Open http://localhost:1421 in your browser

# 3. Desktop mode development
pnpm tauri dev

# 4. Production build
pnpm tauri build
```
