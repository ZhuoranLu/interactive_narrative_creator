#!/bin/bash

# Interactive Narrative Creator - 应用启动脚本
# 自动检查数据库状态并启动应用

set -e

echo "🚀 启动 Interactive Narrative Creator"
echo "=================================="

# 检查 PostgreSQL 状态
echo "📊 检查数据库状态..."

# 检查本地 PostgreSQL
if brew services list | grep -q "postgresql@14.*started"; then
    echo "✅ 本地 PostgreSQL 正在运行"
    DB_RUNNING=true
elif docker ps | grep -q "narrative_creator_db"; then
    echo "✅ Docker PostgreSQL 正在运行"
    DB_RUNNING=true
else
    echo "❌ 没有发现运行中的 PostgreSQL"
    DB_RUNNING=false
fi

# 如果数据库没有运行，尝试启动
if [ "$DB_RUNNING" = false ]; then
    echo "🔧 尝试启动数据库..."
    
    # 优先尝试本地 PostgreSQL
    if command -v brew &> /dev/null && brew services list | grep -q "postgresql@14"; then
        echo "📱 启动本地 PostgreSQL..."
        brew services start postgresql@14
        sleep 3
    # 否则尝试 Docker
    elif command -v docker &> /dev/null; then
        echo "🐳 启动 Docker PostgreSQL..."
        docker-compose up -d db
        echo "⏳ 等待 PostgreSQL 启动..."
        sleep 10
    else
        echo "❌ 找不到 PostgreSQL 或 Docker"
        echo "请手动启动数据库或运行 ./setup_postgres.sh"
        exit 1
    fi
fi

# 测试数据库连接
echo "🔍 测试数据库连接..."
cd server
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
"; then
    echo "🎉 数据库准备就绪！"
else
    echo "❌ 数据库连接失败，请检查配置"
    exit 1
fi

# 启动应用
echo "🌟 启动 FastAPI 应用..."
echo "📍 应用将在 http://localhost:8000 运行"
echo "📖 API 文档: http://localhost:8000/docs"
echo ""
echo "🛑 按 Ctrl+C 停止应用"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 