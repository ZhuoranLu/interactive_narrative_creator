#!/usr/bin/env python3
"""
生成完整的故事树结构示例

功能:
1. 生成一个根节点
2. 基于根节点的continue动作生成多个子节点
3. 构建完整的节点连接关系
4. 展示真实的树状结构
"""

import json
import sys
import os
from typing import Dict, List, Any

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(parent_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

from narrative_generator import NarrativeGenerator
from llm_client import LLMClient

def build_story_tree():
    """构建完整的故事树结构"""
    print("🌳 构建完整的故事树结构...")
    print("=" * 60)
    
    # 初始化生成器
    llm_client = LLMClient()
    generator = NarrativeGenerator(
        llm_client=llm_client,
        world_setting="现代都市悬疑",
        characters=["侦探林雨", "神秘来电者", "酒吧老板"],
        style="悬疑推理风格"
    )
    
    story_tree = {
        "metadata": {
            "title": "深夜来电",
            "description": "完整的故事树结构示例",
            "generator_settings": {
                "world_setting": "现代都市悬疑",
                "characters": ["侦探林雨", "神秘来电者", "酒吧老板"],
                "style": "悬疑推理风格"
            }
        },
        "nodes": {},
        "connections": []
    }
    
    # 1. 生成根节点
    print("📍 步骤1: 生成根节点")
    root_idea = "侦探在深夜的酒吧里接到一个神秘电话，声称知道失踪案的线索"
    root_node = generator.bootstrap_node(root_idea)
    root_world_state = root_node.metadata.get('world_state', {})
    
    print(f"✅ 根节点: {root_node.id}")
    print(f"   场景: {root_node.scene[:100]}...")
    print(f"   动作数: {len(root_node.outgoing_actions)}")
    
    # 保存根节点
    story_tree["nodes"][root_node.id] = {
        "level": 0,
        "type": "root",
        "data": root_node.to_dict()
    }
    story_tree["root_node_id"] = root_node.id
    
    # 找出所有continue动作
    continue_actions = []
    for binding in root_node.outgoing_actions:
        action = binding.action
        if action.is_key_action and action.metadata.get('navigation') == 'continue':
            continue_actions.append(action)
    
    print(f"\n🎯 根节点的continue动作 ({len(continue_actions)}个):")
    for i, action in enumerate(continue_actions):
        print(f"   {i+1}. [{action.id}] {action.description[:60]}...")
    
    # 2. 生成第一层子节点
    print(f"\n📍 步骤2: 生成第一层子节点")
    child_nodes = []
    
    for i, action in enumerate(continue_actions[:2]):  # 只生成前2个子节点
        print(f"\n🔗 执行动作: {action.description[:50]}...")
        
        try:
            child_node, new_state, response = generator.apply_action(
                root_node, action.id, root_world_state
            )
            
            if child_node:
                print(f"✅ 子节点{i+1}: {child_node.id}")
                print(f"   场景: {child_node.scene[:80]}...")
                print(f"   动作数: {len(child_node.outgoing_actions)}")
                
                # 保存子节点
                story_tree["nodes"][child_node.id] = {
                    "level": 1,
                    "type": "child",
                    "parent_node_id": root_node.id,
                    "parent_action_id": action.id,
                    "data": child_node.to_dict()
                }
                
                # 记录连接关系
                story_tree["connections"].append({
                    "from_node_id": root_node.id,
                    "to_node_id": child_node.id,
                    "action_id": action.id,
                    "action_description": action.description
                })
                
                child_nodes.append((child_node, new_state))
                
                # 更新根节点的target_node_id
                for binding in root_node.outgoing_actions:
                    if binding.action.id == action.id:
                        binding.target_node = child_node
                        break
                        
        except Exception as e:
            print(f"❌ 生成子节点{i+1}失败: {e}")
    
    # 3. 生成第二层子节点（孙节点）
    print(f"\n📍 步骤3: 生成第二层子节点")
    if child_nodes:
        first_child, child_state = child_nodes[0]
        
        # 找第一个子节点的continue动作
        child_continue_actions = [
            binding.action for binding in first_child.outgoing_actions 
            if binding.action.is_key_action and binding.action.metadata.get('navigation') == 'continue'
        ]
        
        if child_continue_actions:
            action = child_continue_actions[0]
            print(f"🔗 从子节点1执行动作: {action.description[:50]}...")
            
            try:
                grandchild_node, new_state, response = generator.apply_action(
                    first_child, action.id, child_state
                )
                
                if grandchild_node:
                    print(f"✅ 孙节点: {grandchild_node.id}")
                    print(f"   场景: {grandchild_node.scene[:80]}...")
                    
                    # 保存孙节点
                    story_tree["nodes"][grandchild_node.id] = {
                        "level": 2,
                        "type": "grandchild",
                        "parent_node_id": first_child.id,
                        "parent_action_id": action.id,
                        "data": grandchild_node.to_dict()
                    }
                    
                    # 记录连接关系
                    story_tree["connections"].append({
                        "from_node_id": first_child.id,
                        "to_node_id": grandchild_node.id,
                        "action_id": action.id,
                        "action_description": action.description
                    })
                    
            except Exception as e:
                print(f"❌ 生成孙节点失败: {e}")
    
    # 4. 更新根节点的target_node_id
    print(f"\n🔧 更新节点连接...")
    root_node_data = story_tree["nodes"][root_node.id]["data"]
    for action_binding in root_node_data["outgoing_actions"]:
        action_id = action_binding["action"]["id"]
        
        # 查找对应的连接
        for connection in story_tree["connections"]:
            if (connection["from_node_id"] == root_node.id and 
                connection["action_id"] == action_id):
                action_binding["target_node_id"] = connection["to_node_id"]
                print(f"   ✅ 动作 {action_id} -> 节点 {connection['to_node_id']}")
                break
    
    # 同样更新第一个子节点的连接
    if child_nodes:
        first_child_id = child_nodes[0][0].id
        if first_child_id in story_tree["nodes"]:
            child_data = story_tree["nodes"][first_child_id]["data"]
            for action_binding in child_data["outgoing_actions"]:
                action_id = action_binding["action"]["id"]
                
                for connection in story_tree["connections"]:
                    if (connection["from_node_id"] == first_child_id and 
                        connection["action_id"] == action_id):
                        action_binding["target_node_id"] = connection["to_node_id"]
                        break
    
    # 5. 生成树状结构统计
    print(f"\n📊 故事树统计:")
    print(f"   总节点数: {len(story_tree['nodes'])}")
    print(f"   连接数: {len(story_tree['connections'])}")
    print(f"   最大深度: {max([node['level'] for node in story_tree['nodes'].values()]) + 1}")
    
    # 6. 展示树结构
    print(f"\n🌳 完整的故事树结构:")
    root_id = story_tree["root_node_id"]
    root_scene = story_tree["nodes"][root_id]["data"]["scene"][:40]
    print(f"📖 根节点 [{root_id}]: {root_scene}...")
    
    for connection in story_tree["connections"]:
        if connection["from_node_id"] == root_id:
            child_id = connection["to_node_id"]
            child_scene = story_tree["nodes"][child_id]["data"]["scene"][:40]
            print(f"├── 🎬 子节点 [{child_id}]: {child_scene}...")
            print(f"│   (通过动作: {connection['action_description'][:30]}...)")
            
            # 查找孙节点
            for conn2 in story_tree["connections"]:
                if conn2["from_node_id"] == child_id:
                    grandchild_id = conn2["to_node_id"]
                    grandchild_scene = story_tree["nodes"][grandchild_id]["data"]["scene"][:40]
                    print(f"│   └── 🎭 孙节点 [{grandchild_id}]: {grandchild_scene}...")
                    print(f"│       (通过动作: {conn2['action_description'][:30]}...)")
    
    return story_tree

def save_story_tree(story_tree: Dict[str, Any]):
    """保存故事树到JSON文件"""
    filename = "complete_story_tree_example.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(story_tree, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 故事树已保存到: {filename}")
    print(f"   文件大小: {os.path.getsize(filename)} 字节")

def main():
    """主函数"""
    print("🚀 Interactive Narrative Creator - 故事树生成器")
    print("=" * 60)
    
    try:
        # 构建故事树
        story_tree = build_story_tree()
        
        # 保存到文件
        save_story_tree(story_tree)
        
        print(f"\n🎉 故事树构建完成!")
        print(f"📝 使用说明:")
        print(f"   1. 查看 complete_story_tree_example.json 了解完整结构")
        print(f"   2. 注意观察 target_node_id 的连接关系")
        print(f"   3. 理解 continue 动作如何形成分支")
        
    except Exception as e:
        print(f"❌ 故事树构建失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 