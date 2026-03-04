#!/bin/bash
# WebRTC 视频通话应用一键部署脚本
# 适用于 Ubuntu 20.04/22.04/24.04

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 sudo 运行此脚本"
    exit 1
fi

# 获取用户输入
read -p "请输入域名或服务器IP (默认: 服务器IP): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$(curl -s ifconfig.me)
    print_info "使用服务器IP: $DOMAIN"
fi

read -p "是否使用 HTTPS? (y/n, 默认: n): " USE_HTTPS
USE_HTTPS=${USE_HTTPS:-n}

if [ "$USE_HTTPS" = "y" ] || [ "$USE_HTTPS" = "Y" ]; then
    read -p "请输入邮箱 (用于 SSL 证书): " EMAIL
    if [ -z "$EMAIL" ]; then
        print_error "使用 HTTPS 必须提供邮箱地址"
        exit 1
    fi
fi

# 配置变量
APP_DIR="/var/www/livestream"
SERVER_PORT=3001
GITHUB_REPO="https://github.com/tly580474-cmyk/livestream.git"

print_info "开始部署 WebRTC 视频通话应用..."
print_info "域名/IP: $DOMAIN"
print_info "应用目录: $APP_DIR"

# ============================================
# 第1步: 更新系统
# ============================================
print_info "[1/10] 更新系统..."
apt update && apt upgrade -y

# ============================================
# 第2步: 安装依赖
# ============================================
print_info "[2/10] 安装系统依赖..."
apt install -y curl git nginx software-properties-common

# 安装 Node.js 20.x LTS (Vite 需要 20.19+ 或 22.12+)
print_info "安装/更新 Node.js 20.x LTS..."
# 卸载旧版本
apt remove -y nodejs libnode-dev 2>/dev/null || true
rm -rf /etc/apt/sources.list.d/nodesource.list
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证 Node.js 版本
NODE_VERSION=$(node -v)
print_success "Node.js 版本: $NODE_VERSION"

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
    print_info "安装 PM2..."
    npm install -g pm2
fi

# ============================================
# 第3步: 克隆/更新代码
# ============================================
print_info "[3/10] 准备应用代码..."

# 配置 Git 安全目录（避免权限问题）
git config --global --add safe.directory $APP_DIR 2>/dev/null || true

if [ -d "$APP_DIR/.git" ]; then
    print_warning "目录已存在，更新代码..."
    cd $APP_DIR
    # 重置本地修改并拉取最新代码
    git reset --hard HEAD
    git pull origin main
else
    print_info "克隆代码仓库..."
    rm -rf $APP_DIR
    git clone $GITHUB_REPO $APP_DIR
    cd $APP_DIR
fi

# 设置权限
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# ============================================
# 第4步: 安装后端依赖
# ============================================
print_info "[4/10] 安装后端依赖..."
cd $APP_DIR/server
npm install --production

# ============================================
# 第5步: 构建前端
# ============================================
print_info "[5/10] 构建前端..."
cd $APP_DIR/client

# 清理旧的依赖（避免 Node 版本不兼容问题）
print_info "清理旧的 node_modules..."
rm -rf node_modules package-lock.json

# 创建生产环境配置
cat > .env.production << EOF
VITE_SOCKET_URL=http${USE_HTTPS:+s}://$DOMAIN
EOF

# 重新安装依赖
print_info "安装前端依赖..."
npm install

# 构建
print_info "构建前端..."
npm run build

# 检查构建结果
if [ ! -d "$APP_DIR/client/dist" ]; then
    print_error "前端构建失败，dist 目录不存在"
    exit 1
fi

print_success "前端构建完成"

# ============================================
# 第6步: 配置 Nginx
# ============================================
print_info "[6/10] 配置 Nginx..."

# 创建 Nginx 配置文件
if [ "$USE_HTTPS" = "y" ] || [ "$USE_HTTPS" = "Y" ]; then
    # HTTPS 配置
    cat > /etc/nginx/sites-available/livestream << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend static files
    root /var/www/livestream/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy WebSocket and HTTP to Node.js signaling server
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }
}
EOF
    # 替换域名占位符
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/livestream
else
    # HTTP 配置
    cat > /etc/nginx/sites-available/livestream << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend static files
    root /var/www/livestream/client/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy WebSocket and HTTP to Node.js signaling server
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
    }
}
EOF
fi

# 启用配置
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/livestream
ln -s /etc/nginx/sites-available/livestream /etc/nginx/sites-enabled/livestream

# 测试配置
nginx -t

# ============================================
# 第7步: 申请 SSL 证书 (如果需要)
# ============================================
if [ "$USE_HTTPS" = "y" ] || [ "$USE_HTTPS" = "Y" ]; then
    print_info "[7/10] 申请 SSL 证书..."
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL
    print_success "SSL 证书申请完成"
else
    print_info "[7/10] 跳过 SSL 证书申请 (使用 HTTP)"
fi

# ============================================
# 第8步: 配置防火墙
# ============================================
print_info "[8/10] 配置防火墙..."

# 检查 UFW 是否安装
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    if [ "$USE_HTTPS" = "y" ] || [ "$USE_HTTPS" = "Y" ]; then
        ufw allow 443/tcp comment 'HTTPS'
    fi
    
    # 如果防火墙未启用，询问是否启用
    if ! ufw status | grep -q "Status: active"; then
        print_warning "防火墙未启用"
        read -p "是否启用防火墙? (y/n, 默认: y): " ENABLE_UFW
        ENABLE_UFW=${ENABLE_UFW:-y}
        if [ "$ENABLE_UFW" = "y" ] || [ "$ENABLE_UFW" = "Y" ]; then
            ufw --force enable
            print_success "防火墙已启用"
        fi
    fi
else
    print_warning "UFW 未安装，跳过防火墙配置"
fi

# ============================================
# 第9步: 启动后端服务
# ============================================
print_info "[9/10] 启动后端服务..."
cd $APP_DIR

# 停止现有 PM2 进程
pm2 delete livestream-server 2>/dev/null || true

# 启动服务
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup systemd -u root --hp /root

# ============================================
# 第10步: 启动 Nginx
# ============================================
print_info "[10/10] 启动 Nginx..."
systemctl restart nginx
systemctl enable nginx

# ============================================
# 验证部署
# ============================================
print_info "验证部署..."

# 等待服务启动
sleep 2

# 检查后端健康状态
if curl -s http://localhost:3001/health | grep -q "ok"; then
    print_success "后端服务运行正常"
else
    print_warning "后端服务可能未正常运行，请检查日志"
fi

# 检查 Nginx 状态
if systemctl is-active --quiet nginx; then
    print_success "Nginx 运行正常"
else
    print_error "Nginx 未正常运行"
    systemctl status nginx --no-pager
fi

# ============================================
# 部署完成
# ============================================
echo ""
echo "========================================"
print_success "部署完成！"
echo "========================================"
echo ""
echo -e "访问地址: ${GREEN}http${USE_HTTPS:+s}://$DOMAIN${NC}"
echo ""
echo "常用命令:"
echo "  查看后端日志: pm2 logs livestream-server"
echo "  重启后端: pm2 restart livestream-server"
echo "  查看 Nginx 日志: tail -f /var/log/nginx/access.log"
echo "  查看错误日志: tail -f /var/log/nginx/error.log"
echo ""
echo "项目目录: $APP_DIR"
echo "========================================"
