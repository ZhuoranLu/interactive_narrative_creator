#!/bin/bash

echo "🗄️ 修复 PostgreSQL 用户角色问题"
echo "==============================="

# 获取当前用户名
CURRENT_USER=$(whoami)
echo "当前系统用户: $CURRENT_USER"

# 检查PostgreSQL是否运行
if brew services list | grep -q "postgresql.*started"; then
    echo "✅ PostgreSQL 正在运行"
    
    echo ""
    echo "🔧 创建缺失的用户角色..."
    
    # 尝试创建用户并设置权限
    echo "执行以下命令来创建用户:"
    echo "createuser -s $CURRENT_USER"
    echo ""
    
    # 实际执行创建用户
    if createuser -s "$CURRENT_USER" 2>/dev/null; then
        echo "✅ 用户 $CURRENT_USER 创建成功"
    else
        echo "⚠️  用户可能已存在，或需要手动创建"
        echo ""
        echo "手动创建用户的方法："
        echo "1. 连接到 PostgreSQL: psql postgres"
        echo "2. 创建用户: CREATE USER $CURRENT_USER WITH SUPERUSER;"
        echo "3. 退出: \\q"
    fi
    
    echo ""
    echo "🔧 创建项目数据库..."
    if createdb narrative_creator 2>/dev/null; then
        echo "✅ 数据库 narrative_creator 创建成功"
    else
        echo "⚠️  数据库可能已存在"
    fi
    
else
    echo "❌ PostgreSQL 未运行，请先启动："
    echo "brew services start postgresql@14"
fi

echo ""
echo "🧪 测试数据库连接..."
echo "psql -d narrative_creator -c 'SELECT 1;'" 