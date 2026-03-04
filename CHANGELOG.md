# 更新日志 (Changelog)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-03-04

### Added
- **多 STUN 服务器支持**
  - Google 公共 STUN (5个): stun.l.google.com - stun4.l.google.com:19302
  - Linphone: stun.linphone.org:3478
  - PJSIP: stun.pjsip.org:3478
  - FreeSWITCH: stun.freeswitch.org:3478
  - Twilio: stun.twilio.com:3478

### Added
- **心跳保活机制 (P1)**
  - 30秒间隔心跳包保持 NAT 映射
  - 双向心跳 (主叫/被叫都发送)
  - DataChannel 实现低开销 keepalive

### Added
- **IPv6 支持 (P3)**
  - 自动检测本地 IPv6 连通性
  - IPv6 可用时自动添加 IPv6 STUN 服务器

### Added
- **多端口打洞 (P4)**
  - ICE candidate pool size 预分配 10 个端口
  - 增加 NAT 映射命中概率

### Improved
- 网络穿透改进方案文档 (`docs/NETWORK_IMPROVEMENT.md`)
  - 更新实现状态
  - 添加 STUN 服务器配置说明

---

## [1.2.0] - 2026-03-04

### Added
- 网络穿透改进方案文档 (`docs/NETWORK_IMPROVEMENT.md`)
  - 问题确认清单
  - 改进方案详解
  - 实施优先级建议
  - 技术细节说明

### Known Issues
- **跨网络连接问题**: 不同 NAT 环境下的 P2P 连接失败
  - 当前仅配置 Google 公共 STUN 服务器
  - 未配置 TURN 中继服务器
  - 未实现 IPv6 支持
  - 未实现多端口打洞
  - 未实现心跳保活

### Improvement Roadmap
| 优先级 | 改进项 | 难度 | 收益 |
|--------|--------|------|------|
| P0 | 响应式布局 | 低 | 高 |
| P1 | 心跳保活 | 中 | 高 |
| P2 | TURN 中继服务器 | 中 | 高 |
| P3 | IPv6 支持 | 低 | 中 |
| P4 | 多端口打洞 | 高 | 中 |

---

## [1.1.0] - 2026-03-04

### Added
- 一键部署脚本 (`deploy.sh`) - 支持 Ubuntu 20.04/22.04/24.04
  - 自动安装 Node.js 20.x LTS
  - 自动配置 Nginx (HTTP/HTTPS)
  - 自动申请 Let's Encrypt SSL 证书
  - 自动配置防火墙 (UFW)
  - 支持代码自动更新部署

### Improved
- 视频通话页面响应式布局优化
  - 移动端适配 (320px - 2560px)
  - 动态视口高度 `min-h-[100dvh]`
  - 本地视频小窗尺寸响应式变化 (80px → 144px)
  - 控制按钮尺寸自适应 (40px → 48px)
  - 触摸反馈优化 (`active:scale-95`)
  - iPhone 刘海屏安全区域适配
  - 禁用页面回弹滚动
  - 远程视频改为 `object-contain` 保持比例

### Fixed
- 修复前端构建问题 (Node.js 版本兼容)
- 修复 Git 权限问题

---

## [1.0.0] - 2026-03-03

### Added
- 初始版本发布
- WebRTC P2P 视频通话功能
- 房间创建与加入系统
- Socket.io 信令服务器
- 音视频开关控制
- 挂断功能
- 本地预览 (PiP 模式)
- 等待房间界面
- Nginx 配置模板
- PM2 进程管理配置

### Features
- 使用 STUN 服务器进行 NAT 穿透
- 房间状态实时显示
- 连接状态监听与显示
- 媒体设备权限管理

---

## 技术栈

- **前端**: React 19 + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + Socket.io
- **部署**: PM2 + Nginx
- **协议**: WebRTC + STUN

---

## 项目结构

```
livestream/
├── client/                 # 前端 React 应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   └── services/      # WebRTC/Socket 服务
│   └── dist/              # 构建输出
├── server/                 # 后端 Node.js 服务
│   └── src/
│       ├── index.js       # 服务入口
│       └── services/      # 房间管理服务
├── docs/                   # 项目文档
│   └── NETWORK_IMPROVEMENT.md
├── deploy.sh              # 一键部署脚本
├── ecosystem.config.js    # PM2 配置
└── nginx.conf             # Nginx 配置模板
```

---

## 如何更新

```bash
# 克隆最新代码
git pull

# 重新构建前端
cd client && npm run build

# 重启后端服务
pm2 restart livestream-server
```

或者使用一键部署脚本自动更新：

```bash
sudo ./deploy.sh
```

---

## License

MIT
