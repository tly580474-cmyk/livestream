#!/bin/bash

# WebRTC 视频通话 - 一键启动开发环境 (Linux/macOS)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}   WebRTC 视频通话 - 一键启动开发环境${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未找到 Node.js，请先安装 Node.js 14+${NC}"
    exit 1
fi

# 检查并安装后端依赖
echo -e "${YELLOW}[1/3] 检查后端依赖...${NC}"
if [ ! -d "$SCRIPT_DIR/server/node_modules" ]; then
    echo "     安装后端依赖中..."
    cd "$SCRIPT_DIR/server" && npm install
fi
echo -e "${GREEN}     后端依赖 OK${NC}"

# 检查并安装前端依赖
echo -e "${YELLOW}[2/3] 检查前端依赖...${NC}"
if [ ! -d "$SCRIPT_DIR/client/node_modules" ]; then
    echo "     安装前端依赖中..."
    cd "$SCRIPT_DIR/client" && npm install
fi
echo -e "${GREEN}     前端依赖 OK${NC}"

echo -e "${YELLOW}[3/3] 启动服务...${NC}"
echo ""

# 启动后端（后台）
cd "$SCRIPT_DIR/server"
node src/index.js &
SERVER_PID=$!
echo -e "${GREEN}     信令服务器已启动 (PID: $SERVER_PID) → http://localhost:3001${NC}"

# 等待后端启动
sleep 1
