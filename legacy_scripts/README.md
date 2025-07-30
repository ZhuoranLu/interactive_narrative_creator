# 传统启动脚本

这个目录包含了项目的传统启动脚本，保留用于兼容性和特殊用途。

## 🔄 迁移说明

**推荐使用新的启动方式：**
```bash
# 新方式（推荐）
./setup.sh  # 首次初始化
./dev.sh    # 启动开发环境
./stop.sh   # 停止服务
```

## 📜 传统脚本说明

| 脚本 | 功能 | 状态 |
|------|------|------|
| `start_frontend.sh` | 仅启动前端 | ✅ 已修复 |
| `start_backend.sh` | 仅启动后端 | ✅ 可用 |
| `start_all.sh` | 同时启动前后端 | ✅ 已修复 |
| `start_app.sh` | 启动后端（含数据库检查） | ✅ 可用 |
| `run_1_database.sh` | 启动数据库并导入数据 | ✅ 可用 |
| `run_2_backend.sh` | 启动后端服务 | ✅ 可用 |
| `run_3_frontend.sh` | 启动前端服务 | ✅ 可用 |

## 🚀 使用传统脚本

如果您更喜欢分步启动，可以继续使用：

```bash
# 步骤1：启动数据库
./legacy_scripts/run_1_database.sh

# 步骤2：启动后端（新终端）
./legacy_scripts/run_2_backend.sh

# 步骤3：启动前端（新终端）
./legacy_scripts/run_3_frontend.sh
```

或者使用一键启动：
```bash
./legacy_scripts/start_all.sh
```

## ⚠️ 注意事项

- 所有旧脚本已修复前端启动命令（`npm start` → `npm run dev`）
- 端口信息已更新（前端端口：5173）
- 这些脚本将继续维护，但新功能优先在新脚本中实现 