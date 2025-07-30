#!/bin/bash
echo "🚀 启动 Interactive Narrative Creator"
echo "=================================="

# 检查是否安装了 concurrently
if command -v concurrently &> /dev/null; then
    echo "使用 concurrently 同时启动前后端..."
    concurrently \
        --prefix-colors "blue,green" \
        --prefix "[{name}]" \
        --names "backend,frontend" \
        "cd server && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" \
        "cd interactive_narrative && npm run dev"
else
    echo "请安装 concurrently 以同时启动前后端："
    echo "npm install -g concurrently"
    echo ""
    echo "或者手动启动："
    echo "1. 后端: ./start_backend.sh"
    echo "2. 前端: ./start_frontend.sh"
fi
