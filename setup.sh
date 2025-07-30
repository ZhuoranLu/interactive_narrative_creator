#!/bin/bash

# Interactive Narrative Creator - 项目初始化脚本
# 首次设置完整的开发环境

set -e

echo "🔧 Interactive Narrative Creator - 项目初始化"
echo "=============================================="

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查系统要求
echo -e "${BLUE}📋 检查系统要求...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请安装 Node.js: https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 未安装${NC}"
    exit 1
else
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ ${PYTHON_VERSION}${NC}"
fi

# 检查 Docker (推荐)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker 已安装${NC}"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  Docker 未安装 (推荐安装用于数据库)${NC}"
    DOCKER_AVAILABLE=false
fi

# 检查 PostgreSQL
if command -v brew &> /dev/null && brew services list | grep -q "postgresql"; then
    echo -e "${GREEN}✅ 本地 PostgreSQL 可用${NC}"
    LOCAL_POSTGRES_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  本地 PostgreSQL 未安装${NC}"
    LOCAL_POSTGRES_AVAILABLE=false
fi

# 如果 Docker 和本地 PostgreSQL 都不可用，提示安装
if [ "$DOCKER_AVAILABLE" = false ] && [ "$LOCAL_POSTGRES_AVAILABLE" = false ]; then
    echo -e "${RED}❌ 需要数据库支持${NC}"
    echo "请选择以下方式之一："
    echo "1. 安装 Docker: https://www.docker.com/get-started"
    echo "2. 安装 PostgreSQL: brew install postgresql"
    exit 1
fi

# 设置后端环境
echo -e "${BLUE}🐍 设置后端环境...${NC}"
cd server

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo -e "${BLUE}📦 创建 Python 虚拟环境...${NC}"
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo -e "${BLUE}📦 安装后端依赖...${NC}"
if [ -f "app/requirements.txt" ]; then
    pip install -r app/requirements.txt
    touch venv/.deps_installed
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
else
    echo -e "${YELLOW}⚠️  app/requirements.txt 未找到${NC}"
fi

cd ..

# 设置前端环境
echo -e "${BLUE}⚛️  设置前端环境...${NC}"
cd interactive_narrative

# 安装前端依赖
if [ -f "package.json" ]; then
    echo -e "${BLUE}📦 安装前端依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
else
    echo -e "${RED}❌ package.json 未找到${NC}"
    exit 1
fi

cd ..

# 安装全局工具
echo -e "${BLUE}🛠️  安装全局工具...${NC}"
if ! command -v concurrently &> /dev/null; then
    npm install -g concurrently
    echo -e "${GREEN}✅ concurrently 安装完成${NC}"
fi

# 设置数据库
echo -e "${BLUE}🗄️  设置数据库...${NC}"

DB_SETUP_SUCCESS=false

# 优先使用 Docker
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${BLUE}🐳 启动 Docker PostgreSQL...${NC}"
    docker-compose up -d db
    echo -e "${YELLOW}⏳ 等待 PostgreSQL 启动...${NC}"
    sleep 10
    
    # 测试连接
    cd server
    source venv/bin/activate
    if python -c "
from app.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('✅ Docker PostgreSQL 连接成功')
except Exception as e:
    print(f'❌ 连接失败: {e}')
    exit(1)
" 2>/dev/null; then
        DB_SETUP_SUCCESS=true
        echo -e "${GREEN}✅ Docker PostgreSQL 设置完成${NC}"
    fi
    cd ..
fi

# 如果 Docker 失败，尝试本地 PostgreSQL
if [ "$DB_SETUP_SUCCESS" = false ] && [ "$LOCAL_POSTGRES_AVAILABLE" = true ]; then
    echo -e "${BLUE}📱 启动本地 PostgreSQL...${NC}"
    brew services start postgresql
    sleep 3
    
    cd server
    source venv/bin/activate
    if python -c "
from app.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('✅ 本地 PostgreSQL 连接成功')
except Exception as e:
    print(f'❌ 连接失败: {e}')
    exit(1)
" 2>/dev/null; then
        DB_SETUP_SUCCESS=true
        echo -e "${GREEN}✅ 本地 PostgreSQL 设置完成${NC}"
    fi
    cd ..
fi

if [ "$DB_SETUP_SUCCESS" = false ]; then
    echo -e "${RED}❌ 数据库设置失败${NC}"
    echo "请手动检查数据库配置"
    exit 1
fi

# 初始化数据库（如果有初始化脚本）
echo -e "${BLUE}🔧 初始化数据库...${NC}"
cd server
source venv/bin/activate

if [ -f "app/init_db.py" ]; then
    echo -e "${BLUE}📊 运行数据库初始化...${NC}"
    python app/init_db.py init
    python app/init_db.py sample
    echo -e "${GREEN}✅ 数据库初始化完成${NC}"
fi

cd ..

# 导入示例数据（如果存在）
if [ -f "import_example_stories.py" ]; then
    echo -e "${BLUE}📚 导入示例故事...${NC}"
    python import_example_stories.py
    echo -e "${GREEN}✅ 示例数据导入完成${NC}"
fi

# 修复数据（如果存在修复脚本）
if [ -f "fix_action_bindings.py" ]; then
    echo -e "${BLUE}🔧 修复 action bindings...${NC}"
    python fix_action_bindings.py
    echo -e "${GREEN}✅ 数据修复完成${NC}"
fi

# 设置脚本权限
echo -e "${BLUE}🔐 设置脚本权限...${NC}"
chmod +x dev.sh
chmod +x stop.sh
echo -e "${GREEN}✅ 脚本权限设置完成${NC}"

echo ""
echo -e "${GREEN}🎉 项目初始化完成！${NC}"
echo ""
echo -e "${BLUE}📋 下一步操作：${NC}"
echo "1. 启动开发环境: ./dev.sh"
echo "2. 停止服务: ./stop.sh"
echo ""
echo -e "${BLUE}📍 访问地址：${NC}"
echo "• 前端应用: http://localhost:5173"
echo "• 后端 API: http://localhost:8000"
echo "• API 文档: http://localhost:8000/docs"
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "• 数据库管理: http://localhost:8080 (pgAdmin)"
fi 