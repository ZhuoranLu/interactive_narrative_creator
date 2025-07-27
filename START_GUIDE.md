# 🚀 Interactive Narrative Creator 启动指南

## 简答回答您的问题
**是的，您需要先启动数据库，然后再启动应用。** 但我们已经为您简化了这个过程！

## 🎯 最简单的启动方式

### 方法 1: 一键启动 (推荐)
```bash
./start_app.sh
```
这个脚本会：
- 自动检查数据库状态
- 如果数据库没运行，自动启动它
- 测试数据库连接
- 启动 FastAPI 应用

### 方法 2: 手动启动
```bash
# 1. 启动数据库 (二选一)
brew services start postgresql@14        # 本地 PostgreSQL
# 或
docker-compose up -d db                  # Docker PostgreSQL

# 2. 启动应用
cd server
uvicorn app.main:app --reload
```

## 📋 详细说明

### 当前状态
- ✅ **PostgreSQL 正在运行** (本地安装版本)
- ✅ **数据库已创建**: `narrative_creator` 
- ✅ **所有表已创建**: 项目、节点、事件等
- ✅ **配置正确**: 连接字符串、环境变量等

### 启动顺序
1. **数据库** 必须先启动 (PostgreSQL)
2. **应用** 后启动 (FastAPI)

### 可用的启动脚本

| 脚本 | 用途 | 说明 |
|------|------|------|
| `./start_app.sh` | 启动应用 | 自动检查并启动数据库，然后启动应用 |
| `./stop_app.sh` | 停止应用 | 停止应用，可选择是否停止数据库 |
| `./setup_postgres.sh` | 首次设置 | 完整的 PostgreSQL 设置和初始化 |

## 🔧 不同环境的启动方式

### 开发环境 (当前配置)
```bash
# 数据库: 本地 PostgreSQL (Homebrew)
# 优点: 性能好，持久化，重启后数据保留
./start_app.sh
```

### Docker 环境
```bash
# 数据库: Docker PostgreSQL
# 优点: 环境一致，易于分享
docker-compose up -d db
cd server && uvicorn app.main:app --reload
```

### 生产环境
```bash
# 数据库: 远程 PostgreSQL
# 修改 .env 文件中的 DATABASE_URL
cd server && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🌐 访问应用

启动成功后，您可以访问：
- **主应用**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **ReDoc 文档**: http://localhost:8000/redoc

## 🛑 停止应用

```bash
# 停止应用和可选择停止数据库
./stop_app.sh

# 或手动停止
Ctrl+C  # 停止 FastAPI 应用
brew services stop postgresql@14  # 停止数据库 (可选)
```

## ❓ 故障排除

### 数据库连接失败
```bash
# 检查数据库状态
brew services list | grep postgresql

# 重启数据库
brew services restart postgresql@14

# 测试连接
cd server && python -c "from app.database import engine; engine.connect()"
```

### 端口被占用
```bash
# 查找占用端口 8000 的进程
lsof -i :8000

# 杀死进程
kill -9 <PID>
```

### 权限问题
```bash
# 给脚本添加执行权限
chmod +x start_app.sh stop_app.sh setup_postgres.sh
```

## 📚 更多信息

- 详细数据库配置: [server/DATABASE_README.md](server/DATABASE_README.md)
- 环境变量配置: [server/.env](server/.env)
- API 文档: 启动应用后访问 `/docs`

---

**总结**: 现在您只需要运行 `./start_app.sh` 就可以启动整个应用了！🎉 