# 🎮 interactive_game_data.json 生成完整指南

## 📋 概述

`interactive_game_data.json` 是我们游戏系统的核心数据文件，它包含了完整的游戏场景、对话、选择分支、资源占位符等所有游戏运行所需的数据。

## 📍 **新位置说明**

**game目录已移动到服务器端：**
```
新位置: /server/app/agent/game/
原位置: /client/agent/game/ (已移除)
```

## 🔄 生成流程详解

### 第1步：原始故事树数据 📖
**文件**: `client/agent/complete_story_tree_example.json` (31KB)

```json
{
  "metadata": {
    "title": "深夜来电",
    "description": "完整的故事树结构示例"
  },
  "nodes": {
    "node_id": {
      "level": 0,
      "type": "root",
      "data": {
        "scene": "场景描述...",
        "events": [
          {
            "speaker": "角色名",
            "content": "对话内容",
            "event_type": "dialogue"
          }
        ],
        "outgoing_actions": [
          {
            "action": {
              "description": "选择描述",
              "metadata": {
                "response": "响应内容"
              }
            }
          }
        ]
      }
    }
  }
}
```

### 第2步：运行转换器 🔧
**命令**: 
```bash
cd server/app/agent/game
python3 simple_game_converter.py
```

**转换器工作原理**:

#### 🔍 **分析阶段** (analyze_story_tree)
```python
def analyze_story_tree(self, story_tree):
    analysis = {
        "game_metadata": {...},
        "characters": {},      # 提取所有说话角色
        "locations": {},       # 提取所有场景位置
        "dialogue_events": [], # 收集对话事件
        "choice_points": []    # 分析选择分支
    }
```

#### 🎨 **占位符生成** (generate_placeholders)
```python
# 角色立绘占位符
def generate_character_placeholders(self, characters):
    art_placeholders[char_name] = {
        "character_name": char_name,
        "art_description": "[AI生成占位符] 角色描述...",
        "placeholder_image": f"assets/characters/{char_name}.png",
        "prompt_for_ai": "详细的AI生成提示词"
    }

# 场景背景占位符  
def generate_background_placeholders(self, locations):
    bg_placeholders[loc_name] = {
        "location_name": loc_name,
        "background_description": "[AI生成占位符] 场景描述...", 
        "placeholder_image": f"assets/backgrounds/{loc_name}.jpg",
        "prompt_for_ai": "详细的场景生成提示词"
    }
```

#### 🎮 **游戏格式转换** (convert_to_game_format)
```python
def convert_to_game_format(self, story_tree, analysis, character_art, background_art):
    game_data = {
        "game_info": {...},
        "assets": {
            "characters": character_art,
            "backgrounds": background_art,
            "audio": {...}
        },
        "game_scenes": [],
        "scene_connections": [...],
        "start_scene_id": "..."
    }
    
    # 转换每个场景
    for node_id, node_info in story_tree.get("nodes", {}).items():
        # 1. 主场景描述 → 旁白
        content_sequence.append({
            "type": "narration",
            "text": node_data["scene"],
            "speaker": "旁白"
        })
        
        # 2. 事件 → 对话/旁白序列
        for event in sorted(events, key=timestamp):
            if event["event_type"] == "dialogue":
                content_sequence.append({
                    "type": "dialogue",
                    "speaker": event["speaker"],
                    "text": event["content"],
                    "voice_clip": {...}
                })
        
        # 3. 行动 → 选择按钮
        for action_binding in node_data.get("outgoing_actions", []):
            choices.append({
                "choice_id": action["id"],
                "choice_text": action["description"],
                "choice_type": "continue" | "stay",
                "target_scene_id": target_node_id,
                "immediate_response": response_text
            })
```

### 第3步：生成的文件结构 📊

#### 主文件：interactive_game_data.json (39KB)
```json
{
  "game_info": {
    "title": "深夜来电",
    "style": "interactive_visual_novel"
  },
  "assets": {
    "characters": { /* 角色立绘占位符 */ },
    "backgrounds": { /* 场景背景占位符 */ },
    "audio": { /* 音频占位符 */ }
  },
  "game_scenes": [
    {
      "scene_id": "唯一场景ID",
      "scene_title": "第X章",
      "background_image": "背景图片路径",
      "content_sequence": [
        {
          "type": "narration",
          "text": "旁白内容",
          "speaker": "旁白",
          "voice_clip": { /* 配音占位符 */ }
        },
        {
          "type": "dialogue", 
          "speaker": "角色名",
          "text": "对话内容",
          "character_image": "立绘路径",
          "voice_clip": { /* 配音占位符 */ }
        }
      ],
      "player_choices": [
        {
          "choice_id": "选择ID",
          "choice_text": "选择描述",
          "choice_type": "continue",
          "target_scene_id": "目标场景ID",
          "immediate_response": "即时反馈文本",
          "effects": { /* 选择效果 */ }
        }
      ]
    }
  ]
}
```

#### 配套文件：
- **web_game_config.json** (2KB) - Web游戏配置
- **ai_generation_tasks.json** (6KB) - AI生成任务清单

## 🎯 数据转换的关键映射

### 📖 故事树 → 🎮 游戏数据

| 故事树元素 | 游戏数据元素 | 转换逻辑 |
|----------|------------|----------|
| `node.data.scene` | `content_sequence[0]` | 主场景描述 → 开场旁白 |
| `events[].dialogue` | `content_sequence[n]` | 对话事件 → 对话序列 |
| `events[].narration` | `content_sequence[n]` | 叙述事件 → 旁白序列 |
| `outgoing_actions[]` | `player_choices[]` | 行动选项 → 选择按钮 |
| `action.metadata.response` | `immediate_response` | 行动反馈 → 即时响应 |
| `action.metadata.navigation` | `choice_type` | 导航类型 → 按钮类型 |

### 🎨 占位符生成规则

#### 角色立绘
```
输入: events中的speaker字段
输出: assets/characters/{角色名}.png
提示词: "请为角色 '{角色名}' 生成立绘。角色描述: {从对话推断}。风格: 恋爱游戏动漫风格。"
```

#### 场景背景  
```
输入: world_state.location字段
输出: assets/backgrounds/{场景名}.jpg  
提示词: "请为场景 '{场景名}' 生成背景图。场景描述: {location描述}。风格: 恋爱游戏电影化背景。"
```

#### 配音音频
```
对话: assets/audio/voice_{角色名}_{序号}.mp3
旁白: assets/audio/narration_{场景ID前8位}.mp3
音效: assets/audio/choice_select.mp3
```

## 🔄 重新生成步骤

如果需要重新生成游戏数据：

1. **确保故事树存在**:
   ```bash
   ls -la client/agent/complete_story_tree_example.json
   ```

2. **运行转换器**:
   ```bash
   cd server/app/agent/game
   python3 simple_game_converter.py
   ```

3. **验证生成结果**:
   ```bash
   ls -la *.json
   # 应该看到：
   # - interactive_game_data.json (39KB)
   # - web_game_config.json (2KB) 
   # - ai_generation_tasks.json (6KB)
   ```

4. **测试游戏**:
   ```bash
   python3 -m http.server 8082
   # 访问: http://localhost:8082/enhanced_demo_game.html
   # 或从项目根目录: http://localhost:8080/server/app/agent/game/enhanced_demo_game.html
   ```

## 📊 数据统计

**当前生成的游戏数据包含**:
- 📚 **4个互动场景** (完整的分支剧情)
- 🎭 **6个角色** (包含对话的角色)
- 🏞️ **4个场景背景** (不同的场景位置) 
- 💬 **6个对话事件** (角色间的互动)
- 🎯 **8个选择点** (玩家决策分支)
- 🎨 **22个AI生成任务** (图像、音频资源)

## 🎨 自定义扩展

### 添加新场景
1. 修改 `complete_story_tree_example.json`
2. 重新运行 `simple_game_converter.py`
3. 自动生成新的游戏场景数据

### 修改响应效果
1. 编辑 `action.metadata.response` 字段
2. 重新转换，游戏中会显示新的即时反馈

### 自定义AI提示词
1. 修改转换器中的 `prompt_for_ai` 生成逻辑
2. 重新生成任务清单

---

💡 **这个系统的优势是自动化和可扩展性 - 只要有合理的故事树数据，就能自动生成完整的互动游戏！** 