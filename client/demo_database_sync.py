#!/usr/bin/env python3
"""
Demo: Database-Syncing Narrative Editor

This script demonstrates how to use the new database synchronization features
for real-time editing of narrative nodes, events, and actions.
"""

import os
import sys

# Add paths for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.dirname(current_dir))

from plot.database_sync_editor import DatabaseSyncEditor, create_database_sync_editor
from plot.plot_graph import Node, Event, Action, ActionBinding, NodeType
from utils.api_client import set_auth_token
from server.app.agent.narrative_generator import NarrativeGenerator


def demo_database_sync():
    """Demonstrate database synchronization capabilities"""
    
    print("🎬 Database-Syncing Narrative Editor Demo")
    print("=" * 50)
    
    # Initialize the generator and editor
    print("📝 初始化编辑器...")
    generator = NarrativeGenerator()
    
    # Create a database-syncing editor
    # You can set auth_token here if you have one
    editor = create_database_sync_editor(generator, auth_token=None, auto_sync=True)
    
    # For demo purposes, we'll disable actual API calls since we may not have auth
    editor.disable_sync()
    print("⚠️ 注意: 为演示目的，数据库同步已暂时禁用")
    
    # Create a sample node to work with
    sample_node = Node(
        id="demo_node_001",
        scene="你站在一个古老的图书馆里，书架高耸入云，充满了神秘的气息。",
        node_type=NodeType.SCENE
    )
    
    print(f"\n📖 创建示例节点:")
    print(f"ID: {sample_node.id}")
    print(f"场景: {sample_node.scene}")
    
    # Demo 1: Edit scene text
    print("\n1️⃣ 演示场景编辑")
    print("-" * 30)
    new_scene = "你站在一个古老的图书馆里，空气中弥漫着羊皮纸和蜡烛的香味，神秘的能量在书架间流淌。"
    sample_node = editor.edit_scene(sample_node, new_scene)
    print(f"更新后的场景: {sample_node.scene}")
    
    # Demo 2: Add dialogue events
    print("\n2️⃣ 演示对话事件添加")
    print("-" * 30)
    sample_node = editor.add_dialogue_event(sample_node, "图书管理员", "欢迎来到古老的知识宝库。你在寻找什么？")
    sample_node = editor.add_dialogue_event(sample_node, "你", "我在寻找关于失落文明的记录。")
    
    print(f"节点现在有 {len(sample_node.events)} 个事件:")
    for i, event in enumerate(sample_node.events, 1):
        print(f"  {i}. {event.speaker}: {event.content}")
    
    # Demo 3: Add actions
    print("\n3️⃣ 演示动作添加")
    print("-" * 30)
    sample_node = editor.add_action(
        sample_node, 
        "询问更多关于失落文明的信息", 
        "stay"
    )
    sample_node = editor.add_action(
        sample_node, 
        "前往古籍区域", 
        "continue"
    )
    
    print(f"节点现在有 {len(sample_node.outgoing_actions)} 个动作:")
    for i, binding in enumerate(sample_node.outgoing_actions, 1):
        action_type = "主要动作" if binding.action.is_key_action else "普通动作"
        print(f"  {i}. [{action_type}] {binding.action.description}")
    
    # Demo 4: Edit action description
    print("\n4️⃣ 演示动作编辑")
    print("-" * 30)
    if sample_node.outgoing_actions:
        first_action_id = sample_node.outgoing_actions[0].action.id
        sample_node = editor.edit_action_description(
            sample_node, 
            first_action_id, 
            "礼貌地询问更多关于失落文明的详细信息"
        )
        print(f"第一个动作已更新: {sample_node.outgoing_actions[0].action.description}")
    
    # Demo 5: Update event
    print("\n5️⃣ 演示事件更新")
    print("-" * 30)
    if sample_node.events:
        first_event_id = sample_node.events[0].id
        sample_node = editor.update_event(
            sample_node,
            first_event_id,
            content="欢迎来到这座蕴含无穷智慧的古老知识宝库。请问你今天在寻找什么特别的东西吗？"
        )
        print(f"第一个事件已更新: {sample_node.events[0].content}")
    
    # Demo 6: Batch sync (would sync everything to database)
    print("\n6️⃣ 演示批量同步")
    print("-" * 30)
    print("🔄 执行批量同步...")
    responses = editor.batch_sync_node(sample_node)
    print(f"同步结果: {len(responses)} 个操作完成")
    
    # Demo 7: Enable sync and show what would happen
    print("\n7️⃣ 启用数据库同步预览")
    print("-" * 30)
    print("如果启用数据库同步，以下操作将自动保存到数据库:")
    print("- ✅ 场景文本更新")
    print("- ✅ 新对话事件创建")
    print("- ✅ 新动作创建和绑定")
    print("- ✅ 动作描述编辑")
    print("- ✅ 事件内容更新")
    print("- ✅ 事件和动作删除")
    
    # Demo 8: Show how to enable sync with auth
    print("\n8️⃣ 如何启用实际数据库同步")
    print("-" * 30)
    print("要启用实际的数据库同步，请执行以下步骤:")
    print("1. 获取有效的认证令牌 (auth_token)")
    print("2. 使用以下代码:")
    print()
    print("   # 设置认证令牌")
    print("   editor.set_auth_token('your_auth_token_here')")
    print("   # 启用同步")
    print("   editor.enable_sync()")
    print("   # 现在所有编辑操作都会自动同步到数据库")
    print()
    
    print("\n✨ 演示完成！")
    print("这个数据库同步编辑器提供了与后端数据库的无缝集成，")
    print("让您可以专注于创作，而不必担心数据持久化问题。")


if __name__ == "__main__":
    demo_database_sync() 