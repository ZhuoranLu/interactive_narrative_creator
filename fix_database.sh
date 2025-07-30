#!/bin/bash

echo "🗄️ Interactive Narrative Creator - 数据库修复"
echo "============================================="

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取当前用户名
CURRENT_USER=$(whoami)
echo -e "${BLUE}当前系统用户: $CURRENT_USER${NC}"

# 检查PostgreSQL是否运行
if brew services list | grep -q "postgresql.*started"; then
    echo -e "${GREEN}✅ PostgreSQL 正在运行${NC}"
else
    echo -e "${RED}❌ PostgreSQL 未运行${NC}"
    echo "启动 PostgreSQL..."
    brew services start postgresql@14
    sleep 3
fi

echo ""
echo -e "${BLUE}🔧 方案1: 创建当前用户的数据库角色（推荐）${NC}"
echo "这样可以让应用使用当前系统用户连接数据库"

# 创建当前用户的数据库角色
echo "创建用户 $CURRENT_USER..."
if createuser -s "$CURRENT_USER" 2>/dev/null; then
    echo -e "${GREEN}✅ 用户 $CURRENT_USER 创建成功${NC}"
else
    echo -e "${YELLOW}⚠️  用户 $CURRENT_USER 可能已存在${NC}"
fi

# 创建项目数据库
echo "创建数据库 narrative_creator..."
if createdb narrative_creator 2>/dev/null; then
    echo -e "${GREEN}✅ 数据库 narrative_creator 创建成功${NC}"
else
    echo -e "${YELLOW}⚠️  数据库 narrative_creator 可能已存在${NC}"
fi

# 测试连接
echo ""
echo -e "${BLUE}🧪 测试数据库连接...${NC}"
if psql -d narrative_creator -c 'SELECT 1;' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接成功！${NC}"
    CONN_SUCCESS=true
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
    CONN_SUCCESS=false
fi

if [ "$CONN_SUCCESS" = false ]; then
    echo ""
    echo -e "${BLUE}🔧 方案2: 使用标准 postgres 用户${NC}"
    echo "创建 .env 文件明确指定数据库用户..."
    
    # 创建 .env 文件
    cat > server/.env << EOF
# PostgreSQL Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/narrative_creator

# Alternative: Individual variables
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=narrative_creator
EOF
    
    echo -e "${GREEN}✅ 已创建 server/.env 配置文件${NC}"
    
    # 尝试使用 postgres 用户创建数据库
    echo "使用 postgres 用户创建数据库..."
    if createdb -U postgres narrative_creator 2>/dev/null; then
        echo -e "${GREEN}✅ 使用 postgres 用户创建数据库成功${NC}"
    else
        echo -e "${YELLOW}⚠️  数据库可能已存在或需要密码${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🔧 方案3: 手动创建（如果上述方案失败）${NC}"
echo "如果自动创建失败，请手动执行："
echo ""
echo "1. 连接到 PostgreSQL:"
echo "   psql postgres"
echo ""
echo "2. 创建用户和数据库:"
echo "   CREATE USER $CURRENT_USER WITH SUPERUSER;"
echo "   CREATE DATABASE narrative_creator OWNER $CURRENT_USER;"
echo "   \\q"
echo ""
echo "3. 或者使用 postgres 用户:"
echo "   CREATE DATABASE narrative_creator;"
echo "   \\q"

echo ""
echo -e "${GREEN}🎉 数据库修复脚本执行完成${NC}"
echo ""
echo -e "${BLUE}📋 下一步：${NC}"
echo "1. 运行: ./dev.sh"
echo "2. 或者: cd server && python app/init_db.py init" 