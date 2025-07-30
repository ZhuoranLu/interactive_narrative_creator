#!/bin/bash

echo "🔧 修复 Node.js ICU 依赖问题"
echo "=========================="

# 检查当前 ICU 版本
ICU_VERSION=$(brew list icu4c@77 2>/dev/null && echo "77" || echo "unknown")
echo "当前 ICU 版本: $ICU_VERSION"

# 方案1: 重新安装 Node.js
echo ""
echo "方案1: 重新安装 Node.js (推荐)"
echo "brew uninstall node && brew install node"

# 方案2: 使用 NVM
echo ""
echo "方案2: 使用 NVM 管理 Node.js"
echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
echo "nvm install --lts && nvm use --lts"

# 方案3: 尝试重新链接
echo ""
echo "方案3: 重新链接 Node.js"
echo "brew reinstall node"

# 方案4: 检查是否存在兼容的 Node.js
echo ""
echo "方案4: 检查系统 Node.js"
if [ -f "/usr/bin/node" ]; then
    echo "发现系统 Node.js: $(/usr/bin/node --version 2>/dev/null || echo '无法运行')"
fi

# 方案5: 使用 Conda 的 Node.js (如果在 conda 环境中)
if command -v conda &> /dev/null; then
    echo ""
    echo "方案5: 使用 Conda Node.js (当前在 conda 环境中)"
    echo "conda install nodejs npm"
fi

echo ""
echo "请选择一个方案执行，或者手动运行上述命令。" 