@echo off
chcp 65001 >nul
title WebRTC 视频通话 - 开发环境

echo ================================================
echo   WebRTC 视频通话 - 一键启动开发环境
echo ================================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 14+
    pause
    exit /b 1
)

:: 检查并安装后端依赖
echo [1/3] 检查后端依赖...
if not exist "server\node_modules" (
    echo      安装后端依赖中...
    cd server
    npm install
    cd ..
)
echo      后端依赖 OK

:: 检查并安装前端依赖
echo [2/3] 检查前端依赖...
if not exist "client\node_modules" (
    echo      安装前端依赖中...
    cd client
    npm install
    cd ..
)
echo      前端依赖 OK

:: 启动后端服务器（新窗口）
echo [3/3] 启动服务...
echo.
start "信令服务器 :3001" cmd /k "chcp 65001 >nul && title 信令服务器 ^| port 3001 && cd /d %~dp0server && node src/index.js"

:: 等待后端启动
timeout /t 2 /nobreak >nul

:: 启动前端开发服务器（新窗口）
start "前端开发服务器 :5173" cmd /k "chcp 65001 >nul && title 前端开发服务器 ^| port 5173 && cd /d %~dp0client && npm run dev"

:: 等待前端启动
timeout /t 3 /nobreak >nul
