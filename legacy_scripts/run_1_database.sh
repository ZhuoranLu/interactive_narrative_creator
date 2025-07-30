#!/bin/bash

echo "🗄️  步骤1: 启动数据库并导入示例数据"
echo "=================================="

# 启动 PostgreSQL
if brew services list | grep -q "postgresql.*started"; then
    echo "✅ PostgreSQL 已在运行"
else
    echo "🔧 启动 PostgreSQL..."
    brew services start postgresql
    sleep 3
    echo "✅ PostgreSQL 已启动"
fi

# 初始化数据库
echo "🔧 初始化数据库..."
cd server
source venv/bin/activate
python app/init_db.py init
python app/init_db.py sample

# 导入示例故事
echo "📚 导入示例故事..."
cd ..
python import_example_stories.py

# 修复 action bindings
echo "🔧 修复 action bindings..."
python fix_action_bindings.py

echo ""
echo "✅ 数据库和示例数据准备完成！"
echo "👉 现在请打开新终端，运行 ./run_2_backend.sh"
