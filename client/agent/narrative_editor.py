"""
narrative_editor.py

这个模块提供了一个 `NarrativeEditor` 类，用于处理对 `Node` 对象的所有用户驱动的修改。
这包括重新生成部分内容、编辑文本、添加/删除/修改动作和事件，以及用户自定义节点创建和连接。
"""

import uuid
from typing import Dict, List, Optional, Tuple, Any

# 兼容包内导入和直接运行
try:
    from .narrative_generator import NarrativeGenerator
    from ..utils.narrative_graph import Node, Action, Event, ActionBinding, NodeType, NarrativeGraph
except (ImportError, SystemError):
    import os, sys
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    sys.path.insert(0, os.path.dirname(current_dir))
    from narrative_generator import NarrativeGenerator # type: ignore
    from client.utils.narrative_graph import Node, Action, Event, ActionBinding, NodeType, NarrativeGraph # type: ignore


class NarrativeEditor:
    """处理对Node对象的所有用户驱动的修改，包括自定义节点创建和连接"""

    def __init__(self, generator: NarrativeGenerator, narrative_graph: Optional[NarrativeGraph] = None):
        self.generator = generator
        self.narrative_graph = narrative_graph or NarrativeGraph("User Story")

    # ============== 原有编辑功能 ==============
    
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

    # ============== 用户自定义节点创建功能 ==============
    
    def polish_scene_description(self, raw_description: str, context: str = "") -> str:
        """
        AI润色用户提供的节点描述
        
        Args:
            raw_description: 用户的原始描述
            context: 额外上下文信息
            
        Returns:
            润色后的场景描述
        """
        print(f"✨ 正在润色场景描述...")
        try:
            # 使用generator的场景生成功能来润色
            polished_scene = self.generator.generate_scene_only(
                f"用户原始创意: {raw_description}\n\n请将这个创意润色成优美的场景描述。{context}"
            )
            print(f"✅ 场景描述润色完成")
            return polished_scene
        except Exception as e:
            print(f"❌ 场景润色失败: {e}")
            return raw_description
    
    def generate_events_for_scene(self, scene_description: str, context: str = "") -> List[Dict]:
        """
        根据场景描述生成配套的events
        
        Args:
            scene_description: 场景描述
            context: 额外上下文
            
        Returns:
            生成的事件列表
        """
        print(f"🎭 正在为场景生成背景事件...")
        try:
            events_data = self.generator.generate_events_only(scene_description, context)
            print(f"✅ 生成了 {len(events_data)} 个背景事件")
            return events_data
        except Exception as e:
            print(f"❌ 事件生成失败: {e}")
            return []
    
    def generate_actions_for_scene(self, scene_description: str, context: str = "", current_state: Dict = None) -> List[Dict]:
        """
        根据场景描述生成可能的actions
        
        Args:
            scene_description: 场景描述  
            context: 额外上下文
            current_state: 当前世界状态
            
        Returns:
            生成的动作列表
        """
        print(f"🎮 正在为场景生成可选动作...")
        try:
            actions_data = self.generator.generate_actions_only(scene_description, context, current_state)
            print(f"✅ 生成了 {len(actions_data)} 个可选动作")
            return actions_data
        except Exception as e:
            print(f"❌ 动作生成失败: {e}")
            return []
    
    def create_assisted_node(self, 
                           raw_description: str,
                           polish_scene: bool = True,
                           generate_events: bool = True, 
                           generate_actions: bool = True,
                           context: str = "",
                           world_state: Optional[Dict] = None) -> Node:
        """
        创建AI辅助的自定义节点
        
        Args:
            raw_description: 用户的原始节点描述
            polish_scene: 是否润色场景描述
            generate_events: 是否生成背景事件
            generate_actions: 是否生成可选动作
            context: 额外上下文信息
            world_state: 世界状态信息
            
        Returns:
            创建的节点
        """
        print(f"🤖 正在创建AI辅助的自定义节点...")
        
        # 1. 润色场景描述
        if polish_scene:
            scene_text = self.polish_scene_description(raw_description, context)
        else:
            scene_text = raw_description
        
        # 2. 生成背景事件
        events_data = None
        if generate_events:
            events_data = self.generate_events_for_scene(scene_text, context)
        
        # 3. 生成可选动作
        actions_data = None  
        if generate_actions:
            actions_data = self.generate_actions_for_scene(scene_text, context, world_state)
        
        # 4. 创建完整节点
        node = self.create_custom_node(
            scene_text=scene_text,
            events=events_data,
            actions=actions_data,
            world_state=world_state
        )
        
        print(f"✅ AI辅助节点创建完成: {node.id}")
        return node
    
    def enhance_existing_node(self, 
                            node: Node,
                            regenerate_events: bool = False,
                            regenerate_actions: bool = False,
                            polish_scene: bool = False,
                            context: str = "") -> Node:
        """
        增强现有节点（添加或重新生成内容）
        
        Args:
            node: 现有节点
            regenerate_events: 是否重新生成事件
            regenerate_actions: 是否重新生成动作
            polish_scene: 是否重新润色场景
            context: 额外上下文
            
        Returns:
            增强后的节点
        """
        print(f"🔧 正在增强现有节点: {node.id}")
        
        current_state = node.metadata.get("world_state", {})
        
        # 润色场景
        if polish_scene:
            polished_scene = self.polish_scene_description(node.scene, context)
            node.scene = polished_scene
        
        # 重新生成事件
        if regenerate_events:
            new_events_data = self.generate_events_for_scene(node.scene, context)
            # 清空现有事件
            node.events.clear()
            # 添加新事件
            for event_data in new_events_data:
                event = Event(
                    speaker=event_data.get("speaker", ""),
                    content=event_data.get("content", ""),
                    timestamp=event_data.get("timestamp", 0),
                    event_type=event_data.get("event_type", "dialogue")
                )
                node.add_event(event)
        
        # 重新生成动作
        if regenerate_actions:
            new_actions_data = self.generate_actions_for_scene(node.scene, context, current_state)
            # 保留原有的用户自定义动作，只替换AI生成的动作
            user_actions = [binding for binding in node.outgoing_actions 
                          if binding.action.metadata.get("user_created", False)]
            
            # 清空所有动作
            node.outgoing_actions.clear()
            
            # 重新添加用户动作
            node.outgoing_actions.extend(user_actions)
            
            # 添加新生成的动作
            for action_data in new_actions_data:
                action = Action(
                    id=f"enhanced_action_{str(uuid.uuid4())[:8]}",
                    description=action_data.get("description", ""),
                    is_key_action=(action_data.get("navigation", "continue") == "continue"),
                    metadata={
                        "navigation": action_data.get("navigation", "continue"),
                        "response": action_data.get("response", ""),
                        "effects": action_data.get("effects", {}),
                        "ai_generated": True
                    }
                )
                binding = ActionBinding(action=action)
                node.outgoing_actions.append(binding)
        
        print(f"✅ 节点增强完成")
        return node

    def create_custom_node(self, 
                          scene_text: str,
                          events: Optional[List[Dict]] = None,
                          actions: Optional[List[Dict]] = None,
                          world_state: Optional[Dict] = None) -> Node:
        """
        创建一个完全用户自定义的节点
        
        Args:
            scene_text: 场景描述文本
            events: 事件列表，格式: [{"speaker": "...", "content": "...", "event_type": "dialogue/narration"}]
            actions: 动作列表，格式: [{"description": "...", "navigation": "continue/stay", "effects": {...}}]
            world_state: 可选的世界状态信息
            
        Returns:
            创建的节点对象
        """
        print(f"🛠️ 正在创建用户自定义节点...")
        
        # 创建基础节点
        node = Node(scene=scene_text, node_type=NodeType.SCENE)
        
        # 添加世界状态信息
        if world_state:
            node.metadata["world_state"] = world_state
        else:
            # 创建基础世界状态
            node.metadata["world_state"] = {
                "location": "用户自定义场景",
                "time": "未指定",
                "characters": {},
                "key_facts": [],
                "custom_created": True
            }
        
        # 添加事件
        if events:
            for i, event_data in enumerate(events):
                event = Event(
                    speaker=event_data.get("speaker", ""),
                    content=event_data.get("content", ""),
                    timestamp=i + 1,
                    event_type=event_data.get("event_type", "dialogue")
                )
                node.add_event(event)
        
        # 添加动作
        if actions:
            for action_data in actions:
                action = Action(
                    id=f"custom_action_{str(uuid.uuid4())[:8]}",
                    description=action_data.get("description", ""),
                    is_key_action=(action_data.get("navigation", "continue") == "continue"),
                    metadata={
                        "navigation": action_data.get("navigation", "continue"),
                        "response": action_data.get("response", ""),
                        "effects": action_data.get("effects", {}),
                        "user_created": True
                    }
                )
                binding = ActionBinding(action=action)
                node.outgoing_actions.append(binding)
        
        # 将节点添加到故事图中
        self.narrative_graph.nodes[node.id] = node
        
        print(f"✅ 用户自定义节点已创建: {node.id}")
        return node
    
    def create_quick_node(self, scene_text: str, action_descriptions: List[str] = None) -> Node:
        """
        快速创建节点的简化接口
        
        Args:
            scene_text: 场景描述
            action_descriptions: 动作描述列表，默认为continue类型
            
        Returns:
            创建的节点
        """
        actions = []
        if action_descriptions:
            for desc in action_descriptions:
                actions.append({
                    "description": desc,
                    "navigation": "continue",
                    "effects": {"world_state_changes": f"选择了: {desc}"}
                })
        
        return self.create_custom_node(scene_text, actions=actions)
    
    # ============== 节点连接管理功能 ==============
    
    def connect_nodes(self, 
                     from_node: Node, 
                     to_node: Node, 
                     action_description: str,
                     navigation_type: str = "continue",
                     action_effects: Optional[Dict] = None) -> bool:
        """
        连接两个节点
        
        Args:
            from_node: 源节点
            to_node: 目标节点
            action_description: 连接动作的描述
            navigation_type: 导航类型 ("continue" 或 "stay")
            action_effects: 动作效果
            
        Returns:
            连接是否成功
        """
        try:
            # 创建连接动作
            connection_action = Action(
                id=f"connection_{str(uuid.uuid4())[:8]}",
                description=action_description,
                is_key_action=(navigation_type == "continue"),
                metadata={
                    "navigation": navigation_type,
                    "response": action_effects.get("response", "") if action_effects else "",
                    "effects": action_effects.get("effects", {}) if action_effects else {},
                    "connection_created": True
                }
            )
            
            # 创建绑定
            if navigation_type == "continue":
                binding = ActionBinding(action=connection_action, target_node=to_node)
            else:
                # stay类型的动作不直接连接到其他节点
                binding = ActionBinding(action=connection_action)
            
            # 添加到源节点
            from_node.outgoing_actions.append(binding)
            
            print(f"✅ 节点连接已建立: {from_node.id} -> {to_node.id} (动作: {action_description})")
            return True
            
        except Exception as e:
            print(f"❌ 节点连接失败: {e}")
            return False
    
    def connect_nodes_by_id(self, 
                           from_node_id: str, 
                           to_node_id: str, 
                           action_description: str,
                           navigation_type: str = "continue") -> bool:
        """
        通过节点ID连接节点
        """
        from_node = self.narrative_graph.get_node(from_node_id)
        to_node = self.narrative_graph.get_node(to_node_id)
        
        if not from_node:
            print(f"❌ 错误: 未找到源节点 {from_node_id}")
            return False
        
        if not to_node:
            print(f"❌ 错误: 未找到目标节点 {to_node_id}")
            return False
        
        return self.connect_nodes(from_node, to_node, action_description, navigation_type)
    
    def disconnect_nodes(self, from_node: Node, action_id: str) -> bool:
        """
        断开节点连接（删除指定的连接动作）
        """
        for i, binding in enumerate(from_node.outgoing_actions):
            if binding.action.id == action_id:
                del from_node.outgoing_actions[i]
                print(f"✅ 节点连接已断开: 动作 {action_id}")
                return True
        
        print(f"❌ 错误: 未找到连接动作 {action_id}")
        return False
    
    def get_node_connections(self, node: Node) -> Dict[str, List[Dict]]:
        """
        获取节点的所有连接信息
        
        Returns:
            连接信息字典，包含outgoing和incoming连接
        """
        connections = {
            "outgoing": [],
            "incoming": []
        }
        
        # 获取出向连接
        for binding in node.outgoing_actions:
            connection_info = {
                "action_id": binding.action.id,
                "action_description": binding.action.description,
                "navigation_type": binding.action.metadata.get("navigation", "continue"),
                "target_node_id": binding.target_node.id if binding.target_node else None,
                "target_scene_preview": binding.target_node.scene[:50] + "..." if binding.target_node and len(binding.target_node.scene) > 50 else binding.target_node.scene if binding.target_node else None
            }
            connections["outgoing"].append(connection_info)
        
        # 获取入向连接（需要遍历所有节点）
        for other_node in self.narrative_graph.nodes.values():
            if other_node.id == node.id:
                continue
            for binding in other_node.outgoing_actions:
                if binding.target_node and binding.target_node.id == node.id:
                    connection_info = {
                        "source_node_id": other_node.id,
                        "source_scene_preview": other_node.scene[:50] + "..." if len(other_node.scene) > 50 else other_node.scene,
                        "action_id": binding.action.id,
                        "action_description": binding.action.description
                    }
                    connections["incoming"].append(connection_info)
        
        return connections
    
    # ============== 故事图管理功能 ==============
    
    def create_story_branch(self, 
                           from_node: Node, 
                           branch_choices: List[Tuple[str, str]]) -> List[Node]:
        """
        从一个节点创建多个分支
        
        Args:
            from_node: 源节点
            branch_choices: 分支选择列表，格式: [(action_description, scene_text), ...]
            
        Returns:
            创建的分支节点列表
        """
        branch_nodes = []
        
        for action_desc, scene_text in branch_choices:
            # 创建分支节点
            branch_node = self.create_quick_node(scene_text)
            branch_nodes.append(branch_node)
            
            # 连接节点
            self.connect_nodes(from_node, branch_node, action_desc)
        
        print(f"✅ 已为节点 {from_node.id} 创建 {len(branch_nodes)} 个分支")
        return branch_nodes
    
    def clone_node(self, original_node: Node, modify_scene: str = None) -> Node:
        """
        克隆一个节点，可选择性修改场景文本
        """
        # 准备事件数据
        events_data = []
        for event in original_node.events:
            events_data.append({
                "speaker": event.speaker,
                "content": event.content,
                "event_type": event.event_type
            })
        
        # 准备动作数据（但不包含目标节点连接）
        actions_data = []
        for binding in original_node.outgoing_actions:
            actions_data.append({
                "description": binding.action.description,
                "navigation": binding.action.metadata.get("navigation", "continue"),
                "response": binding.action.metadata.get("response", ""),
                "effects": binding.action.metadata.get("effects", {})
            })
        
        # 创建克隆节点
        cloned_node = self.create_custom_node(
            scene_text=modify_scene or original_node.scene,
            events=events_data,
            actions=actions_data,
            world_state=original_node.metadata.get("world_state", {}).copy()
        )
        
        print(f"✅ 节点已克隆: {original_node.id} -> {cloned_node.id}")
        return cloned_node
    
    def get_story_graph_overview(self) -> Dict[str, Any]:
        """
        获取故事图的概览信息
        """
        stats = self.narrative_graph.get_graph_stats()
        
        overview = {
            "basic_stats": stats,
            "nodes_summary": [],
            "connections_count": 0,
            "isolated_nodes": []
        }
        
        total_connections = 0
        
        for node_id, node in self.narrative_graph.nodes.items():
            connections = self.get_node_connections(node)
            outgoing_count = len(connections["outgoing"])
            incoming_count = len(connections["incoming"])
            
            total_connections += outgoing_count
            
            node_summary = {
                "id": node_id,
                "scene_preview": node.scene[:100] + "..." if len(node.scene) > 100 else node.scene,
                "outgoing_connections": outgoing_count,
                "incoming_connections": incoming_count,
                "events_count": len(node.events),
                "is_isolated": outgoing_count == 0 and incoming_count == 0
            }
            
            overview["nodes_summary"].append(node_summary)
            
            if node_summary["is_isolated"]:
                overview["isolated_nodes"].append(node_id)
        
        overview["connections_count"] = total_connections
        
        return overview 