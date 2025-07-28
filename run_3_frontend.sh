#!/bin/bash

echo "🌐 步骤3: 启动前端服务"
echo "=================================="

cd interactive_narrative
echo "📍 应用地址: http://localhost:5173"  # Vite 默认使用 5173 端口
echo ""
npm run dev
