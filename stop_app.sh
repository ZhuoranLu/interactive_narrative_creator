#!/bin/bash

# Interactive Narrative Creator - 应用停止脚本

echo "🛑 停止 Interactive Narrative Creator"
echo "================================="

# 停止可能运行的 FastAPI 进程
echo "📱 停止 FastAPI 应用..."
pkill -f "uvicorn.*app.main:app" 2>/dev/null || echo "没有找到运行中的 FastAPI 进程"

# 询问是否停止数据库
echo ""
read -p "是否也要停止数据库? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️ 停止数据库..."
    
    # 停止 Docker PostgreSQL
    if docker ps | grep -q "narrative_creator_db"; then
        echo "🐳 停止 Docker PostgreSQL..."
        docker-compose down
    fi
    
    # 停止本地 PostgreSQL (可选)
    if brew services list | grep -q "postgresql@14.*started"; then
        echo "📱 本地 PostgreSQL 仍在运行"
        read -p "是否停止本地 PostgreSQL? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            brew services stop postgresql@14
            echo "✅ 本地 PostgreSQL 已停止"
        else
            echo "ℹ️  本地 PostgreSQL 保持运行状态"
        fi
    fi
else
    echo "ℹ️  数据库保持运行状态"
fi

echo "✅ 应用已停止" 