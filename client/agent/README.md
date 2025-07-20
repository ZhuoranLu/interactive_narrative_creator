# 交互式叙事生成器 - 核心模块

本模块实现了3个最简化的核心函数，用于"一句脑洞 → 一串节点"的闭环功能。

## 核心功能

### 1. bootstrap_node(idea: str) -> Node
把一句创意生成第1个节点

**输入示例**: `"若诸葛亮没死"`  
**输出**: 完整的Node对象，包含场景描述、世界状态、事件和可选动作

### 2. generate_next_node(cur_node: Node, cur_state: dict, selected_action: Optional[Action] = None) -> Node  
根据当前节点、世界状态和选择的动作生成下一节点（自动附动作）

**输入**: 当前节点对象 + 当前世界状态字典 + 选择的动作（可选）  
**输出**: 新的Node对象，包含基于选择动作的剧情发展和新的选择

### 3. apply_action(node: Node, action_id: str, state: dict) -> (Node|None, dict, str)
执行玩家点的动作；若jump返回下个节点，否则留在原节点

**输入**: 节点对象 + 动作ID + 当前状态  
**输出**: (下一个节点或None, 新状态, 响应文本)

## 快速开始

### 1. 安装依赖
```bash
pip install openai>=1.0.0
```

### 2. 基本使用
```python
from client.agent.narrative_generator import create_story_from_idea, continue_story

# 从创意开始创建故事
idea = "若诸葛亮没死，他会如何改变三国的历史"
first_node, initial_state = create_story_from_idea(idea)

print(f"故事开始: {first_node.scene}")

# 显示关键动作
print("关键动作:")
for i, binding in enumerate(first_node.outgoing_actions):
    print(f"{i+1}. {binding.action.description}")

# 显示事件中的动作
print("事件动作:")
for event in first_node.events:
    print(f"事件: {event.description}")
    for action in event.actions:
        print(f"  - {action.description} (ID: {action.id})")

# 执行事件动作（不推动剧情）
if first_node.events and first_node.events[0].actions:
    event_action_id = first_node.events[0].actions[0].id
    same_node, new_state, response = continue_story(first_node, event_action_id, initial_state)
    print(f"事件动作反馈: {response}")

# 执行关键动作继续故事
action_id = first_node.outgoing_actions[0].action.id
next_node, new_state, response = continue_story(first_node, action_id, initial_state)

if next_node:
    print(f"下一个场景: {next_node.scene}")
else:
    print("留在当前节点")
```

### 3. 测试系统
```bash
cd client/agent
python test_narrative.py
```

## 文件结构

- `llm_client.py` - Azure OpenAI客户端封装
- `narrative_generator.py` - 3个核心生成函数
- `test_narrative.py` - 功能测试脚本

## 数据结构

### Node节点结构
```json
{
    "scene": "主线剧情描述",
    "world_state": {
        "time": "时间",
        "location": "地点", 
        "characters": ["角色列表"],
        "key_facts": ["重要事实"]
    },
    "events": [
        {
            "speaker": "路人甲",
            "content": "今天天气真不错啊",
            "timestamp": 1,
            "event_type": "dialogue"
        },
        {
            "speaker": "",
            "content": "远处传来鸟鸣声",
            "timestamp": 2,
            "event_type": "narration"
        }
    ],
    "chapter_actions": [
        {
            "id": "action_1",
            "description": "推进剧情的选择",
            "navigation": "continue",
            "is_key_action": true,
            "effects": {
                "world_state_changes": "状态变化描述"
            }
        },
        {
            "id": "action_2",
            "description": "留在原地的行动",
            "navigation": "stay",
            "is_key_action": false,
            "response": "执行后的反馈",
            "effects": {
                "world_state_changes": "轻微状态变化"
            }
        }
    ]
}
```

### 动作类型说明

1. **关键动作 (chapter_actions)**
   - `is_key_action: true`
   - 可以推动主线剧情发展
   - `navigation: "continue"` 会生成下一个节点
   - `navigation: "stay"` 留在当前节点但可能改变状态

2. **事件内容 (events)**
   - 背景对话和环境描述
   - 不包含在主线剧情中
   - 纯粹用于氛围营造
   - 包含speaker、content、timestamp等信息

### Navigation类型

- **`continue`**: 推进到下一个节点，开始新的场景
- **`stay`**: 停留在当前节点但产生效果
  - 可以改变世界状态或角色关系
  - 不推进主线剧情
  - 适合探索、对话、小行动

## 配置说明

Azure OpenAI配置已内置在代码中：
- API Key: `69b15af66d9547228771cbd20d2ffff2`
- Endpoint: `https://aep-gpt4-dev-va7.openai.azure.com/`
- API Version: `2024-02-15-preview`
- Model: `gpt-4`

## 特点

- **最简设计**: 去掉验证、评分、缓存等附加逻辑
- **即时生成**: 基于LLM实时生成剧情内容
- **智能回忆**: LLM会从记忆中回忆相似的经典作品，保持风格一致性
- **情节借鉴**: 基于经典作品的情节发展模式来推进故事
- **精准关联**: 下一个节点基于玩家选择的动作生成，确保剧情连贯
- **选择控制**: 关键动作数量限制在2-3个，避免选择过载
- **动作分类**: continue(推进剧情) vs stay(停留但有效果)
- **状态追踪**: 自动维护世界状态和动作历史 