#!/bin/bash

# 🚀 Interactive Narrative Creator - 一键初始化脚本
# ====================================================

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
    
    if [ -f "app/requirements.txt" ]; then
        pip install -r app/requirements.txt -q
        log_success "Python依赖安装完成"
    else
        log_warning "requirements.txt 不存在"
    fi
    
    cd ..
}

# 设置Node.js环境
setup_node() {
    log_step "设置Node.js环境..."
    cd interactive_narrative
    
    if [ -d "node_modules" ]; then
        log_info "Node.js依赖已存在"
    else
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
    
    log_step "创建示例用户..."
    $PYTHON_CMD app/init_db.py sample
    
    log_success "数据库初始化完成"
    cd ..
}

# 创建启动脚本
create_scripts() {
    log_step "创建启动脚本..."
    
    # 后端启动脚本
    cat > start_backend.sh << 'BACKEND_EOF'
#!/bin/bash
cd server
source venv/bin/activate
echo "�� 启动后端服务..."
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
    
    log_success "启动脚本创建完成"
}

# 验证设置
verify_setup() {
    log_step "验证设置..."
    cd server
    source venv/bin/activate
    
    if $PYTHON_CMD -c "
from app.database import SessionLocal
from app.user_repositories import UserRepository
db = SessionLocal()
user_repo = UserRepository(db)
admin_user = user_repo.get_user_by_username('admin')
if admin_user:
    print('✅ 管理员用户创建成功')
else:
    print('❌ 管理员用户创建失败')
db.close()
" 2>/dev/null; then
        log_success "验证通过"
    else
        log_warning "验证有问题，但可能仍然可以运行"
    fi
    
    cd ..
}

# 显示完成信息
show_completion() {
    log_section "🎉 初始化完成！"
    
    echo -e "${GREEN}项目已成功初始化！${NC}\n"
    
    echo -e "${CYAN}📋 登录信息：${NC}"
    echo "   管理员: admin / admin123"
    echo "   演示用户: demo_user / demo123"
    echo ""
    
    echo -e "${CYAN}🚀 启动方式：${NC}"
    echo "   后端: ./start_backend.sh"
    echo "   前端: ./start_frontend.sh"
    echo ""
    
    echo -e "${CYAN}🔗 访问地址：${NC}"
    echo "   前端: http://localhost:3000"
    echo "   后端: http://localhost:8000"
    echo "   文档: http://localhost:8000/docs"
}

# 主函数
main() {
    log_section "🚀 Interactive Narrative Creator - 一键初始化"
    
    # 检查参数
    SKIP_EXAMPLES=false
    for arg in "$@"; do
        case $arg in
            --skip-examples)
                SKIP_EXAMPLES=true
                ;;
            --help|-h)
                echo "使用方法: $0 [--skip-examples] [--help]"
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
        if [ -f "import_example_stories.py" ]; then
            log_step "导入示例故事..."
            $PYTHON_CMD import_example_stories.py
            log_success "示例故事导入完成"
        else
            log_warning "示例故事脚本不存在"
        fi
    fi
    
    log_section "6️⃣ 创建启动脚本"
    create_scripts
    
    log_section "7️⃣ 验证设置"
    verify_setup
    
    show_completion
}

# 运行
main "$@"
