# Interactive Narrative Creator

一个交互式叙事创作平台，支持创建和体验动态故事。

## 🚀 快速开始

### 首次使用

```bash
# 1. 一键安装所有依赖（推荐）
./install_dependencies.sh

# 2. 初始化项目（仅首次需要）
./setup.sh

# 3. 启动开发环境
./dev.sh
```

### 遇到依赖问题时

```bash
# 重新安装所有依赖
./install_dependencies.sh
```

### 日常开发

```bash
# 启动开发环境（前后端同时启动）
./dev.sh

# 停止所有服务
./stop.sh
```

## 📋 启动脚本说明

| 脚本 | 功能 | 适用场景 |
|------|------|----------|
| `./install_dependencies.sh` | 一键安装所有依赖 | 首次使用或依赖问题 |
| `./setup.sh` | 初始化项目环境 | 首次使用或重新配置 |
| `./dev.sh` | 启动完整开发环境 | 日常开发（推荐） |
| `./stop.sh` | 停止所有服务 | 结束开发 |

### 传统启动方式（仍可使用）

```bash
# 手动启动数据库
./run_1_database.sh

# 启动后端（新终端）
./run_2_backend.sh

# 启动前端（新终端）
./run_3_frontend.sh
```

## 📍 访问地址

- **前端应用**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **数据库管理**: http://localhost:8080 (pgAdmin, 仅 Docker 模式)

## 🛠️ 系统要求

- **Node.js** (v16+)
- **Python** (3.8+)
- **数据库**: PostgreSQL (本地安装) 或 Docker

## 🗄️ 数据库配置

项目支持两种数据库运行方式：

1. **Docker PostgreSQL**（推荐）
   - 自动配置和启动
   - 包含 pgAdmin 管理界面

2. **本地 PostgreSQL**
   - 需要预先安装：`brew install postgresql`
   - 手动启动：`brew services start postgresql`

## 🔧 故障排除

### 端口冲突
- 前端：5173
- 后端：8000
- 数据库：5432
- pgAdmin：8080

如果端口被占用，请先停止相关服务。

### 数据库连接问题
1. 检查数据库是否运行：`./dev.sh` 会自动检查
2. 重新初始化：`./setup.sh`

### 依赖问题
```bash
# 重新安装前端依赖
cd interactive_narrative && npm install

# 重新安装后端依赖
cd server && source venv/bin/activate && pip install -r requirements.txt
```

## 📁 项目结构

```
├── dev.sh              # 开发环境启动脚本
├── setup.sh            # 项目初始化脚本
├── stop.sh             # 停止服务脚本
├── docker-compose.yml  # Docker 配置
├── server/             # 后端代码（FastAPI）
├── interactive_narrative/  # 前端代码（React + Vite）
└── 旧启动脚本/        # 兼容的旧脚本
``` 