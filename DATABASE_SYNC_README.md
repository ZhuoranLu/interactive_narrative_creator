# 数据库同步功能说明

## 概述

本项目现在支持前端对节点(Node)、事件(Event)和动作(Action)进行实时数据库同步。当用户在前端进行任何编辑操作时，这些更改都会自动保存到后端数据库中。

## 功能特性

### ✅ 支持的操作

- **节点(Node)编辑**：场景文本修改、节点类型更改、元数据更新
- **事件(Event)管理**：创建、更新、删除对话和叙述事件
- **动作(Action)管理**：创建、更新、删除玩家动作
- **动作绑定(ActionBinding)**：创建、更新、删除动作与目标的绑定关系

### 🔐 安全特性

- **用户认证**：所有操作都需要有效的JWT认证令牌
- **权限验证**：用户只能编辑自己拥有的项目
- **数据完整性**：级联删除确保数据一致性

## 架构组件

### 1. 后端API端点

#### 节点操作
- `PUT /nodes/{node_id}` - 更新节点
- `DELETE /nodes/{node_id}` - 删除节点

#### 事件操作
- `POST /events` - 创建事件
- `PUT /events/{event_id}` - 更新事件
- `DELETE /events/{event_id}` - 删除事件

#### 动作操作
- `POST /actions` - 创建动作
- `PUT /actions/{action_id}` - 更新动作
- `DELETE /actions/{action_id}` - 删除动作

#### 动作绑定操作
- `POST /action-bindings` - 创建动作绑定
- `PUT /action-bindings/{binding_id}` - 更新动作绑定
- `DELETE /action-bindings/{binding_id}` - 删除动作绑定

### 2. 前端API客户端

`client/utils/api_client.py` 提供了一个简洁的API客户端：

```python
from client.utils.api_client import api_client

# 设置认证令牌
api_client.set_auth_token('your_jwt_token')

# 更新节点
response = api_client.update_node(
    node_id="node_123",
    scene="新的场景描述",
    metadata={"updated": True}
)

# 创建事件
response = api_client.create_event(
    node_id="node_123",
    content="角色对话内容",
    speaker="角色名"
)
```

### 3. 数据库同步编辑器

`client/plot/database_sync_editor.py` 提供了一个增强的编辑器，自动处理数据库同步：

```python
from client.plot.database_sync_editor import create_database_sync_editor
from server.app.agent.narrative_generator import NarrativeGenerator

# 创建编辑器
generator = NarrativeGenerator()
editor = create_database_sync_editor(generator, auth_token="your_token")

# 所有编辑操作都会自动同步到数据库
node = editor.edit_scene(node, "新场景文本")
node = editor.add_dialogue_event(node, "角色", "对话内容")
node = editor.add_action(node, "动作描述", "continue")
```

## 使用指南

### 1. 基本设置

```python
from client.utils.api_client import set_auth_token
from client.plot.database_sync_editor import create_database_sync_editor

# 设置认证令牌
set_auth_token('your_jwt_token_here')

# 创建同步编辑器
editor = create_database_sync_editor(generator, auto_sync=True)
```

### 2. 节点编辑

```python
# 编辑场景文本
node = editor.edit_scene(node, "更新后的场景描述")

# 批量同步节点数据
responses = editor.batch_sync_node(node)
```

### 3. 事件管理

```python
# 添加对话事件
node = editor.add_dialogue_event(node, "角色名", "对话内容")

# 更新现有事件
node = editor.update_event(node, event_id, content="新的对话内容")

# 删除事件
node = editor.delete_event(node, event_id)
```

### 4. 动作管理

```python
# 添加动作
node = editor.add_action(node, "动作描述", "continue")

# 编辑动作描述
node = editor.edit_action_description(node, action_id, "新的动作描述")

# 删除动作
node = editor.delete_action(node, action_id)
```

### 5. 错误处理

```python
# 禁用同步进行离线编辑
editor.disable_sync()

# 重新启用同步
editor.enable_sync()

# 检查同步状态
if not response.success:
    print(f"同步失败: {response.error}")
```

## 数据库结构

### 表结构

1. **narrative_nodes** - 叙事节点
   - `id`, `project_id`, `scene`, `node_type`, `meta_data`

2. **narrative_events** - 叙事事件
   - `id`, `node_id`, `speaker`, `content`, `event_type`, `meta_data`

3. **actions** - 动作
   - `id`, `description`, `is_key_action`, `event_id`, `meta_data`

4. **action_bindings** - 动作绑定
   - `id`, `action_id`, `source_node_id`, `target_node_id`, `target_event_id`

### 关系

- 一个项目可以有多个节点
- 一个节点可以有多个事件
- 一个事件可以有多个动作
- 动作通过绑定连接到其他节点或事件

## 测试

### 运行API测试

```bash
python test_database_sync_api.py
```

### 运行演示

```bash
python client/demo_database_sync.py
```

## 配置

### 环境变量

- `API_BASE_URL` - API服务器地址 (默认: http://localhost:8000)
- `API_AUTH_TOKEN` - 默认认证令牌

### 数据库配置

在 `server/.env` 文件中配置数据库连接：

```env
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=narrative_creator
```

## 性能优化

### 批量操作

对于大量更改，使用批量同步：

```python
# 禁用自动同步
editor.disable_sync()

# 进行多个编辑操作
node = editor.edit_scene(node, "新场景")
node = editor.add_dialogue_event(node, "角色", "对话")

# 一次性同步所有更改
editor.enable_sync()
responses = editor.batch_sync_node(node)
```

### 错误重试

```python
from time import sleep

def retry_sync(operation, max_retries=3):
    for attempt in range(max_retries):
        response = operation()
        if response.success:
            return response
        sleep(1)  # 等待1秒后重试
    return response
```

## 故障排除

### 常见问题

1. **认证失败**
   - 检查JWT令牌是否有效
   - 确认令牌没有过期

2. **权限被拒绝**
   - 确认用户拥有项目的编辑权限
   - 检查项目ID是否正确

3. **网络错误**
   - 确认API服务器正在运行
   - 检查网络连接

4. **数据不一致**
   - 使用 `batch_sync_node()` 强制同步
   - 重新加载项目数据

### 日志和调试

启用详细日志：

```python
import logging
logging.basicConfig(level=logging.INFO)

# 现在所有同步操作都会记录日志
```

## 扩展开发

### 添加新的同步操作

1. 在 `repositories.py` 中添加数据库操作方法
2. 在 `main.py` 中添加API端点
3. 在 `api_client.py` 中添加客户端方法
4. 在 `database_sync_editor.py` 中添加编辑器方法

### 自定义同步策略

```python
class CustomSyncEditor(DatabaseSyncEditor):
    def _sync_to_database(self, operation: str, **kwargs):
        # 添加自定义同步逻辑
        # 例如：延迟同步、批量处理等
        return super()._sync_to_database(operation, **kwargs)
```

## 最佳实践

1. **总是处理同步错误**：检查响应状态并提供用户反馈
2. **使用批量操作**：对于大量更改，禁用自动同步并使用批量同步
3. **保持认证令牌更新**：实现令牌刷新机制
4. **实现离线模式**：允许用户在网络不可用时继续编辑
5. **提供同步状态指示**：让用户知道同步状态

## 支持

如有问题或需要支持，请查看：

- 项目文档：`/docs`
- API文档：运行服务器并访问 `/docs`
- 示例代码：`client/demo_database_sync.py`
- 测试用例：`test_database_sync_api.py` 