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
    
    def __init__(self, llm_client: LLMClient, world_setting: str = "", characters: list = None, cp: str = "", style: str = "", tags: list = None):
        """NarrativeGenerator 可配置: 世界设定、角色、CP、风格、标签
        这些额外信息主要用于 prompt 构建，当前实现仅保存，后续可在 prompt 中引用。"""
        self.llm_client = llm_client
        self.world_setting = world_setting
        self.characters = characters or []
        self.cp = cp
        self.style = style
        self.tags = tags or []

        # 便捷的 prompt 上下文构建函数
    def _build_prompt_context(self) -> str:
        parts = []
        if self.world_setting:
            parts.append(f"【世界观】{self.world_setting}")
        if self.characters:
            parts.append(f"【角色】{', '.join(self.characters)}")
        if self.cp:
            parts.append(f"【CP】{self.cp}")
        if self.style:
            parts.append(f"【风格】{self.style}")
        if self.tags:
            parts.append(f"【标签】{', '.join(self.tags)}")
        return "\n".join(parts)

    def _recall_and_analyze(self, text: str) -> str:
        """让LLM回忆相似作品并分析风格"""

        return f"创意: {text}\n\n请基于这个创意，回忆相关的经典作品或故事类型，然后以相应的风格进行创作。"

    def bootstrap_node(self, idea: str) -> Node:
        """函数1: 把一句创意生成第1个节点 (重构)"""
        try:
            recall_context = self._recall_and_analyze(idea)
            
            scene = self.generate_scene_only(idea)
            events_data = self.generate_events_only(scene, recall_context)
            actions_data = self.generate_actions_only(scene, recall_context)
            
            node = self.compose_node(scene, events_data, actions_data)
            
            # 动态生成初始世界状态
            initial_state = self.generate_world_state(f"{idea}\n\n开场场景: {scene}", is_initial=True)
            node.metadata["world_state"] = initial_state
            
            return node
        except Exception as e:
            print(f"生成bootstrap节点失败: {e}")
            return Node(scene=f"基于创意'{idea}'的故事开始了...", node_type=NodeType.SCENE)

    def generate_next_node(self, cur_node: Node, cur_state: dict, selected_action: Optional[Action] = None) -> Node:
        """函数2: 根据当前节点 & 世界状态生成下一节点 (重构)"""
        try:
            context = f"当前场景: {cur_node.scene}\n世界状态: {json.dumps(cur_state, ensure_ascii=False)}"
            action_desc = selected_action.description if selected_action else "无"
            if selected_action:
                context += f"\n主人公的行动: {action_desc}"
            
            scene = self.generate_scene_only(context, cur_state, action_desc)
            events_data = self.generate_events_only(scene, context)
            actions_data = self.generate_actions_only(scene, context, cur_state)
            
            node = self.compose_node(scene, events_data, actions_data)
            
            # 动态生成更新后的世界状态
            update_context = f"前序场景: {cur_node.scene}\n选择的行动: {action_desc}\n新场景: {scene}"
            updated_state = self.generate_world_state(update_context, is_initial=False)

            # 合并状态，确保连续性
            final_state = cur_state.copy()
            final_state.update(updated_state)
            node.metadata["world_state"] = final_state
            
            return node
        except Exception as e:
            print(f"生成下一个节点失败: {e}")
            return Node(scene="故事继续发展，新的挑战出现了...", node_type=NodeType.SCENE, metadata={"world_state": cur_state})
    
    def apply_action(self, node: Node, action_id: str, state: dict) -> Tuple[Optional[Node], dict, str]:
        """
        函数3: 执行主人公的行动；若continue返回下个节点，否则留在原节点
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

    def generate_scene_only(self, idea_or_context: str, current_state: Dict = None, selected_action: str = None) -> str:
        """
        只生成场景描述
        """
        context_prompt = self._build_prompt_context()
        if selected_action:
            prompt = f"""
你是一位文学功底深厚的小说家以及游戏情节设计大师。根据当前情况和主人公的行动，创作新的精彩场景。
用户设定：{context_prompt}
当前情况: {idea_or_context}
主人公行动: {selected_action}
世界状态: {json.dumps(current_state or {}, ensure_ascii=False, indent=2)}

请生成一个生动的场景描述，1-2段文字，展现主人公行动的直接结果和后续发展。
只需要返回场景描述文本，不需要JSON格式。
"""
        else:
            prompt = f"""
你是一位擅长开篇的小说家。根据故事创意撰写引人入胜的开场。

创意: {idea_or_context}

请生成一个引人入胜的开场场景描述，1-2段文字，为后续的互动故事奠定基础。
只需要返回场景描述文text，不需要JSON格式。
"""
        
        messages = [
            {"role": "system", "content": "你是文学界知名的小说家，特别擅长环境描写和场景营造，能够用优美细腻的文字让读者身临其境。"},
            {"role": "user", "content": prompt}
        ]
        
        response = self.llm_client.generate_response(messages)
        return response.strip()
    
    def generate_events_only(self, scene: str, context: str = "") -> List[Dict]:
        """
        只生成背景事件
        """
        context_prompt = self._build_prompt_context()
        prompt = f"""
你是善于细节描写的小说家。根据主要场景，添加丰富的背景细节和氛围描写。
用户设定：{context_prompt}
当前场景: {scene}
{f"上下文: {context}" if context else ""}

请生成2-4个背景事件，这些事件：
- 是独立的对话或环境描述
- 不包含在主线剧情中
- 纯粹用于氛围营造
- 例如：路人对话、环境音效、背景细节

请返回JSON数组格式：
[
    {{
        "speaker": "路人甲",
        "content": "对话内容",
        "timestamp": 1,
        "event_type": "dialogue"
    }},
    {{
        "speaker": "",
        "content": "环境描述",
        "timestamp": 2,
        "event_type": "narration"
    }}
]
"""
        
        messages = [
            {"role": "system", "content": "你是文笔细腻的小说家，擅长通过背景细节和环境描写来烘托故事氛围，增强读者的沉浸感。"},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response_data = self.llm_client.generate_json_response(messages)
            # 兼容两种格式：直接数组 或 {"events": [...]} 
            if isinstance(response_data, list):
                return response_data
            if isinstance(response_data, dict):
                events = (response_data.get("events") 
                         or response_data.get("background_events")
                         or response_data.get("result") 
                         or response_data.get("data"))
                if isinstance(events, list):
                    return events
            print(f"背景事件响应格式错误: {response_data}")
            return []
        except Exception as e:
            print(f"背景事件生成失败: {e}")
            return []
    
    def generate_actions_only(self, scene: str, context: str = "", current_state: Dict = None) -> List[Dict]:
        """只生成动作选项 (已修复)"""
        context_prompt = self._build_prompt_context()
        prompt = f"""
你是擅长创作互动小说的作家。根据当前情节，为主人公设计富有戏剧张力的行动选择。
用户设定: {context_prompt}
当前场景: {scene}
{f"上下文: {context}" if context else ""}
世界状态: {json.dumps(current_state or {}, ensure_ascii=False, indent=2)}

请生成3-4个动作选项：
- 1-2个continue动作：推进剧情到下一个场景
- 1-2个stay动作：在当前场景做事但不离开
- 关于行为的描述要精炼

请返回JSON数组:
[
    {{
        "id": "action_1",
        "description": "推进剧情的选择",
        "navigation": "continue",
        "effects": {{
            "world_state_changes": "状态变化描述"
        }}
    }},
    {{
        "id": "action_2",
        "description": "留在原地的动作",
        "navigation": "stay",
        "response": "执行后的反馈",
        "effects": {{
            "world_state_changes": "轻微状态变化"
        }}
    }}
]
"""
        
        messages = [
            {"role": "system", "content": "你是经验丰富的互动小说作家，深谙故事节奏和戏剧冲突，能够设计出既符合人物性格又推动情节发展的关键选择。"},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response_data = self.llm_client.generate_json_response(messages)
            if isinstance(response_data, list):
                return response_data
            if isinstance(response_data, dict):
                actions = (response_data.get("chapter_actions") 
                          or response_data.get("actions") 
                          or response_data.get("choices")
                          or response_data.get("options")  # <-- 新增
                          or response_data.get("result") 
                          or response_data.get("data"))
                if isinstance(actions, list):
                    return actions
            print(f"动作选择响应格式错误: {response_data}")
            return []
        except Exception as e:
            print(f"动作选择生成失败: {e}")
            return []

    def generate_effects_for_action(self, scene: str, action_description: str) -> Dict:
        """为用户自定义的动作生成效果"""
        context_prompt = self._build_prompt_context()
        prompt = f"""
你是一位经验丰富的叙事设计师。根据当前场景和用户提出的一个行动，预测这个行动可能产生的后果。

用户设定: {context_prompt}
当前场景: {scene}
主人公的行动: {action_description}

请只返回一个JSON对象，描述这个行动的效果:
{{
    "response": "当行动是'stay'类型时，给出的即时反馈文本。",
    "effects": {{
        "world_state_changes": "对世界状态、人物关系或剧情走向的详细影响描述。"
    }}
}}
"""
        messages = [
            {"role": "system", "content": "你是一个精确的JSON生成器，专注于预测和描述故事中的因果关系。"},
            {"role": "user", "content": prompt}
        ]
        try:
            return self.llm_client.generate_json_response(messages)
        except Exception as e:
            print(f"为动作生成效果失败: {e}")
            return {}

    def generate_world_state(self, context: str, is_initial: bool = False) -> Dict:
        """
        新增：根据上下文生成世界状态
        """
        prompt_instruction = "根据这个故事创意和开场，生成初始的世界状态。" if is_initial else "根据最新的剧情发展，更新世界状态。"

        prompt = f"""
你是一位严谨的世界观构建师。{prompt_instruction}

上下文:
{context}

请返回一个JSON对象，包含以下结构，并根据故事需要添加额外变量：
{{
    "time": "时间描述",
    "location": "地点描述",
    "characters": {{
        "主角名": "状态描述",
        "配角名": "状态描述"
    }},
    "key_facts": ["关键事实1", "关键事实2"],
    "story_variable_1": "值"
}}
"""
        messages = [
            {"role": "system", "content": "你是一个精确的数据生成器，总是返回格式正确的JSON。"},
            {"role": "user", "content": prompt}
        ]
        try:
            response_data = self.llm_client.generate_json_response(messages)
            if isinstance(response_data, dict):
                return response_data
            else:
                print(f"世界状态响应格式错误: {response_data}")
                return {"error": "format error"}
        except Exception as e:
            print(f"世界状态生成失败: {e}")
            return {"error": "generation failed"}

    def compose_node(self, scene: str, events_data: List[Dict] = None, actions_data: List[Dict] = None) -> Node:
        """
        将各部分组合成完整节点
        """
        # 创建节点
        node = Node(scene=scene, node_type=NodeType.SCENE)
        
        # 添加events
        for event_data in (events_data or []):
            event = Event(
                speaker=event_data.get("speaker", ""),
                content=event_data.get("content", ""),
                timestamp=event_data.get("timestamp", 0),
                event_type=event_data.get("event_type", "dialogue")
            )
            node.add_event(event)
        
        # 添加actions
        for action_data in (actions_data or []):
            navigation = action_data.get("navigation", "continue")
            action = Action(
                id=action_data.get("id", str(uuid.uuid4())),
                description=action_data.get("description", ""),
                is_key_action=(navigation == "continue"),  # continue动作是关键动作
                metadata={
                    "navigation": navigation,
                    "response": action_data.get("response", ""),
                    "effects": action_data.get("effects", {})
                }
            )
            binding = ActionBinding(action=action, target_node=None, target_event=None)
            node.outgoing_actions.append(binding)
        
        return node
    
    def regenerate_part(self, node: Node, part: str, context: str = "", current_state: Dict = None) -> Node:
        """
        重新生成节点的指定部分
        
        Args:
            node: 当前节点
            part: 要重新生成的部分 ("scene", "events", "actions")
            context: 额外上下文
            current_state: 当前世界状态
        """
        if part == "scene":
            new_scene = self.generate_scene_only(node.scene, current_state, context)
            node.scene = new_scene
            
        elif part == "events":
            new_events_data = self.generate_events_only(node.scene, context)
            # 清空现有events
            node.events.clear()
            # 添加新events
            for event_data in new_events_data:
                event = Event(
                    speaker=event_data.get("speaker", ""),
                    content=event_data.get("content", ""),
                    timestamp=event_data.get("timestamp", 0),
                    event_type=event_data.get("event_type", "dialogue")
                )
                node.add_event(event)
                
        elif part == "actions":
            new_actions_data = self.generate_actions_only(node.scene, context, current_state)
            # 清空现有actions
            node.outgoing_actions.clear()
            # 添加新actions
            for action_data in new_actions_data:
                action = Action(
                    id=action_data.get("id", str(uuid.uuid4())),
                    description=action_data.get("description", ""),
                    metadata={
                        "navigation": action_data.get("navigation", "continue"),
                        "response": action_data.get("response", ""),
                        "effects": action_data.get("effects", {})
                    }
                )
                binding = ActionBinding(action=action, target_node=None, target_event=None)
                node.outgoing_actions.append(binding)
        
        return node 