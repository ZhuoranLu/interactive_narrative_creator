#!/bin/bash

# Interactive Narrative Creator - 依赖安装脚本
# 一键安装所有前端和后端依赖

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Interactive Narrative Creator - 依赖安装${NC}"
echo "=============================================="
echo ""

# 检查系统依赖
echo -e "${BLUE}📋 检查系统依赖...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 未安装，请先安装 Python3${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"

# 检查 pip
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip 未安装${NC}"
    exit 1
fi

PIP_CMD="pip3"
if command -v pip &> /dev/null; then
    PIP_CMD="pip"
fi
echo -e "${GREEN}✅ pip: $($PIP_CMD --version | cut -d' ' -f1-2)${NC}"

echo ""

# 安装全局工具
echo -e "${BLUE}🌍 安装全局工具...${NC}"

# 安装 concurrently (用于同时运行前后端)
if ! npm list -g concurrently &> /dev/null; then
    echo -e "${YELLOW}📦 安装 concurrently...${NC}"
    npm install -g concurrently
    echo -e "${GREEN}✅ concurrently 安装完成${NC}"
else
    echo -e "${GREEN}✅ concurrently 已安装${NC}"
fi

echo ""

# 后端依赖安装
echo -e "${BLUE}🐍 安装后端依赖...${NC}"

# 检查虚拟环境
if [ ! -d "server/venv" ]; then
    echo -e "${YELLOW}📦 创建 Python 虚拟环境...${NC}"
    cd server
    python3 -m venv venv
    cd ..
    echo -e "${GREEN}✅ 虚拟环境创建完成${NC}"
else
    echo -e "${GREEN}✅ 虚拟环境已存在${NC}"
fi

# 激活虚拟环境并安装依赖
echo -e "${YELLOW}📦 安装 Python 依赖包...${NC}"
cd server
source venv/bin/activate

# 安装后端依赖
if [ -f "app/requirements.txt" ]; then
    pip install -r app/requirements.txt
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
else
    echo -e "${RED}❌ app/requirements.txt 文件不存在${NC}"
    exit 1
fi

cd ..
echo ""

# 前端依赖安装
echo -e "${BLUE}⚛️  安装前端依赖...${NC}"

cd interactive_narrative

# 安装前端依赖
echo -e "${YELLOW}📦 安装 Node.js 依赖包...${NC}"
npm install

# 检查并安装可能缺失的 Chakra UI 组件
echo -e "${YELLOW}📦 检查 Chakra UI 组件...${NC}"

# 核心 Chakra UI 包
CHAKRA_PACKAGES=(
    "@chakra-ui/react"
    "@chakra-ui/accordion"
    "@chakra-ui/icons"
    "@chakra-ui/layout"
    "@chakra-ui/select"
    "@chakra-ui/tabs"
    "@chakra-ui/toast"
    "@emotion/react"
    "@emotion/styled"
    "framer-motion"
)

for package in "${CHAKRA_PACKAGES[@]}"; do
    if ! npm list "$package" &> /dev/null; then
        echo -e "${YELLOW}📦 安装 $package...${NC}"
        npm install "$package"
    fi
done

# 其他必要依赖
OTHER_PACKAGES=(
    "next-themes"
    "react-icons"
    "react-router-dom"
)

for package in "${OTHER_PACKAGES[@]}"; do
    if ! npm list "$package" &> /dev/null; then
        echo -e "${YELLOW}📦 安装 $package...${NC}"
        npm install "$package"
    fi
done

echo -e "${GREEN}✅ 前端依赖安装完成${NC}"

cd ..
echo ""

# 创建依赖列表文件
echo -e "${BLUE}📝 生成依赖列表...${NC}"

cat > DEPENDENCIES_LIST.md << EOF
# Interactive Narrative Creator - 依赖列表

## 系统要求
- Node.js >= 18.0.0
- Python >= 3.8
- PostgreSQL >= 12

## 全局工具
- concurrently: 用于同时运行前后端

## 后端依赖 (Python)
$(cd server && source venv/bin/activate && pip freeze)

## 前端依赖 (Node.js)
$(cd interactive_narrative && npm list --depth=0 2>/dev/null | grep -E "^[├└]" | sed 's/[├└─ ]*//g')

## 安装方法
运行以下命令一键安装所有依赖：
\`\`\`bash
./install_dependencies.sh
\`\`\`

## 启动开发环境
\`\`\`bash
./dev.sh
\`\`\`

生成时间: $(date)
EOF

echo -e "${GREEN}✅ 依赖列表已生成: DEPENDENCIES_LIST.md${NC}"
echo ""

# 验证安装
echo -e "${BLUE}🔍 验证安装...${NC}"

# 检查后端依赖
cd server
source venv/bin/activate
if python -c "import fastapi, uvicorn, sqlalchemy, psycopg2" 2>/dev/null; then
    echo -e "${GREEN}✅ 后端核心依赖验证通过${NC}"
else
    echo -e "${YELLOW}⚠️  后端依赖可能有问题${NC}"
fi
cd ..

# 检查前端依赖
cd interactive_narrative
if npm list @chakra-ui/react react next-themes &>/dev/null; then
    echo -e "${GREEN}✅ 前端核心依赖验证通过${NC}"
else
    echo -e "${YELLOW}⚠️  前端依赖可能有问题${NC}"
fi
cd ..

echo ""
echo -e "${GREEN}🎉 所有依赖安装完成！${NC}"
echo -e "${BLUE}📖 下一步：${NC}"
echo -e "   1. 运行 ${YELLOW}./setup.sh${NC} 初始化数据库"
echo -e "   2. 运行 ${YELLOW}./dev.sh${NC} 启动开发环境"
echo -e "   3. 访问 ${YELLOW}http://localhost:5173${NC} 查看应用"
echo "" 