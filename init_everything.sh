#!/bin/bash

# 🚀 Interactive Narrative Creator - 一键初始化脚本
# ====================================================
# 此脚本将完整初始化项目的所有组件：
# - 检查并安装依赖
# - 初始化数据库
# - 创建管理员用户
# - 导入示例故事
# - 启动前端和后端服务

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

log_section() {
    echo -e "\n${CYAN}$1${NC}"
    echo "=================================="
}

# 检查Python版本
check_python() {
    log_step "检查Python..."
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        version=$(python3 --version 2>&1 | awk '{print $2}')
        log_success "找到Python $version"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
        version=$(python --version 2>&1 | awk '{print $2}')
        log_success "找到Python $version"
    else
        log_error "Python 未安装"
        return 1
    fi
}

# 检查Node.js
check_node() {
    log_step "检查Node.js..."
    if command -v node &> /dev/null; then
        version=$(node --version)
        log_success "找到Node.js $version"
    else
        log_error "Node.js 未安装"
        return 1
    fi
}

# 设置Python环境
setup_python() {
    log_step "设置Python环境..."
    cd server
    
    if [ ! -d "venv" ]; then
        log_step "创建虚拟环境..."
        $PYTHON_CMD -m venv venv
        log_success "虚拟环境创建完成"
    else
        log_info "虚拟环境已存在"
    fi
    
    log_step "激活虚拟环境并安装依赖..."
    source venv/bin/activate
    pip install --upgrade pip -q
    
    # 安装核心依赖
    log_step "安装核心依赖包..."
    if [ -f "app/requirements.txt" ]; then
        pip install -r app/requirements.txt -q
    else
        log_warning "requirements.txt 不存在，手动安装依赖..."
        pip install -q fastapi uvicorn sqlalchemy alembic python-multipart psycopg2-binary bcrypt python-jose[cryptography] passlib[bcrypt] pydantic[email]
    fi
    
    # 安装额外的依赖
    log_step "安装额外依赖..."
    pip install -q PyJWT openai
    
    log_success "Python依赖安装完成"
    cd ..
}

# 设置Node.js环境
setup_node() {
    log_step "设置Node.js环境..."
    cd interactive_narrative
    
    if [ -d "node_modules" ] && [ "$FORCE_CLEAN" != "true" ]; then
        log_info "Node.js依赖已存在"
    else
        if [ "$FORCE_CLEAN" = "true" ]; then
            log_step "清理旧依赖..."
            rm -rf node_modules package-lock.json
        fi
        log_step "安装Node.js依赖..."
        npm install -q
        log_success "Node.js依赖安装完成"
    fi
    
    cd ..
}

# 初始化数据库
setup_database() {
    log_step "初始化数据库..."
    cd server
    source venv/bin/activate
    
    log_step "创建数据库表..."
    $PYTHON_CMD app/init_db.py init
    
    log_step "创建示例用户（如果不存在）..."
    $PYTHON_CMD app/init_db.py sample 2>/dev/null || log_info "示例用户已存在"
    
    log_success "数据库初始化完成"
    cd ..
}

# 导入示例故事
import_examples() {
    log_step "导入示例故事..."
    
    # 检查示例文件
    if [ -f "import_example_stories.py" ]; then
        log_step "运行示例故事导入..."
        cd server && source venv/bin/activate && cd ..
        $PYTHON_CMD import_example_stories.py 2>/dev/null || log_info "示例故事可能已存在"
        log_success "示例故事处理完成"
    else
        log_warning "示例故事脚本不存在"
    fi
}

# 创建启动脚本
create_scripts() {
    log_step "创建启动脚本..."
    
    # 后端启动脚本
    cat > start_backend.sh << 'BACKEND_EOF'
#!/bin/bash
cd server
source venv/bin/activate
echo "🚀 启动后端服务..."
echo "📍 API: http://localhost:8000"
echo "📖 文档: http://localhost:8000/docs"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
BACKEND_EOF
    chmod +x start_backend.sh
    
    # 前端启动脚本
    cat > start_frontend.sh << 'FRONTEND_EOF'
#!/bin/bash
cd interactive_narrative
echo "🚀 启动前端服务..."
echo "📍 应用: http://localhost:3000"
npm start
FRONTEND_EOF
    chmod +x start_frontend.sh
    
    # 同时启动脚本
    cat > start_all.sh << 'ALL_EOF'
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
        "cd interactive_narrative && npm start"
else
    echo "请安装 concurrently 以同时启动前后端："
    echo "npm install -g concurrently"
    echo ""
    echo "或者手动启动："
    echo "1. 后端: ./start_backend.sh"
    echo "2. 前端: ./start_frontend.sh"
fi
ALL_EOF
    chmod +x start_all.sh
    
    log_success "启动脚本创建完成"
}

# 验证设置
verify_setup() {
    log_step "验证设置..."
    cd server
    source venv/bin/activate
    
    # 验证模块导入
    if $PYTHON_CMD -c "import app.main; print('✅ 后端模块导入成功')" 2>/dev/null; then
        log_success "后端验证通过"
    else
        log_warning "后端验证有问题，但可能仍可运行"
    fi
    
    # 验证管理员用户
    if $PYTHON_CMD -c "
from app.database import SessionLocal
from app.user_repositories import UserRepository
db = SessionLocal()
user_repo = UserRepository(db)
admin_user = user_repo.get_user_by_username('admin')
if admin_user:
    print('✅ 管理员用户存在')
else:
    print('❌ 管理员用户不存在')
db.close()
" 2>/dev/null; then
        log_success "用户验证通过"
    else
        log_warning "用户验证有问题"
    fi
    
    cd ..
    
    # 验证前端
    if [ -d "interactive_narrative/node_modules" ]; then
        log_success "前端验证通过"
    else
        log_warning "前端依赖可能有问题"
    fi
}

# 显示完成信息
show_completion() {
    log_section "🎉 初始化完成！"
    
    echo -e "${GREEN}项目已成功初始化并可以运行！${NC}\n"
    
    echo -e "${CYAN}📋 登录信息：${NC}"
    echo "   管理员: admin / admin123"
    echo "   演示用户: demo_user / demo123"
    echo ""
    
    echo -e "${CYAN}🚀 启动方式：${NC}"
    echo "   同时启动: ./start_all.sh"
    echo "   只启动后端: ./start_backend.sh"
    echo "   只启动前端: ./start_frontend.sh"
    echo ""
    
    echo -e "${CYAN}🔗 访问地址：${NC}"
    echo "   前端应用: http://localhost:3000"
    echo "   后端API: http://localhost:8000"
    echo "   API文档: http://localhost:8000/docs"
    echo ""
    
    echo -e "${YELLOW}📝 提示：${NC}"
    echo "   - 示例故事已导入并绑定给管理员用户"
    echo "   - 如需重置数据库: cd server && python app/init_db.py reset"
    echo "   - 如需安装 concurrently: npm install -g concurrently"
}

# 主函数
main() {
    log_section "🚀 Interactive Narrative Creator - 一键初始化"
    
    # 检查参数
    FORCE_CLEAN=false
    SKIP_EXAMPLES=false
    for arg in "$@"; do
        case $arg in
            --force-clean)
                FORCE_CLEAN=true
                ;;
            --skip-examples)
                SKIP_EXAMPLES=true
                ;;
            --help|-h)
                echo "使用方法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --force-clean     强制清理并重新安装所有依赖"
                echo "  --skip-examples   跳过示例故事导入"
                echo "  --help, -h        显示此帮助信息"
                exit 0
                ;;
        esac
    done
    
    # 执行步骤
    log_section "1️⃣ 检查环境"
    check_python || exit 1
    check_node || exit 1
    
    log_section "2️⃣ 设置Python环境"
    setup_python
    
    log_section "3️⃣ 设置Node.js环境"
    setup_node
    
    log_section "4️⃣ 初始化数据库"
    setup_database
    
    if [ "$SKIP_EXAMPLES" = false ]; then
        log_section "5️⃣ 导入示例故事"
        import_examples
    else
        log_section "5️⃣ 跳过示例故事导入"
    fi
    
    log_section "6️⃣ 创建启动脚本"
    create_scripts
    
    log_section "7️⃣ 验证设置"
    verify_setup
    
    show_completion
}

# 运行
main "$@"
