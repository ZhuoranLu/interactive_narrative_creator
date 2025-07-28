#!/bin/bash

echo "🚀 步骤2: 启动后端服务"
echo "=================================="

cd server
source venv/bin/activate
echo "📍 API 地址: http://localhost:8000"
echo "📖 API 文档: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
