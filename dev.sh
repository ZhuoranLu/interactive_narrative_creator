#!/bin/bash

# Interactive Narrative Creator - 开发环境启动脚本
# 一键启动完整的开发环境

set -e

echo "🚀 Interactive Narrative Creator - 开发环境"
echo "============================================="

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查必要的依赖
echo -e "${BLUE}📋 检查系统依赖...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 未安装${NC}"
    exit 1
fi

# 检查 PostgreSQL 状态
echo -e "${BLUE}🗄️  检查数据库状态...${NC}"

DB_RUNNING=false

# 检查本地 PostgreSQL
if command -v brew &> /dev/null && brew services list | grep -q "postgresql.*started"; then
    echo -e "${GREEN}✅ 本地 PostgreSQL 正在运行${NC}"
    DB_RUNNING=true
# 检查 Docker PostgreSQL
elif command -v docker &> /dev/null && docker ps | grep -q "narrative_creator_db"; then
    echo -e "${GREEN}✅ Docker PostgreSQL 正在运行${NC}"
    DB_RUNNING=true
fi

# 如果数据库没有运行，尝试启动
if [ "$DB_RUNNING" = false ]; then
    echo -e "${YELLOW}🔧 数据库未运行，尝试启动...${NC}"
    
    # 优先尝试 Docker
    if command -v docker &> /dev/null; then
        echo -e "${BLUE}🐳 启动 Docker PostgreSQL...${NC}"
        docker-compose up -d db
        echo -e "${YELLOW}⏳ 等待 PostgreSQL 启动...${NC}"
        sleep 8
        DB_RUNNING=true
    # 备选：本地 PostgreSQL
    elif command -v brew &> /dev/null && brew services list | grep -q "postgresql"; then
        echo -e "${BLUE}📱 启动本地 PostgreSQL...${NC}"
        brew services start postgresql
        sleep 3
        DB_RUNNING=true
    else
        echo -e "${RED}❌ 找不到 PostgreSQL 或 Docker${NC}"
        echo "请运行以下命令之一："
        echo "1. 安装 Docker 并运行: docker-compose up -d db"
        echo "2. 安装 PostgreSQL: brew install postgresql"
        exit 1
    fi
fi

# 测试数据库连接
echo -e "${BLUE}🔍 测试数据库连接...${NC}"
cd server

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 创建 Python 虚拟环境...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate

# 安装后端依赖
if [ ! -f "venv/.deps_installed" ]; then
    echo -e "${BLUE}📦 安装后端依赖...${NC}"
    pip install -r app/requirements.txt 2>/dev/null || echo "app/requirements.txt 不存在，跳过依赖安装"
    touch venv/.deps_installed
fi

# 测试数据库连接
if python -c "
from app.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('✅ 数据库连接成功')
except Exception as e:
    print(f'❌ 数据库连接失败: {e}')
    exit(1)
" 2>/dev/null; then
    echo -e "${GREEN}✅ 数据库连接成功${NC}"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
    echo "请检查数据库配置或运行初始化脚本"
    exit 1
fi

# 检查并创建测试用户
echo -e "${BLUE}👤 检查测试用户...${NC}"
if python -c "
from app.database import SessionLocal
from app.user_repositories import UserRepository
try:
    db = SessionLocal()
    user_repo = UserRepository(db)
    demo_user = user_repo.get_user_by_username('demo_user')
    if demo_user:
        print('✅ 测试用户已存在')
    else:
        print('❌ 测试用户不存在')
        exit(1)
    db.close()
except Exception as e:
    print('❌ 检查用户失败')
    exit(1)
" 2>/dev/null; then
    echo -e "${GREEN}✅ 测试用户可用${NC}"
else
    echo -e "${YELLOW}📝 创建测试用户...${NC}"
    if python -c "
from app.init_db import create_sample_data
try:
    create_sample_data()
    print('✅ 测试用户创建成功')
except Exception as e:
    print(f'❌ 创建用户失败: {e}')
    exit(1)
" 2>/dev/null; then
        echo -e "${GREEN}✅ 测试用户创建完成${NC}"
        echo -e "${BLUE}🔑 登录凭据:${NC}"
        echo -e "   ${YELLOW}Demo用户${NC}: demo_user / demo123"
        echo -e "   ${YELLOW}Admin用户${NC}: admin / admin123"
    else
        echo -e "${RED}❌ 用户创建失败${NC}"
        echo "继续启动服务，但可能需要手动创建用户"
    fi
fi

echo -e "${GREEN}🎉 数据库准备就绪！${NC}"

cd ..

# 检查前端依赖
echo -e "${BLUE}📦 检查前端依赖...${NC}"
cd interactive_narrative

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 安装前端依赖...${NC}"
    npm install
fi

cd ..

# 检查是否安装了 concurrently
if ! command -v concurrently &> /dev/null; then
    echo -e "${YELLOW}⚡ 安装 concurrently 以便同时运行前后端...${NC}"
    npm install -g concurrently
fi

# 启动应用
echo ""
echo -e "${GREEN}🌟 启动开发环境...${NC}"
echo -e "${BLUE}📍 后端 API: http://localhost:8000${NC}"
echo -e "${BLUE}📖 API 文档: http://localhost:8000/docs${NC}"
echo -e "${BLUE}📍 前端应用: http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}🛑 按 Ctrl+C 停止所有服务${NC}"
echo ""

# 同时启动前后端
concurrently \
    --prefix-colors "green,blue" \
    --prefix "[{name}]" \
    --names "backend,frontend" \
    --kill-others \
    "cd server && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" \
    "cd interactive_narrative && npm run dev -- --host 0.0.0.0" 