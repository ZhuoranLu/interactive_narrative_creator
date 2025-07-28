# 一键初始化与启动指南（新机子）

本指南适用于**全新环境**，不修改数据库表结构，仅通过命令行逐步初始化数据库、后端、前端，并导入示例故事。

---

## 1. 环境准备

### 1.1 安装依赖

请确保已安装：
- Python 3.8+
- Node.js 16+
- npm
- PostgreSQL 14+
- git

如未安装，请先安装（macOS 推荐用 Homebrew）：
```bash
brew install python@3.11 node postgresql git
```

---

## 2. 克隆项目代码

```bash
git clone <你的仓库地址> interactive_narrative_creator
cd interactive_narrative_creator
```

---

## 3. 启动数据库服务

### 3.1 启动 PostgreSQL

```bash
brew services start postgresql@14
```

### 3.2 清空数据库（仅新机/首次部署时执行！）

```bash
psql postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

---

## 4. 初始化 Python 后端环境

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r app/requirements.txt
```

---

## 5. 初始化数据库表结构

```bash
python app/init_db.py init
```

---

## 6. 初始化样例用户（可选，建议执行）

```bash
python app/init_db.py sample
```

---

## 7. 安装前端依赖

```bash
cd ../interactive_narrative
npm install
```

---

## 8. 导入示例故事

回到项目根目录：
```bash
cd ..
python import_example_stories.py
```

---

## 9. 启动服务（分三个终端窗口）

### 9.1 启动后端 API

```bash
cd server
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 9.2 启动前端开发服务器

```bash
cd interactive_narrative
npm run dev
```

### 9.3 （如需）再次导入示例故事

如需重置/重新导入：
```bash
cd ..
python import_example_stories.py
```

---

## 10. 访问应用

- 前端地址: [http://localhost:5173](http://localhost:5173)
- 后端 API: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 11. 默认登录账号

- 用户名：admin
- 密码：admin123

---

## 常见问题

- **action binding 不对？**
  - 只要用本指南流程导入，action binding 会自动正确建立。
  - 如遇问题，先清空数据库（第3.2步），再重新执行本流程。

- **端口冲突/依赖缺失？**
  - 检查端口是否被占用，依赖是否安装齐全。

---

如有其它问题，请联系开发者或在 issue 区反馈。
