# 交互式叙事UGC引擎：后端开发指南（前端视角）

## 1. 概述

欢迎来到交互式叙事UGC引擎的后端。本文档旨在阐明后端的架构，并指导前端开发者如何与其交互，以构建一个功能丰富、由用户驱动的故事创作平台。

核心理念非常简单：
1.  **生成 (Generate)**：AI根据用户的创意，生成一个初始的故事“节点”（包含一个场景、相关事件和可选动作）。
2.  **编辑 (Edit)**：用户拥有完全的创作自由，可以修改、添加、删除或重新生成节点的任何部分。
3.  **推进 (Advance)**：当用户对当前节点满意后，他们可以选择一个动作来推进故事，AI会据此生成下一个节点。

---

## 2. 核心组件

后端主要由两个核心类构成，前端将主要与它们进行交互：

-   `NarrativeGenerator`：此类负责所有 **AI内容的创作**。当你需要生成新的故事节点、场景、事件、动作，甚至是为一个自定义动作生成“效果”时，都将使用它。
-   `NarrativeEditor`：此类处理所有 **由用户驱动的、对现有故事节点的修改**。如果用户想要修改文本、删除动作或添加对话，都将通过这个类来完成。

这两个组件都围绕着一个核心数据结构——`Node`（节点）进行操作。

---

## 3. `Node` 对象：你的核心数据结构

`Node` 是你需要处理的主要对象。在故事的任何时刻，前端界面上展示的都是一个`Node`对象的内容。当你从后端获取到一个`Node`对象时，可以调用它的 `.to_dict()` 方法，将其转换为一个易于处理的、JSON序列化的字典。

### `Node` 结构示例

```json
{
    "id": "a1b2c3d4-...",
    "scene": "九月的清晨，霍格沃茨城堡在薄雾中若隐若现...哈利注意到人群中一个格格不入的身影。",
    "node_type": "scene",
    "events": [
        {
            "id": "e1f2a3b4-...",
            "speaker": "路人甲",
            "content": "听说今年有一个学生来自遥远的东欧...",
            "timestamp": 1,
            "event_type": "dialogue",
            "description": "",
            "actions": [],
            "metadata": {}
        }
    ],
    "outgoing_actions": [
        {
            "action": {
                "id": "action_1",
                "description": "哈利决定跟随那个陌生的新生，试图悄悄观察他的动向。",
                "is_key_action": true,
                "metadata": {
                    "navigation": "continue",
                    "response": "",
                    "effects": {
                        "world_state_changes": "哈利的注意力完全被神秘学生吸引..."
                    }
                }
            },
            "target_node_id": null,
            "target_event": null
        }
    ],
    "metadata": {
        "world_state": {
            "time": "开学日清晨",
            "location": "霍格沃茨城堡入口",
            "characters": {
                "哈利": "好奇且警惕",
                "神秘新生": "行为可疑，身份不明"
            },
            "key_facts": ["哈利发现了一个行为怪异的新生"],
            "tension_level": 2
        }
    }
}
```

-   **`scene`**: 故事的核心叙事文本。这是用户将阅读和编辑的主要内容。
-   **`events`**: 一系列背景事件（对话、环境描写等），用于营造氛围。
-   **`outgoing_actions`**: 用户可以做出的选择列表。每个动作都有一个`description`（描述）和`metadata`（元数据），其中包含了`navigation`类型（`continue`或`stay`）。
-   **`metadata.world_state`**: 一个包含当前故事世界状态的对象。在调用任何生成功能时，都应将此状态传回后端，以保持上下文的连续性。

---

## 4. 前端开发流程与API指南

本节详细介绍了主要的用户工作流程，以及你需要调用的相应后端方法。

### 工作流1：开启一个新故事

1.  **用户操作**：用户输入他们的故事创意以及任何可选的设定（世界观、角色、风格等）。
2.  **前端调用**：
    -   使用用户的设定来实例化 `NarrativeGenerator`。
    -   调用 `generator.bootstrap_node(idea)`。
3.  **后端方法**: `generator.bootstrap_node(idea: str) -> Node`
    -   **参数**:
        -   `idea`: 用户的初始故事构想（字符串）。
    -   **返回**: 完全生成好的初始 `Node` 对象。
4.  **前端响应**：
    -   接收 `first_node` 对象。
    -   从 `first_node.metadata.get("world_state", {})` 中提取初始世界状态。
    -   在节点上调用 `.to_dict()`。
    -   为用户渲染 `scene`、`events` 和 `outgoing_actions`。
    -   存储 `node` 对象和 `state` 对象，以备后续编辑或推进故事。

### 工作流2：编辑当前节点（UGC循环）

这是 `NarrativeEditor` 发挥作用的地方。你只需要用 `NarrativeGenerator` 的实例来初始化它一次。

```python
# 在你的后端接口或服务中
generator = NarrativeGenerator(llm_client, world_setting, ...)
editor = NarrativeEditor(generator)
```

#### 功能1：重新生成内容

-   **用户操作**：用户对某部分不满意，点击“重新生成场景”。
-   **后端方法**: `editor.regenerate_part(node: Node, part_to_regenerate: str, context: str = "") -> Node`
    -   **参数**:
        -   `node`: 当前的 `Node` 对象。
        -   `part_to_regenerate`: 一个字符串 - `'scene'`, `'events'`, 或 `'actions'`。
        -   `context`: (可选) 包含用户指导的字符串，例如：“让它更浪漫一点”。
    -   **返回**: 包含已重新生成部分的、修改后的 `Node` 对象。
-   **前端**: 使用新的 `Node` 对象中的内容更新UI。

#### 功能2：直接编辑场景

-   **用户操作**：用户在场景文本框中手动输入修改并保存。
-   **后端方法**: `editor.edit_scene(node: Node, new_scene_text: str) -> Node`
    -   **参数**:
        -   `node`: 当前的 `Node` 对象。
        -   `new_scene_text`: 完整的、更新后的场景文本。
    -   **返回**: 修改后的 `Node` 对象。

#### 功能3：添加新动作

-   **用户操作**：用户点击“添加动作”，并填写表单。
-   **后端方法**: `editor.add_action(node: Node, description: str, navigation_type: str, effects: Optional[Dict] = None) -> Node`
    -   **参数**:
        -   `node`: 当前的 `Node` 对象。
        -   `description`: 动作的文本，例如：“查看床底下”。
        -   `navigation_type`: 必须是 `'continue'` 或 `'stay'`。
        -   `effects`: (可选) 如果用户自己编写效果，请将其作为字典传入：`{"response": "...", "effects": {"world_state_changes": "..."}}`。如果传入 `None`，AI将自动生成效果。
    -   **返回**: 添加了新动作的、修改后的 `Node`。

#### 功能4：编辑动作文本

-   **用户操作**：用户点击动作旁边的编辑图标并修改其文本。
-   **后端方法**: `editor.edit_action_description(node: Node, action_id: str, new_description: str) -> Node`
    -   **参数**:
        -   `node`: 当前的 `Node` 对象。
        -   `action_id`: 要修改的动作的ID。
        -   `new_description`: 动作的新文本。
    -   **返回**: 修改后的 `Node`。

#### 功能5：删除动作

-   **用户操作**：用户点击动作旁边的删除图标。
-   **后端方法**: `editor.delete_action(node: Node, action_id: str) -> Node`
    -   **参数**:
        -   `node`: 当前的 `Node` 对象。
        -   `action_id`: 要移除的动作的ID。
    -   **返回**: 修改后的 `Node`。

#### 功能6：添加/删除事件

-   **用户操作**：用户添加新的对话或删除现有事件。
-   **后端方法**:
    -   `editor.add_dialogue_event(node: Node, speaker: str, content: str) -> Node`
    -   `editor.delete_event(node: Node, event_id: str) -> Node`
-   **返回**: 修改后的 `Node` 对象。

### 工作流3：推进故事

-   **用户操作**：用户点击一个 `navigation: "continue"` 的动作。
-   **前端调用**：
    -   你手头有 `current_node`、所选动作的 `action_id` 以及当前的 `world_state`。
    -   调用一个后端接口，该接口会包装并执行 `generator.apply_action` 方法。
-   **后端方法**: `generator.apply_action(node: Node, action_id: str, state: dict) -> Tuple[Optional[Node], dict, str]`
    -   **参数**:
        -   `node`: 当前的 `Node` 对象。
        -   `action_id`: 用户选择的 `continue` 动作的ID。
        -   `state`: 当前的 `world_state` 字典。
    -   **返回**: 一个元组，包含：
        1.  `next_node`: 为下一个故事节点新生成的 `Node` 对象。
        2.  `new_state`: 更新后的 `world_state`。
        3.  `response_text`: 一段确认动作的文本，例如：“你选择了打开门...”。
-   **前端响应**：
    -   接收 `next_node` 和 `new_state`。
    -   用新的节点和状态替换当前的。
    -   渲染新的场景、事件和动作。循环往复。

---

## 5. 用户自定义节点创建与连接

除了AI生成的内容，系统现在支持用户完全自定义创建节点，包括AI辅助功能。这为用户提供了更大的创作自由度。

### 工作流4：用户自定义节点创建

#### 功能1：完全自定义节点创建

-   **用户操作**：用户决定创建一个全新的节点，包括场景、事件和动作。
-   **后端方法**: `editor.create_custom_node(scene_text: str, events: Optional[List[Dict]], actions: Optional[List[Dict]], world_state: Optional[Dict]) -> Node`
    -   **参数**:
        -   `scene_text`: 场景描述文本
        -   `events`: 可选事件列表，格式: `[{"speaker": "...", "content": "...", "event_type": "dialogue/narration"}]`
        -   `actions`: 可选动作列表，格式: `[{"description": "...", "navigation": "continue/stay", "effects": {...}}]`
        -   `world_state`: 可选的世界状态信息
    -   **返回**: 创建的完整 `Node` 对象

#### 功能2：AI辅助节点创建

-   **用户操作**：用户提供一个简单的节点描述，希望AI帮助润色和完善。
-   **核心方法**:
    -   **场景润色**: `editor.polish_scene_description(raw_description: str, context: str) -> str`
        -   将用户的简单描述润色成优美的场景文本
    -   **生成事件**: `editor.generate_events_for_scene(scene_description: str, context: str) -> List[Dict]`
        -   根据场景自动生成配套的背景事件和对话
    -   **生成动作**: `editor.generate_actions_for_scene(scene_description: str, context: str, current_state: Dict) -> List[Dict]`
        -   根据场景生成合适的玩家动作选项
    -   **一键创建**: `editor.create_assisted_node(raw_description: str, polish_scene: bool, generate_events: bool, generate_actions: bool, context: str, world_state: Optional[Dict]) -> Node`
        -   整合以上所有功能，一次性创建完整的AI辅助节点

#### 功能3：节点增强

-   **用户操作**：用户对现有节点不满意，希望AI重新生成或增强某些部分。
-   **后端方法**: `editor.enhance_existing_node(node: Node, regenerate_events: bool, regenerate_actions: bool, polish_scene: bool, context: str) -> Node`
    -   **参数**:
        -   `node`: 现有节点
        -   `regenerate_events`: 是否重新生成事件
        -   `regenerate_actions`: 是否重新生成动作
        -   `polish_scene`: 是否重新润色场景
        -   `context`: 增强指导语
    -   **返回**: 增强后的节点

### 工作流5：节点连接管理

系统提供了完整的节点连接管理功能，让用户可以自由构建故事图结构。

#### 功能1：连接节点

-   **后端方法**: `editor.connect_nodes(from_node: Node, to_node: Node, action_description: str, navigation_type: str, action_effects: Optional[Dict]) -> bool`
    -   在两个节点之间建立连接，通过一个动作实现跳转

#### 功能2：查看连接

-   **后端方法**: `editor.get_node_connections(node: Node) -> Dict[str, List[Dict]]`
    -   返回节点的所有入向和出向连接信息

#### 功能3：故事分支

-   **后端方法**: `editor.create_story_branch(from_node: Node, branch_choices: List[Tuple[str, str]]) -> List[Node]`
    -   从一个节点创建多个分支路径，每个分支是一个 `(动作描述, 场景文本)` 对

#### 功能4：节点克隆

-   **后端方法**: `editor.clone_node(original_node: Node, modify_scene: str) -> Node`
    -   克隆现有节点，可选择性修改场景内容

### 工作流6：故事图管理

-   **故事图概览**: `editor.get_story_graph_overview() -> Dict[str, Any]`
    -   获取整个故事图的统计信息，包括节点数、连接数、孤立节点等
-   **图验证**: `editor.narrative_graph.validate_graph() -> Dict[str, List[str]]`
    -   检查故事图的完整性和有效性
-   **导出**: `editor.narrative_graph.to_json() -> str`
    -   将完整故事图导出为JSON格式

---

## 6. 使用示例

### 简单的AI辅助节点创建示例

```python
# 初始化
generator = NarrativeGenerator(llm_client, world_setting="科幻世界")
editor = NarrativeEditor(generator)

# 用户输入简单描述
raw_idea = "主角来到了一个神秘的实验室"

# AI辅助创建完整节点
node = editor.create_assisted_node(
    raw_description=raw_idea,
    polish_scene=True,           # 润色场景
    generate_events=True,        # 生成背景事件
    generate_actions=True,       # 生成动作选项
    context="营造紧张科幻氛围",
    world_state={"location": "地下实验室", "tension_level": 8}
)

# 获取结果
print(f"润色后场景: {node.scene}")
print(f"生成事件数: {len(node.events)}")
print(f"生成动作数: {len(node.outgoing_actions)}")
```

### 节点连接示例

```python
# 创建两个节点
node1 = editor.create_quick_node("主角发现了一扇隐藏的门")
node2 = editor.create_quick_node("门后是一个巨大的机器室")

# 连接节点
success = editor.connect_nodes(
    from_node=node1,
    to_node=node2,
    action_description="推开隐藏的门",
    navigation_type="continue",
    action_effects={
        "response": "门缓缓打开，露出了内部的情况",
        "effects": {"world_state_changes": "发现了新区域"}
    }
)

# 查看连接信息
connections = editor.get_node_connections(node1)
print(f"出向连接: {len(connections['outgoing'])}")
```

这些功能让用户既能享受AI生成的便利，又能保持完全的创作控制权，实现真正的人机协作式叙事创作。 