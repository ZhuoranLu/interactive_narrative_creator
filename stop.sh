#!/bin/bash

# Interactive Narrative Creator - 停止服务脚本

echo "🛑 停止 Interactive Narrative Creator"
echo "===================================="

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 停止前后端进程
echo -e "${BLUE}📱 停止前后端服务...${NC}"

# 停止 FastAPI 进程
pkill -f "uvicorn.*app.main:app" 2>/dev/null && echo -e "${GREEN}✅ 后端服务已停止${NC}" || echo "没有找到运行中的后端进程"

# 停止 Vite 进程
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✅ 前端服务已停止${NC}" || echo "没有找到运行中的前端进程"

# 停止 Node.js 进程（包括 concurrently）
pkill -f "concurrently" 2>/dev/null && echo -e "${GREEN}✅ concurrently 已停止${NC}" || echo "没有找到运行中的 concurrently 进程"

# 询问是否停止数据库
echo ""
echo -e "${YELLOW}🗄️  数据库服务${NC}"
read -p "是否也要停止数据库服务? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🗄️ 停止数据库服务...${NC}"
    
    # 停止 Docker PostgreSQL
    if docker ps | grep -q "narrative_creator_db"; then
        echo -e "${BLUE}🐳 停止 Docker PostgreSQL...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Docker PostgreSQL 已停止${NC}"
    fi
    
    # 检查本地 PostgreSQL
    if command -v brew &> /dev/null && brew services list | grep -q "postgresql.*started"; then
        echo -e "${YELLOW}📱 发现本地 PostgreSQL 正在运行${NC}"
        read -p "是否停止本地 PostgreSQL? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            brew services stop postgresql
            echo -e "${GREEN}✅ 本地 PostgreSQL 已停止${NC}"
        else
            echo -e "${BLUE}ℹ️  本地 PostgreSQL 保持运行状态${NC}"
        fi
    fi
else
    echo -e "${BLUE}ℹ️  数据库服务保持运行状态${NC}"
fi

echo ""
echo -e "${GREEN}✅ 服务停止完成${NC}" 