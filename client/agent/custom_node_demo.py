#!/usr/bin/env python3
"""
用户自定义节点创建和连接功能演示

这个示例展示了如何：
1. 创建完全自定义的节点
2. 在节点之间建立连接
3. 管理故事分支
4. 获取故事图概览
"""

import sys
import os

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(parent_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

from llm_client import LLMClient
from narrative_generator import NarrativeGenerator
from narrative_editor import NarrativeEditor
from client.utils.narrative_graph import NarrativeGraph


def demo_custom_node_creation():
    """演示用户自定义节点创建功能"""
    print("=" * 60)
    print("演示1: 用户自定义节点创建")
    print("=" * 60)
    
    # 初始化系统
    llm_client = LLMClient()  # 注意：这里需要有效的API配置
    generator = NarrativeGenerator(
        llm_client=llm_client,
        world_setting="现代都市悬疑故事",
        characters=["主角-李侦探", "嫌疑人-张经理"],
        style="推理小说风格"
    )
    
    # 创建编辑器，包含故事图管理
    editor = NarrativeEditor(generator)
    
    # 方法1: 完整自定义节点
    print("\n1.1 创建完整自定义节点...")
    
    custom_events = [
        {"speaker": "李侦探", "content": "这里的气氛很不寻常...", "event_type": "dialogue"},
        {"speaker": "", "content": "房间里弥漫着淡淡的香水味", "event_type": "narration"}
    ]
    
    custom_actions = [
        {
            "description": "仔细检查办公桌",
            "navigation": "continue",
            "effects": {"world_state_changes": "发现了重要线索"}
        },
        {
            "description": "询问在场的同事",
            "navigation": "continue", 
            "effects": {"world_state_changes": "获得了新的信息"}
        },
        {
            "description": "记录现场情况",
            "navigation": "stay",
            "response": "你详细记录了现场的每一个细节",
            "effects": {"world_state_changes": "调查笔记更加完整"}
        }
    ]
    
    custom_world_state = {
        "location": "公司办公室",
        "time": "晚上8点",
        "characters": {
            "李侦探": "专注而警觉",
            "张经理": "紧张不安"
        },
        "key_facts": ["发现办公室被翻动过", "张经理行为可疑"],
        "tension_level": 7
    }
    
    node1 = editor.create_custom_node(
        scene_text="李侦探走进了张经理的办公室，立即察觉到这里发生过什么。桌上的文件散乱，抽屉半开着，显然有人匆忙搜寻过什么东西。",
        events=custom_events,
        actions=custom_actions,
        world_state=custom_world_state
    )
    
    print(f"✅ 完整自定义节点创建完成: {node1.id}")
    
    # 方法2: 快速创建节点
    print("\n1.2 快速创建简单节点...")
    
    node2 = editor.create_quick_node(
        scene_text="李侦探决定前往张经理的家中继续调查。这是一栋位于市中心的高档公寓，看起来张经理的收入比预期的要高。",
        action_descriptions=[
            "按门铃拜访",
            "观察周围环境",
            "联系物业管理"
        ]
    )
    
    print(f"✅ 快速节点创建完成: {node2.id}")
    
    return editor, node1, node2


def demo_ai_assisted_creation():
    """演示AI辅助的节点创建功能"""
    print("\n" + "=" * 60)
    print("演示1B: AI辅助节点创建")
    print("=" * 60)
    
    # 初始化系统
    llm_client = LLMClient()
    generator = NarrativeGenerator(
        llm_client=llm_client,
        world_setting="现代都市悬疑故事", 
        characters=["主角-李侦探", "嫌疑人-张经理"],
        style="推理小说风格"
    )
    editor = NarrativeEditor(generator)
    
    # 演示场景描述润色
    print("\n1B.1 场景描述润色...")
    raw_description = "李侦探到了一个很乱的房间"
    polished_scene = editor.polish_scene_description(
        raw_description, 
        context="这是一个犯罪现场，需要营造紧张悬疑的氛围"
    )
    print(f"原始描述: {raw_description}")
    print(f"润色后: {polished_scene[:100]}...")
    
    # 演示为场景生成事件
    print("\n1B.2 为场景生成背景事件...")
    events_data = editor.generate_events_for_scene(
        polished_scene,
        context="需要体现现场的混乱和可疑之处"
    )
    print(f"生成的事件:")
    for event in events_data[:2]:  # 显示前2个
        print(f"  - {event.get('speaker', '环境')}: {event.get('content', '')}")
    
    # 演示为场景生成动作
    print("\n1B.3 为场景生成可选动作...")
    actions_data = editor.generate_actions_for_scene(
        polished_scene,
        context="侦探需要搜集证据和线索",
        current_state={"location": "犯罪现场", "tension_level": 8}
    )
    print(f"生成的动作:")
    for action in actions_data[:3]:  # 显示前3个
        print(f"  - {action.get('description', '')} ({action.get('navigation', 'continue')})")
    
    # 演示完整的AI辅助节点创建
    print("\n1B.4 创建完整的AI辅助节点...")
    assisted_node = editor.create_assisted_node(
        raw_description="侦探来到嫌疑人的秘密藏身处",
        polish_scene=True,
        generate_events=True,
        generate_actions=True,
        context="这是故事的关键转折点，需要高度紧张感",
        world_state={
            "location": "废弃仓库",
            "time": "深夜",
            "tension_level": 9,
            "characters": {"李侦探": "高度警惕", "未知人物": "潜伏中"}
        }
    )
    
    print(f"✅ AI辅助节点创建完成: {assisted_node.id}")
    print(f"场景预览: {assisted_node.scene[:150]}...")
    print(f"包含事件数: {len(assisted_node.events)}")
    print(f"包含动作数: {len(assisted_node.outgoing_actions)}")
    
    return editor, assisted_node


def demo_node_enhancement():
    """演示节点增强功能"""
    print("\n" + "=" * 60)
    print("演示1C: 节点增强功能")
    print("=" * 60)
    
    # 创建基础编辑器
    llm_client = LLMClient()
    generator = NarrativeGenerator(llm_client=llm_client)
    editor = NarrativeEditor(generator)
    
    # 创建一个简单的原始节点
    print("\n1C.1 创建基础节点...")
    basic_node = editor.create_quick_node(
        scene_text="一个普通的办公室。",
        action_descriptions=["离开"]
    )
    
    print(f"原始节点:")
    print(f"  场景: {basic_node.scene}")
    print(f"  事件数: {len(basic_node.events)}")
    print(f"  动作数: {len(basic_node.outgoing_actions)}")
    
    # 增强节点
    print("\n1C.2 增强节点...")
    enhanced_node = editor.enhance_existing_node(
        node=basic_node,
        regenerate_events=True,
        regenerate_actions=True,
        polish_scene=True,
        context="将这个普通办公室改造成充满悬疑气氛的犯罪现场"
    )
    
    print(f"\n增强后节点:")
    print(f"  场景: {enhanced_node.scene[:100]}...")
    print(f"  事件数: {len(enhanced_node.events)}")
    print(f"  动作数: {len(enhanced_node.outgoing_actions)}")
    
    # 显示增强后的内容
    if enhanced_node.events:
        print(f"  示例事件: {enhanced_node.events[0].content}")
    if enhanced_node.outgoing_actions:
        print(f"  示例动作: {enhanced_node.outgoing_actions[0].action.description}")
    
    return enhanced_node


def demo_node_connections(editor, node1, node2):
    """演示节点连接功能"""
    print("\n" + "=" * 60)
    print("演示2: 节点连接管理")
    print("=" * 60)
    
    # 创建第三个节点作为连接目标
    node3 = editor.create_quick_node(
        scene_text="经过一番调查，李侦探发现了关键证据。真相即将浮出水面...",
        action_descriptions=["整理证据", "准备对质"]
    )
    
    print(f"\n2.1 创建了第三个节点: {node3.id}")
    
    # 连接节点1到节点2
    print("\n2.2 连接节点...")
    success = editor.connect_nodes(
        from_node=node1,
        to_node=node2,
        action_description="前往张经理的住所",
        navigation_type="continue",
        action_effects={
            "response": "李侦探离开了办公室，驱车前往张经理的公寓",
            "effects": {"world_state_changes": "场景转移到公寓楼"}
        }
    )
    
    if success:
        print("✅ 节点连接成功")
    
    # 连接节点2到节点3
    editor.connect_nodes(
        from_node=node2,
        to_node=node3,
        action_description="汇总所有线索",
        navigation_type="continue"
    )
    
    # 查看节点连接信息
    print("\n2.3 查看节点连接信息...")
    connections = editor.get_node_connections(node1)
    print(f"节点1的连接情况:")
    print(f"  出向连接: {len(connections['outgoing'])} 个")
    print(f"  入向连接: {len(connections['incoming'])} 个")
    
    for conn in connections['outgoing']:
        print(f"    -> {conn['action_description']} => {conn['target_node_id']}")
    
    return node3


def demo_story_branches(editor, node1):
    """演示故事分支创建"""
    print("\n" + "=" * 60)
    print("演示3: 创建故事分支")
    print("=" * 60)
    
    # 从节点1创建多个分支
    branch_choices = [
        ("跟踪张经理", "李侦探决定暗中跟踪张经理，看看他会去哪里。夜色掩护下，这是一个冒险但可能很有收获的选择。"),
        ("搜查保险箱", "李侦探注意到办公室角落的保险箱。虽然这可能涉及法律风险，但里面可能藏着关键证据。"),
        ("联系警方支援", "考虑到案件的复杂性，李侦探决定联系警方同事，寻求官方支援。这是一个稳妥但可能打草惊蛇的选择。")
    ]
    
    branch_nodes = editor.create_story_branch(node1, branch_choices)
    
    print(f"✅ 创建了 {len(branch_nodes)} 个分支节点")
    for i, node in enumerate(branch_nodes):
        print(f"  分支 {i+1}: {node.id}")
    
    return branch_nodes


def demo_node_management(editor):
    """演示节点管理功能"""
    print("\n" + "=" * 60)
    print("演示4: 节点管理功能")
    print("=" * 60)
    
    # 获取故事图概览
    print("\n4.1 故事图概览...")
    overview = editor.get_story_graph_overview()
    
    print(f"基础统计:")
    print(f"  总节点数: {overview['basic_stats']['total_nodes']}")
    print(f"  总连接数: {overview['connections_count']}")
    print(f"  事件总数: {overview['basic_stats']['total_events']}")
    print(f"  动作总数: {overview['basic_stats']['total_actions']}")
    print(f"  孤立节点: {len(overview['isolated_nodes'])}")
    
    print(f"\n节点详情:")
    for node_summary in overview['nodes_summary'][:3]:  # 只显示前3个
        print(f"  节点 {node_summary['id'][:8]}...")
        print(f"    场景: {node_summary['scene_preview']}")
        print(f"    出向连接: {node_summary['outgoing_connections']}")
        print(f"    入向连接: {node_summary['incoming_connections']}")
        print(f"    事件数: {node_summary['events_count']}")
        print()


def demo_node_cloning(editor, original_node):
    """演示节点克隆功能"""
    print("\n" + "=" * 60)
    print("演示5: 节点克隆")
    print("=" * 60)
    
    # 克隆节点并修改场景
    cloned_node = editor.clone_node(
        original_node=original_node,
        modify_scene="【回忆场景】一周前，李侦探第一次来到这个办公室时，一切都是整齐的。现在的混乱证明了他的推测..."
    )
    
    print(f"✅ 节点克隆完成")
    print(f"  原始节点: {original_node.id}")
    print(f"  克隆节点: {cloned_node.id}")
    print(f"  场景已修改为回忆版本")
    
    return cloned_node


def main():
    """主演示函数"""
    print("🎮 交互式叙事UGC引擎 - 用户自定义节点功能演示")
    print("=" * 80)
    
    try:
        # 演示1: 自定义节点创建
        editor, node1, node2 = demo_custom_node_creation()
        
        # 演示1B: AI辅助节点创建
        ai_editor, assisted_node = demo_ai_assisted_creation()
        
        # 演示1C: 节点增强
        enhanced_node = demo_node_enhancement()
        
        # 演示2: 节点连接
        node3 = demo_node_connections(editor, node1, node2)
        
        # 演示3: 故事分支
        branch_nodes = demo_story_branches(editor, node1)
        
        # 演示4: 节点管理
        demo_node_management(editor)
        
        # 演示5: 节点克隆
        cloned_node = demo_node_cloning(editor, node1)
        
        print("\n" + "=" * 80)
        print("🎉 所有功能演示完成！")
        print("=" * 80)
        
        # 最终统计
        final_overview = editor.get_story_graph_overview()
        ai_overview = ai_editor.get_story_graph_overview()
        print(f"\n📊 最终统计:")
        print(f"  手动创建的节点: {final_overview['basic_stats']['total_nodes']}")
        print(f"  AI辅助创建的节点: {ai_overview['basic_stats']['total_nodes']}")
        print(f"  建立的连接总数: {final_overview['connections_count']}")
        print(f"  故事分支数: {len(branch_nodes)}")
        print(f"  增强的节点数: 1 (enhanced_node)")
        
        # 导出故事图（可选）
        print(f"\n📁 可选操作:")
        print(f"  - 调用 editor.narrative_graph.to_json() 导出完整故事图")
        print(f"  - 调用 editor.narrative_graph.validate_graph() 验证图结构")
        
        return editor
        
    except Exception as e:
        print(f"❌ 演示过程中发生错误: {e}")
        print("💡 提示: 请确保LLM客户端配置正确")
        return None


if __name__ == "__main__":
    # 运行演示
    editor = main()
    
    # 如果成功，可以继续交互
    if editor:
        print(f"\n🔧 交互模式 (可选)")
        print(f"演示完成后，你可以继续使用 editor 对象进行实验:")
        print(f"  editor.create_custom_node(...)")
        print(f"  editor.connect_nodes(...)")
        print(f"  editor.get_story_graph_overview()") 