# 视频通话 - WebRTC P2P

> ⚠️ **推荐环境**: 最好在**局域网**或者能够访问**谷歌**的网络环境下使用

基于 WebRTC 的网页版视频对话软件，实现浏览器间 P2P 视频通话，服务器仅转发信令。

## 技术栈

| 层       | 技术                                    |
|----------|---------------------------------------|
| 前端     | React 19 + TypeScript + Vite + Tailwind CSS |
| 通信     | WebRTC (P2P) + Socket.io Client       |
| 后端     | Node.js + Express + Socket.io Server  |
| 部署     | Nginx (反向代理) + PM2 (进程管理)       |

## 本地开发

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 启动后端信令服务器

```bash
cd server
npm run dev
# 服务器运行在 http://localhost:3001
```

### 3. 启动前端开发服务器（新终端）

```bash
cd client
npm run dev
# 前端运行在 http://localhost:5173
```

打开两个浏览器窗口访问 `http://localhost:5173`，一个创建房间，另一个加入即可测试视频通话。

## 使用流程

1. **用户 A**：点击「创建新房间」，获得 6 位房间号并分享给对方
2. **用户 B**：输入房间号，点击「加入」
3. 双方自动建立 WebRTC P2P 连接，开始视频通话
4. 支持静音/关闭摄像头/挂断操作

## 生产部署（Ubuntu）

### 环境准备

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
```

### 部署步骤

```bash
# 1. 克隆代码到服务器
git clone <repo> /var/www/livestream
cd /var/www/livestream

# 2. 安装后端依赖
cd server && npm install --production && cd ..

# 3. 构建前端
cd client && npm install && npm run build && cd ..

# 4. 配置 Nginx（将 nginx.conf 复制到 /etc/nginx/sites-available/）
sudo cp nginx.conf /etc/nginx/sites-available/livestream
sudo ln -s /etc/nginx/sites-available/livestream /etc/nginx/sites-enabled/
# 修改 nginx.conf 中的 your-domain.com 为实际域名
sudo nginx -t && sudo systemctl reload nginx

# 5. 申请 SSL 证书（Let's Encrypt）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 6. 启动后端服务
npm2 start ecosystem.config.js
npm2 save
npm2 startup
```

## 项目结构

```
livestream/
├── client/                   # 前端 React 应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── HomePage.tsx      # 首页（创建/加入房间）
│   │   │   ├── WaitingRoom.tsx   # 等待页（显示房间号）
│   │   │   └── VideoCall.tsx     # 通话页（视频 + 控制栏）
│   │   ├── hooks/
│   │   │   └── useVideoCall.ts   # 核心业务逻辑 hook
│   │   ├── services/
│   │   │   ├── socketService.ts  # Socket.io 封装
│   │   │   └── webrtcService.ts  # WebRTC 封装
│   │   └── App.tsx
│   └── vite.config.ts
├── server/                   # 后端信令服务器
│   └── src/
│       ├── index.js              # Express + Socket.io 入口
│       └── services/
│           └── roomService.js    # 房间状态管理
├── ecosystem.config.js       # PM2 配置
├── nginx.conf                # Nginx 反向代理配置
└── 需求文档.md
```

## 环境变量

前端可通过 `.env` 文件配置：

```env
# client/.env.production
VITE_SOCKET_URL=https://your-domain.com
```

开发环境下无需配置（Vite 代理自动转发到 localhost:3001）。
