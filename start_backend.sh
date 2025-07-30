#!/bin/bash
cd server
source venv/bin/activate
echo "🚀 启动后端服务..."
echo "📍 API: http://localhost:8001"
echo "📖 文档: http://localhost:8001/docs"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
