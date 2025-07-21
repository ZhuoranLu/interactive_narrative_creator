"""
narrative_editor.py

这个模块提供了一个 `NarrativeEditor` 类，用于处理对 `Node` 对象的所有用户驱动的修改。
这包括重新生成部分内容、编辑文本、添加/删除/修改动作和事件。
"""

import uuid
from typing import Dict, List, Optional

# 兼容包内导入和直接运行
try:
    from .narrative_generator import NarrativeGenerator
    from ..utils.narrative_graph import Node, Action, Event, ActionBinding, NodeType
except (ImportError, SystemError):
    import os, sys
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    sys.path.insert(0, os.path.dirname(current_dir))
    from narrative_generator import NarrativeGenerator # type: ignore
    from client.utils.narrative_graph import Node, Action, Event, ActionBinding, NodeType # type: ignore


class NarrativeEditor:
    """处理对Node对象的所有用户驱动的修改"""

    def __init__(self, generator: NarrativeGenerator):
        self.generator = generator

    # Feature 1: Regenerate parts
    def regenerate_part(self, node: Node, part_to_regenerate: str, context: str = "") -> Node:
        """
        重新生成节点的指定部分 (scene, events, or actions).
        """
        print(f"🔄 正在重新生成 '{part_to_regenerate}'...")
        # 假设generator有一个regenerate_part方法
        return self.generator.regenerate_part(node, part_to_regenerate, context, node.metadata.get("world_state", {}))

    # Feature 2: Edit scene
    def edit_scene(self, node: Node, new_scene_text: str) -> Node:
        """直接编辑场景文本"""
        node.scene = new_scene_text
        print("✅ 场景已更新。")
        return node

    # Feature 3: Add a new action
    def add_action(self, node: Node, description: str, navigation_type: str, effects: Optional[Dict] = None) -> Node:
        """
        添加一个新动作。如果effects为None，则由AI生成。
        """
        if navigation_type not in ["continue", "stay"]:
            print("❌ 错误: navigation类型必须是 'continue' 或 'stay'。")
            return node

        if effects is None:
            print("🤖 正在为新动作生成效果...")
            generated_effects = self.generator.generate_effects_for_action(node.scene, description)
            response = generated_effects.get("response", "")
            world_state_changes = generated_effects.get("effects", {}).get("world_state_changes", "没有明显变化。")
            effects = {
                "response": response,
                "effects": {"world_state_changes": world_state_changes}
            }
        
        new_action = Action(
            id=f"user_action_{str(uuid.uuid4())[:8]}",
            description=description,
            is_key_action=(navigation_type == "continue"),
            metadata={
                "navigation": navigation_type,
                "response": effects.get("response", ""),
                "effects": effects.get("effects", {})
            }
        )
        binding = ActionBinding(action=new_action)
        node.outgoing_actions.append(binding)
        print(f"✅ 新动作已添加: '{description}'")
        return node

    # Feature 4: Edit an action's text
    def edit_action_description(self, node: Node, action_id: str, new_description: str) -> Node:
        """修改现有动作的描述文本"""
        for binding in node.outgoing_actions:
            if binding.action.id == action_id:
                binding.action.description = new_description
                print(f"✅ 动作 '{action_id}' 的描述已更新。")
                return node
        print(f"❌ 错误: 未找到ID为 '{action_id}' 的动作。")
        return node

    # Feature 5: Delete an action
    def delete_action(self, node: Node, action_id: str) -> Node:
        """从节点中删除一个动作"""
        action_to_delete = None
        for binding in node.outgoing_actions:
            if binding.action.id == action_id:
                action_to_delete = binding
                break
        
        if action_to_delete:
            node.outgoing_actions.remove(action_to_delete)
            print(f"✅ 动作 '{action_id}' 已删除。")
        else:
            print(f"❌ 错误: 未找到ID为 '{action_id}' 的动作。")
        return node

    # Feature 6: Add or delete dialogue in events
    def add_dialogue_event(self, node: Node, speaker: str, content: str) -> Node:
        """在事件列表中添加一个新的对话事件"""
        new_event = Event(
            speaker=speaker,
            content=content,
            timestamp=len(node.events) + 1,
            event_type="dialogue"
        )
        node.add_event(new_event)
        print(f"✅ 新对话已添加: {speaker}: {content}")
        return node

    def delete_event(self, node: Node, event_id: str) -> Node:
        """根据ID删除一个事件"""
        if node.remove_event(event_id):
            print(f"✅ 事件 '{event_id}' 已删除。")
        else:
            print(f"❌ 错误: 未找到ID为 '{event_id}' 的事件。")
        return node 