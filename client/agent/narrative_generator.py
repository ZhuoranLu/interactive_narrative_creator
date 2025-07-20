"""
核心叙事生成器 - 实现3个最简化的函数
1. bootstrap_node - 从创意生成第一个节点
2. generate_next_node - 生成下一个节点
3. apply_action - 执行动作
"""

import json
import uuid
from typing import Dict, List, Optional, Tuple, Any, Union

import sys
import os

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(parent_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

try:
    # 尝试相对导入（当作为包使用时）
    from .llm_client import LLMClient
    from ..utils.narrative_graph import Node, Action, Event, ActionBinding, NodeType
except ImportError:
    # 使用直接导入（当直接运行时）
    from llm_client import LLMClient
    from client.utils.narrative_graph import Node, Action, Event, ActionBinding, NodeType


class NarrativeGenerator:
    """核心叙事生成器"""
    
    def __init__(self):
        self.llm_client = LLMClient()
    
    def _recall_and_analyze(self, text: str) -> str:
        """让LLM回忆相似作品并分析风格"""

        return f"创意: {text}\n\n请基于这个创意，回忆相关的经典作品或故事类型，然后以相应的风格进行创作。"

    def bootstrap_node(self, idea: str) -> Node:
        """
        函数1: 把一句创意生成第1个节点
        输入: 用户的创意可能包含几句话的idea 或者是长小说文本
        输出: 完整Node JSON（含动作）
        """
        
        # 让LLM回忆相似作品并分析风格
        recall_context = self._recall_and_analyze(idea)
        
        prompt = f"""
你是一个充满想象力的叙事者以及游戏剧情创作者。根据用户给出的创意，生成第一个剧情节点。

{recall_context}

请生成一个JSON格式的节点，包含以下结构：

**重要提醒**：
- scene包含主要剧情，是玩家会经历的核心故事内容
- events只是背景氛围，比如路人对话、环境音效等，与主线无关
{{
    "scene": "主线剧情描述（1-2段文字，描述当前场景和情况）",
    "world_state": {{
        "time": "时间描述",
        "location": "地点描述", 
        "characters": ["角色1", "角色2"],
    }},
    ### world_state 还需要包括根据故事情节需要添加的变量，比如人物的属性，人物之间的关系等，这些变量需要根据故事情节的发展而变化
        "events": [
        {{
            "speaker": "路人甲",
            "content": "今天天气真不错",
            "timestamp": 1,
            "event_type": "dialogue"
        }},
        {{
            "speaker": "",
            "content": "远处传来鸟鸣声",
            "timestamp": 2,
            "event_type": "narration"
        }}
    ],
    "chapter_actions": [
        {{
            "id": "action_1",
            "description": "重要选择描述",
            "navigation": "continue", 
            "is_key_action": true,
            "effects": {{
                "world_state_changes": "对世界状态的影响描述"
            }}
        }},
        {{
            "id": "action_2", 
            "description": "留在原地的动作描述",
            "navigation": "stay",
            "is_key_action": true,
            "response": "执行后的反馈，停留在原地",
            "effects": {{
                "world_state_changes": "对世界状态的影响描述"
            }}
        }},
        {{
            "id": "action_3",
            "description": "另一个留在原地的动作",
            "navigation": "stay",
            "is_key_action": false,
            "response": "执行后的反馈，停留在原地",
            "effects": {{
                "world_state_changes": "轻微的状态变化"
            }}
        }}
    ]
}}

要求:
- scene要生动具体，1-2段完整描述当前场景和情况
- events是独立的、可选的对话或小事件，**不包含在scene主线中**：
  * 例如：旁边有人在交谈、背景音乐、环境细节等
  * dialogue类型：独立的NPC对话，需要speaker字段
  * narration类型：可选的环境描述，speaker为空
  * 这些events不影响主线进展，纯粹是氛围和背景
- chapter_actions包含所有可执行动作，总数3-4个：
  * 1-2个continue动作：推进剧情到下一个场景
  * 1-2个stay动作：在当前场景做一些事但不离开
- navigation类型说明：
  * "continue": 推进到下一个节点
  * "stay": 停留在原地但产生效果
"""

        messages = [
            {"role": "system", "content": "你是一个充满想象力的叙事者以及游戏剧情创作者。根据用户给出的创意，擅长创造引人入胜的剧情和有趣的选择。"},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response_data = self.llm_client.generate_json_response(messages)
            
            # 创建Node对象
            node = Node(
                scene=response_data.get("scene", ""),
                node_type=NodeType.SCENE,
                metadata={
                    "world_state": response_data.get("world_state", {}),
                    "chapter_actions": response_data.get("chapter_actions", [])
                }
            )
            
            # 添加events（背景对话和环境描述）
            for event_data in response_data.get("events", []):
                event = Event(
                    speaker=event_data.get("speaker", ""),
                    content=event_data.get("content", ""),
                    timestamp=event_data.get("timestamp", 0),
                    event_type=event_data.get("event_type", "dialogue")
                )
                node.add_event(event)
            
            # 添加chapter_actions（所有可执行动作）
            for action_data in response_data.get("chapter_actions", []):
                action = Action(
                    id=action_data.get("id", str(uuid.uuid4())),
                    description=action_data.get("description", ""),
                    is_key_action=action_data.get("is_key_action", True),
                    metadata={
                        "navigation": action_data.get("navigation", "continue"),
                        "response": action_data.get("response", ""),
                        "effects": action_data.get("effects", {})
                    }
                )
                
                # 创建一个临时的ActionBinding（目标节点稍后设置）
                binding = ActionBinding(action=action, target_node=None, target_event=None)
                node.outgoing_actions.append(binding)
            
            return node
            
        except Exception as e:
            print(f"生成bootstrap节点失败: {e}")
            # 返回一个基础节点
            return Node(
                scene=f"基于创意'{idea}'的故事开始了...",
                node_type=NodeType.SCENE
            )
    
    def generate_next_node(self, cur_node: Node, cur_state: dict, selected_action: Optional[Action] = None) -> Node:
        """
        函数2: 根据当前节点 & 世界状态生成下一节点（自动附动作）
        输入: 当前节点、当前world_state、选择的动作
        输出: 新的Node对象
        """
        
        current_scene = cur_node.scene
        world_state = cur_state
        
        # 构建基于选择动作的prompt和回忆引导
        action_context = ""
        if selected_action:
            action_context = f"""

玩家选择的动作: {selected_action.description}
动作效果预期: {selected_action.metadata.get('effects', {}).get('world_state_changes', '未知')}

请先回忆类似情节发展：
- 在你知道的经典作品中，类似的选择通常会导致什么样的结果？
- 这种行动在故事中一般会引发什么样的情节转折？
- 有哪些经典的情节发展模式可以参考？

然后基于这些回忆和当前情况，生成与动作直接相关的下一个场景。"""
        else:
            action_context = f"""

请先回忆当前场景类型的经典发展模式：
- 类似的场景在经典作品中通常如何发展？
- 这种情况下一般会出现什么样的转折或新元素？
- 有什么经典的剧情推进方式可以借鉴？"""
        
        prompt = f"""
你是一个互动小说生成器。根据当前剧情节点、世界状态和玩家的选择，生成下一个剧情节点。

当前场景: {current_scene}

当前世界状态: {json.dumps(world_state, ensure_ascii=False, indent=2)}{action_context}

请生成下一个节点的JSON格式:
{{
    "scene": "下一段主线剧情（1-2段文字，承接上一个场景）",
    "world_state": {{
        "time": "更新后的时间",
        "location": "当前地点（可能变化）",
        "characters": ["当前相关角色"],
        "key_facts": ["重要事实更新"]
    }},
    "events": [
        {{
            "speaker": "店小二",
            "content": "客官，来杯热茶吗？",
            "timestamp": 1,
            "event_type": "dialogue"
        }},
        {{
            "speaker": "",
            "content": "街上传来马蹄声",
            "timestamp": 2,
            "event_type": "narration"
        }}
    ],
    "chapter_actions": [
        {{
            "id": "action_1",
            "description": "玩家选择描述",
            "navigation": "continue|stay",
            "is_key_action": true,
            "response": "stay时的反馈文本（可选）",
            "effects": {{
                "world_state_changes": "对世界状态的影响"
            }}
        }},
        {{
            "id": "action_2",
            "description": "玩家选择描述2", 
            "navigation": "continue",
            "is_key_action": true,
            "effects": {{
                "world_state_changes": "对世界状态的影响"
            }}
        }}
    ]
}}

要求:
- **scene必须直接体现玩家选择的动作结果**，承接上一个场景和动作的后果
- 如果有玩家动作，场景应该展现这个动作的直接影响和后续发展
- events是独立的背景对话或环境描述，**不包含在scene主线中**：
  * 例如：路人闲聊、远处的声音、环境细节等
  * 这些不影响主线剧情，纯粹是氛围
- chapter_actions包含3-4个动作：
  * 1-2个continue动作：推进到下一个场景
  * 1-2个stay动作：在当前场景做事但不离开
- navigation类型：
  * "continue": 推进到下一个节点  
  * "stay": 停留在原地但产生效果
- 保持故事连贯性，尽可能少改动原有设定
"""

        messages = [
            {"role": "system", "content": "你是专业的互动小说生成器，擅长创造连贯的剧情发展和有趣的选择分支。"},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response_data = self.llm_client.generate_json_response(messages)
            
            # 创建新的Node对象
            node = Node(
                scene=response_data.get("scene", "剧情继续发展..."),
                node_type=NodeType.SCENE,
                metadata={
                    "world_state": response_data.get("world_state", world_state),
                    "chapter_actions": response_data.get("chapter_actions", [])
                }
            )
            
            # 添加events（背景对话和环境描述）
            for event_data in response_data.get("events", []):
                event = Event(
                    speaker=event_data.get("speaker", ""),
                    content=event_data.get("content", ""),
                    timestamp=event_data.get("timestamp", 0),
                    event_type=event_data.get("event_type", "dialogue")
                )
                node.add_event(event)
            
            # 添加chapter_actions
            for action_data in response_data.get("chapter_actions", []):
                action = Action(
                    id=action_data.get("id", str(uuid.uuid4())),
                    description=action_data.get("description", ""),
                    is_key_action=action_data.get("is_key_action", True),
                    metadata={
                        "navigation": action_data.get("navigation", "continue"),
                        "response": action_data.get("response", ""),
                        "effects": action_data.get("effects", {})
                    }
                )
                
                binding = ActionBinding(action=action, target_node=None, target_event=None)
                node.outgoing_actions.append(binding)
            
            return node
            
        except Exception as e:
            print(f"生成下一个节点失败: {e}")
            # 返回一个基础的下一个节点
            return Node(
                scene="故事继续发展，新的挑战出现了...",
                node_type=NodeType.SCENE,
                metadata={"world_state": world_state}
            )
    
    def apply_action(self, node: Node, action_id: str, state: dict) -> Tuple[Optional[Node], dict, str]:
        """
        函数3: 执行玩家点的动作；若jump返回下个节点，否则留在原节点
        输入: 节点、动作ID、当前状态  
        输出: (next_node_or_None, new_state, response_text)
        """
        
        # 查找指定的action（现在所有actions都在chapter_actions中）
        target_action = None
        
        for binding in node.outgoing_actions:
            if binding.action.id == action_id:
                target_action = binding.action
                break
        
        if not target_action:
            return None, state, "未找到指定的动作。"
        
        # 处理不同类型的动作
        new_state = state.copy()
        
        # 所有actions都是chapter_actions，根据is_key_action和navigation区分
        navigation = target_action.metadata.get("navigation", "continue") 
        response_text = target_action.metadata.get("response", "")
        effects = target_action.metadata.get("effects", {})
        
        # 更新世界状态
        if "world_state_changes" in effects:
            if "action_history" not in new_state:
                new_state["action_history"] = []
            new_state["action_history"].append({
                "type": "continue_action" if navigation == "continue" else "stay_action",
                "action": target_action.description,
                "effects": effects["world_state_changes"]
            })
        
        # 根据navigation类型处理
        if navigation == "stay":
            # 停留原地但产生效果
            if not response_text:
                response_text = f"你{target_action.description}。{effects.get('world_state_changes', '产生了一些变化')}"
            return None, new_state, response_text
        
        elif navigation == "continue":
            # 生成下一个节点，推进剧情
            try:
                next_node = self.generate_next_node(node, new_state, target_action)
                response_text = f"你选择了：{target_action.description}。剧情继续发展..."
                return next_node, new_state, response_text
            except Exception as e:
                print(f"生成下一个节点失败: {e}")
                return None, new_state, f"你选择了：{target_action.description}，但是剧情暂时无法继续。"
        
        else:
            # 未知的navigation类型
            return None, new_state, f"你选择了：{target_action.description}"


# 便捷的使用函数
def create_story_from_idea(idea: str) -> Tuple[Node, dict]:
    """从一个创意开始创建故事"""
    generator = NarrativeGenerator()
    
    # 生成第一个节点
    first_node = generator.bootstrap_node(idea)
    
    # 初始化世界状态
    initial_state = first_node.metadata.get("world_state", {
        "time": "故事开始",
        "location": "未知",
        "characters": [],
        "key_facts": []
    })
    
    return first_node, initial_state


def continue_story(current_node: Node, action_id: str, current_state: dict) -> Tuple[Optional[Node], dict, str]:
    """继续故事发展"""
    generator = NarrativeGenerator()
    return generator.apply_action(current_node, action_id, current_state)


# 示例用法
if __name__ == "__main__":
    # 测试创建故事
    print("=== 测试从创意生成故事 ===")
    idea = "若诸葛亮没死，他会如何改变三国的历史"
    
    try:
        first_node, initial_state = create_story_from_idea(idea)
        print(f"故事开始: {first_node.scene}")
        print(f"初始状态: {initial_state}")
        print(f"可选动作数: {len(first_node.outgoing_actions)}")
        
        for i, binding in enumerate(first_node.outgoing_actions):
            print(f"  {i+1}. {binding.action.description}")
        
    except Exception as e:
        print(f"测试失败: {e}") 