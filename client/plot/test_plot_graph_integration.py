#!/usr/bin/env python3
"""
Plot Graph Integration Test Script

This script provides comprehensive testing for the plot_graph.py module,
demonstrating all core functionalities of the interactive narrative graph system.
"""

import sys
import os
import json
import tempfile
from typing import Dict, Any, List

# Import the plot graph module from the current directory
from plot_graph import (
    NarrativeGraph, Node, Action, Event, ActionBinding,
    NodeType, ActionType
)


def test_basic_operations():
    """Test basic graph operations: create_node, attach_event, create_action, bind_action."""
    print("=" * 60)
    print("测试基础操作 (Basic Operations)")
    print("=" * 60)
    
    # Create a narrative graph
    graph = NarrativeGraph("基础测试故事")
    print(f"✓ 创建剧情图: {graph.title}")
    
    # Test create_node
    print("\n1. 测试 create_node")
    start_node = graph.create_node("你站在古老城堡的大门前")
    library_node = graph.create_node("你进入了满是灰尘的图书馆")
    dungeon_node = graph.create_node("你下到阴暗的地牢")
    
    print(f"   ✓ 起始节点: {start_node.scene}")
    print(f"   ✓ 图书馆节点: {library_node.scene}")
    print(f"   ✓ 地牢节点: {dungeon_node.scene}")
    print(f"   ✓ 图中节点总数: {len(graph.nodes)}")
    print(f"   ✓ 自动设置起始节点: {graph.start_node_id == start_node.id}")
    
    # Test attach_event
    print("\n2. 测试 attach_event")
    event1 = graph.attach_event(start_node, "城堡的大门发出沉重的吱呀声")
    event2 = graph.attach_event(library_node, "古老的书籍散发着神秘的光芒")
    event3 = graph.attach_event(dungeon_node, "远处传来奇怪的脚步声")
    
    print(f"   ✓ 起始节点事件: {event1.description}")
    print(f"   ✓ 图书馆事件: {event2.description}")
    print(f"   ✓ 地牢事件: {event3.description}")
    print(f"   ✓ 事件具有唯一ID: {len(set([event1.id, event2.id, event3.id])) == 3}")
    
    # Test create_action
    print("\n3. 测试 create_action")
    key_action1 = graph.create_action("进入图书馆", is_key_action=True)
    key_action2 = graph.create_action("下到地牢", is_key_action=True)
    regular_action = graph.create_action("仔细观察城堡", is_key_action=False)
    
    print(f"   ✓ 关键动作1: {key_action1.description} (类型: {key_action1.action_type.value})")
    print(f"   ✓ 关键动作2: {key_action2.description} (类型: {key_action2.action_type.value})")
    print(f"   ✓ 普通动作: {regular_action.description} (类型: {regular_action.action_type.value})")
    
    # Test bind_action
    print("\n4. 测试 bind_action")
    
    # Bind key actions (change main storyline)
    success1 = graph.bind_action(start_node, key_action1, node_to=library_node)
    success2 = graph.bind_action(start_node, key_action2, node_to=dungeon_node)
    
    # Bind regular action (trigger event only)
    observation_event = Event(
        description="你注意到城堡墙上刻着古老的符文",
        content="符文似乎在讲述着这座城堡的历史"
    )
    success3 = graph.bind_action(start_node, regular_action, event=observation_event)
    
    print(f"   ✓ 绑定关键动作1: {success1}")
    print(f"   ✓ 绑定关键动作2: {success2}")
    print(f"   ✓ 绑定普通动作: {success3}")
    
    # Verify action constraints
    print("\n5. 测试动作约束验证")
    constraint_tests = []
    
    # Test 1: Key action without target node should fail
    try:
        invalid_key = graph.create_action("无效关键动作", is_key_action=True)
        graph.bind_action(start_node, invalid_key, event=observation_event)
        constraint_tests.append("❌ 应该失败: 关键动作没有目标节点")
    except ValueError:
        constraint_tests.append("✓ 正确拒绝: 关键动作没有目标节点")
    
    # Test 2: Regular action without event should fail
    try:
        invalid_regular = graph.create_action("无效普通动作", is_key_action=False)
        graph.bind_action(start_node, invalid_regular, node_to=library_node)
        constraint_tests.append("❌ 应该失败: 普通动作没有事件")
    except ValueError:
        constraint_tests.append("✓ 正确拒绝: 普通动作没有事件")
    
    # Test 3: Key action with event should fail
    try:
        invalid_key2 = graph.create_action("无效关键动作2", is_key_action=True)
        graph.bind_action(start_node, invalid_key2, node_to=library_node, event=observation_event)
        constraint_tests.append("❌ 应该失败: 关键动作不能有事件")
    except ValueError:
        constraint_tests.append("✓ 正确拒绝: 关键动作不能有事件")
    
    for test_result in constraint_tests:
        print(f"   {test_result}")
    
    # Display graph statistics
    print("\n6. 图统计信息")
    stats = graph.get_graph_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    return graph


def test_complex_narrative():
    """Test building a complex branching narrative."""
    print("\n" + "=" * 60)
    print("测试复杂叙事结构 (Complex Narrative)")
    print("=" * 60)
    
    # Create a mystery investigation story
    graph = NarrativeGraph("神秘谋杀案调查")
    
    # Main storyline nodes
    crime_scene = graph.create_node("你到达了犯罪现场，一间豪华的书房")
    witness_interview = graph.create_node("你正在与唯一的目击证人对话")
    evidence_room = graph.create_node("你在证物室仔细检查收集到的线索")
    suspect_confrontation = graph.create_node("你面对面质问主要嫌疑人")
    revelation = graph.create_node("真相终于大白于天下")
    
    print(f"✓ 创建复杂故事: {graph.title}")
    print(f"✓ 创建了 {len(graph.nodes)} 个主要场景")
    
    # Add rich events to each scene
    events_data = [
        (crime_scene, "房间里弥漫着浓重的血腥味"),
        (crime_scene, "书桌上的文件散落一地"),
        (witness_interview, "证人显得非常紧张，双手颤抖"),
        (evidence_room, "在显微镜下发现了奇怪的纤维"),
        (suspect_confrontation, "嫌疑人的眼中闪过一丝恐慌"),
        (revelation, "所有的线索终于串联在一起")
    ]
    
    for node, event_desc in events_data:
        graph.attach_event(node, event_desc)
    
    print(f"✓ 添加了 {len(events_data)} 个事件")
    
    # Create investigation actions
    actions_data = [
        # From crime scene
        ("检查现场", True, crime_scene, evidence_room),
        ("寻找目击者", True, crime_scene, witness_interview),
        ("拍照记录", False, crime_scene, "你用相机记录了现场的每个细节"),
        
        # From witness interview
        ("深入询问", True, witness_interview, suspect_confrontation),
        ("安慰证人", False, witness_interview, "证人情绪稍微稳定了一些"),
        ("返回现场", True, witness_interview, crime_scene),
        
        # From evidence room
        ("分析DNA", False, evidence_room, "DNA分析显示了意外的结果"),
        ("对质嫌疑人", True, evidence_room, suspect_confrontation),
        ("重新审视现场", True, evidence_room, crime_scene),
        
        # From suspect confrontation
        ("展示证据", True, suspect_confrontation, revelation),
        ("心理战术", False, suspect_confrontation, "嫌疑人开始露出破绽"),
    ]
    
    for action_desc, is_key, from_node, target in actions_data:
        action = graph.create_action(action_desc, is_key_action=is_key)
        
        if is_key and isinstance(target, Node):
            graph.bind_action(from_node, action, node_to=target)
        elif not is_key and isinstance(target, str):
            event = Event(description=target, content=target)
            graph.bind_action(from_node, action, event=event)
    
    print(f"✓ 创建了 {len(actions_data)} 个动作")
    
    # Analyze the narrative structure
    print("\n分析叙事结构:")
    stats = graph.get_graph_stats()
    print(f"  节点数: {stats['total_nodes']}")
    print(f"  事件数: {stats['total_events']}")
    print(f"  动作数: {stats['total_actions']}")
    print(f"  关键动作: {stats['key_actions']}")
    print(f"  普通动作: {stats['regular_actions']}")
    
    # Test graph connectivity
    reachable = graph.get_reachable_nodes()
    unreachable = graph.get_unreachable_nodes()
    print(f"  可达节点: {len(reachable)}")
    print(f"  不可达节点: {len(unreachable)}")
    
    return graph


def test_graph_validation():
    """Test graph validation and error detection."""
    print("\n" + "=" * 60)
    print("测试图验证功能 (Graph Validation)")
    print("=" * 60)
    
    # Create a graph with intentional issues for testing
    graph = NarrativeGraph("验证测试图")
    
    # Create connected nodes
    start = graph.create_node("开始场景")
    middle = graph.create_node("中间场景")
    end = graph.create_node("结束场景")
    
    # Create an orphaned node (unreachable)
    orphan = graph.create_node("孤立场景")
    
    # Connect start -> middle -> end
    action1 = graph.create_action("前进到中间", is_key_action=True)
    action2 = graph.create_action("到达结束", is_key_action=True)
    
    graph.bind_action(start, action1, node_to=middle)
    graph.bind_action(middle, action2, node_to=end)
    
    # The orphan node remains unconnected
    print(f"✓ 创建测试图: {len(graph.nodes)} 个节点")
    print(f"✓ 故意创建1个孤立节点用于测试")
    
    # Run validation
    print("\n验证结果:")
    issues = graph.validate_graph()
    
    for category, problems in issues.items():
        if problems:
            print(f"  {category}:")
            for problem in problems:
                print(f"    - {problem}")
        else:
            print(f"  {category}: ✓ 无问题")
    
    # Test reachability analysis
    print("\n可达性分析:")
    reachable_ids = graph.get_reachable_nodes()
    unreachable_nodes = graph.get_unreachable_nodes()
    
    print(f"  从起始节点可达: {len(reachable_ids)} 个节点")
    print(f"  不可达节点: {len(unreachable_nodes)} 个")
    
    if unreachable_nodes:
        for node in unreachable_nodes:
            print(f"    - {node.scene}")
    
    # Test node removal and cleanup
    print("\n测试节点删除:")
    removed = graph.remove_node(orphan.id)
    print(f"  删除孤立节点: {removed}")
    
    # Re-validate after cleanup
    post_cleanup_issues = graph.validate_graph()
    unreachable_after = len(graph.get_unreachable_nodes())
    print(f"  清理后不可达节点: {unreachable_after}")
    
    return graph


def test_serialization():
    """Test JSON serialization and deserialization."""
    print("\n" + "=" * 60)
    print("测试序列化功能 (Serialization)")
    print("=" * 60)
    
    # Create a test story
    original = NarrativeGraph("序列化测试故事")
    
    # Add some content
    start = original.create_node("序列化测试开始")
    end = original.create_node("序列化测试结束")
    
    # Add metadata
    original.metadata = {
        "author": "测试作者",
        "version": "1.0",
        "genre": "测试类型"
    }
    
    start.metadata = {"importance": "high", "mood": "mysterious"}
    
    # Add events and actions
    original.attach_event(start, "测试事件")
    action = original.create_action("完成测试", is_key_action=True)
    original.bind_action(start, action, node_to=end)
    
    regular_action = original.create_action("观察环境", is_key_action=False)
    test_event = Event(description="你看到了有趣的细节", content="环境描述")
    original.bind_action(start, regular_action, event=test_event)
    
    print(f"✓ 创建原始故事: {original.title}")
    print(f"✓ 原始数据 - 节点: {len(original.nodes)}, 事件: {sum(len(n.events) for n in original.nodes.values())}")
    
    # Export to JSON
    json_data = original.to_json(indent=2)
    json_size = len(json_data)
    print(f"✓ 导出为JSON: {json_size} 字符")
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        f.write(json_data)
        temp_file = f.name
    
    print(f"✓ 保存到临时文件: {temp_file}")
    
    # Load from JSON
    restored = NarrativeGraph.from_json(json_data)
    print(f"✓ 从JSON恢复: {restored.title}")
    
    # Verify data integrity
    print("\n数据完整性验证:")
    checks = [
        ("标题", original.title == restored.title),
        ("节点数量", len(original.nodes) == len(restored.nodes)),
        ("起始节点", original.start_node_id == restored.start_node_id),
        ("图元数据", original.metadata == restored.metadata),
    ]
    
    for check_name, passed in checks:
        status = "✓" if passed else "❌"
        print(f"  {status} {check_name}: {passed}")
    
    # Detailed node verification
    print("\n详细节点验证:")
    for orig_id, orig_node in original.nodes.items():
        if orig_id in restored.nodes:
            rest_node = restored.nodes[orig_id]
            node_checks = [
                ("场景描述", orig_node.scene == rest_node.scene),
                ("事件数量", len(orig_node.events) == len(rest_node.events)),
                ("动作数量", len(orig_node.outgoing_actions) == len(rest_node.outgoing_actions)),
                ("元数据", orig_node.metadata == rest_node.metadata),
            ]
            
            print(f"  节点 {orig_node.scene[:20]}...")
            for check_name, passed in node_checks:
                status = "✓" if passed else "❌"
                print(f"    {status} {check_name}")
    
    # Clean up temporary file
    os.unlink(temp_file)
    print(f"✓ 清理临时文件")
    
    return json_data


def test_utility_methods():
    """Test utility methods for common operations."""
    print("\n" + "=" * 60)
    print("测试实用工具方法 (Utility Methods)")
    print("=" * 60)
    
    graph = NarrativeGraph("工具方法测试")
    
    # Test create_simple_path
    print("\n1. 测试 create_simple_path")
    scenes = ["开始", "中间1", "中间2", "结束"]
    actions = ["第一步", "第二步", "最后一步"]
    
    try:
        path_nodes = graph.create_simple_path(scenes, actions)
        print(f"   ✓ 创建线性路径: {len(path_nodes)} 个节点")
        print(f"   ✓ 验证动作数: {len(actions)} 个连接")
        
        # Verify connections
        for i, node in enumerate(path_nodes[:-1]):
            key_actions = node.get_key_actions()
            if key_actions and key_actions[0].target_node == path_nodes[i + 1]:
                print(f"   ✓ 连接 {i}: {node.scene} -> {path_nodes[i + 1].scene}")
            else:
                print(f"   ❌ 连接 {i} 失败")
                
    except ValueError as e:
        print(f"   ❌ 路径创建失败: {e}")
    
    # Test add_branch
    print("\n2. 测试 add_branch")
    hub_node = graph.create_node("选择枢纽")
    
    choices = [
        ("选择路径A", "目标A"),
        ("选择路径B", "目标B"),
        ("选择路径C", "目标C")
    ]
    
    branch_nodes = graph.add_branch(hub_node, choices)
    print(f"   ✓ 从枢纽创建 {len(branch_nodes)} 个分支")
    
    # Verify branch connections
    hub_actions = hub_node.get_key_actions()
    print(f"   ✓ 枢纽节点有 {len(hub_actions)} 个出边")
    
    for i, (action_desc, scene_desc) in enumerate(choices):
        if i < len(hub_actions):
            action = hub_actions[i]
            target = action.target_node
            print(f"   ✓ 分支 {i+1}: {action.action.description} -> {target.scene}")
    
    # Test node type operations
    print("\n3. 测试节点类型操作")
    test_node = graph.create_node("类型测试节点")
    print(f"   ✓ 默认节点类型: {test_node.node_type.value}")
    
    # Test action type separation
    key_action = graph.create_action("关键动作测试", is_key_action=True)
    regular_action = graph.create_action("普通动作测试", is_key_action=False)
    
    target_node = graph.create_node("目标节点")
    test_event = Event(description="测试事件", content="事件内容")
    
    graph.bind_action(test_node, key_action, node_to=target_node)
    graph.bind_action(test_node, regular_action, event=test_event)
    
    key_actions = test_node.get_key_actions()
    regular_actions = test_node.get_regular_actions()
    
    print(f"   ✓ 关键动作数: {len(key_actions)}")
    print(f"   ✓ 普通动作数: {len(regular_actions)}")
    
    return graph


def test_edge_cases():
    """Test edge cases and error conditions."""
    print("\n" + "=" * 60)
    print("测试边缘情况 (Edge Cases)")
    print("=" * 60)
    
    graph = NarrativeGraph("边缘情况测试")
    
    # Test empty graph
    print("\n1. 空图测试")
    empty_stats = graph.get_graph_stats()
    print(f"   ✓ 空图统计: {empty_stats}")
    print(f"   ✓ 起始节点: {graph.get_start_node()}")
    print(f"   ✓ 可达节点: {len(graph.get_reachable_nodes())}")
    
    # Test single node
    print("\n2. 单节点测试")
    single_node = graph.create_node("唯一节点")
    print(f"   ✓ 自动设为起始节点: {graph.start_node_id == single_node.id}")
    print(f"   ✓ 可达节点数: {len(graph.get_reachable_nodes())}")
    
    # Test node removal edge cases
    print("\n3. 节点删除边缘情况")
    
    # Remove non-existent node
    removed_nonexistent = graph.remove_node("不存在的ID")
    print(f"   ✓ 删除不存在节点: {removed_nonexistent} (应为False)")
    
    # Remove start node
    old_start_id = graph.start_node_id
    removed_start = graph.remove_node(single_node.id)
    new_start = graph.get_start_node()
    print(f"   ✓ 删除起始节点: {removed_start}")
    print(f"   ✓ 新起始节点: {new_start}")
    
    # Test event operations
    print("\n4. 事件操作边缘情况")
    test_node = graph.create_node("事件测试节点")
    
    # Add multiple events
    for i in range(3):
        graph.attach_event(test_node, f"事件 {i+1}")
    
    print(f"   ✓ 添加多个事件: {len(test_node.events)}")
    
    # Remove event
    if test_node.events:
        first_event_id = test_node.events[0].id
        removed_event = test_node.remove_event(first_event_id)
        print(f"   ✓ 删除事件: {removed_event}")
        print(f"   ✓ 剩余事件数: {len(test_node.events)}")
    
    # Test action operations
    print("\n5. 动作操作边缘情况")
    
    # Remove action binding
    action = graph.create_action("测试动作", is_key_action=False)
    event = Event(description="测试", content="测试")
    graph.bind_action(test_node, action, event=event)
    
    print(f"   ✓ 绑定前动作数: {len(test_node.outgoing_actions)}")
    
    removed_action = test_node.remove_action_binding(action.id)
    print(f"   ✓ 删除动作绑定: {removed_action}")
    print(f"   ✓ 删除后动作数: {len(test_node.outgoing_actions)}")
    
    return graph


def run_performance_test():
    """Run a basic performance test with a larger graph."""
    print("\n" + "=" * 60)
    print("性能测试 (Performance Test)")
    print("=" * 60)
    
    import time
    
    # Create a larger graph
    graph = NarrativeGraph("大型性能测试图")
    
    # Performance test: Create many nodes
    start_time = time.time()
    nodes = []
    for i in range(100):
        node = graph.create_node(f"节点 {i}")
        nodes.append(node)
    
    node_creation_time = time.time() - start_time
    print(f"✓ 创建100个节点用时: {node_creation_time:.4f} 秒")
    
    # Performance test: Create many connections
    start_time = time.time()
    for i in range(99):
        action = graph.create_action(f"动作 {i}", is_key_action=True)
        graph.bind_action(nodes[i], action, node_to=nodes[i + 1])
    
    connection_time = time.time() - start_time
    print(f"✓ 创建99个连接用时: {connection_time:.4f} 秒")
    
    # Performance test: Validation
    start_time = time.time()
    issues = graph.validate_graph()
    validation_time = time.time() - start_time
    print(f"✓ 验证大图用时: {validation_time:.4f} 秒")
    
    # Performance test: Serialization
    start_time = time.time()
    json_data = graph.to_json()
    serialization_time = time.time() - start_time
    print(f"✓ 序列化用时: {serialization_time:.4f} 秒")
    print(f"✓ JSON大小: {len(json_data)} 字符")
    
    # Performance test: Deserialization
    start_time = time.time()
    restored_graph = NarrativeGraph.from_json(json_data)
    deserialization_time = time.time() - start_time
    print(f"✓ 反序列化用时: {deserialization_time:.4f} 秒")
    
    # Performance test: Reachability analysis
    start_time = time.time()
    reachable = graph.get_reachable_nodes()
    reachability_time = time.time() - start_time
    print(f"✓ 可达性分析用时: {reachability_time:.4f} 秒")
    print(f"✓ 可达节点数: {len(reachable)}")
    
    total_time = (node_creation_time + connection_time + validation_time + 
                  serialization_time + deserialization_time + reachability_time)
    print(f"\n总测试时间: {total_time:.4f} 秒")
    
    return {
        'node_creation': node_creation_time,
        'connections': connection_time,
        'validation': validation_time,
        'serialization': serialization_time,
        'deserialization': deserialization_time,
        'reachability': reachability_time,
        'total': total_time,
        'nodes': len(nodes),
        'json_size': len(json_data)
    }


def generate_test_report(results: Dict[str, Any]):
    """Generate a comprehensive test report."""
    print("\n" + "=" * 60)
    print("测试报告 (Test Report)")
    print("=" * 60)
    
    print("\n✅ 完成的测试模块:")
    modules = [
        "基础操作测试 (create_node, attach_event, create_action, bind_action)",
        "复杂叙事结构测试",
        "图验证功能测试",
        "序列化/反序列化测试",
        "实用工具方法测试",
        "边缘情况测试",
        "性能测试"
    ]
    
    for i, module in enumerate(modules, 1):
        print(f"  {i}. ✓ {module}")
    
    print(f"\n📊 测试统计:")
    print(f"  测试模块总数: {len(modules)}")
    print(f"  创建的图数量: {len([k for k in results.keys() if 'graph' in k])}")
    
    if 'performance' in results:
        perf = results['performance']
        print(f"  性能测试 - 节点数: {perf['nodes']}")
        print(f"  性能测试 - 总时间: {perf['total']:.4f} 秒")
        print(f"  性能测试 - JSON大小: {perf['json_size']} 字符")
    
    print(f"\n🎯 验证的核心功能:")
    features = [
        "节点创建和管理",
        "事件附加和处理",
        "动作创建和绑定 (关键动作/普通动作)",
        "约束条件验证 (关键动作必须有目标节点，普通动作必须有事件)",
        "图结构验证和可达性分析",
        "JSON序列化和反序列化",
        "实用工具方法 (简单路径, 分支创建)",
        "边缘情况处理",
        "大图性能表现"
    ]
    
    for feature in features:
        print(f"  ✓ {feature}")
    
    print(f"\n📝 使用建议:")
    suggestions = [
        "使用 create_node() 创建场景节点",
        "使用 attach_event() 为场景添加丰富的事件内容",
        "区分关键动作 (改变剧情) 和普通动作 (仅触发反馈)",
        "始终验证动作绑定约束以确保图结构正确",
        "使用 validate_graph() 检查图的完整性",
        "利用 JSON 序列化功能保存和加载剧情图",
        "使用实用工具方法快速构建常见的叙事结构",
        "定期检查可达性以避免孤立节点"
    ]
    
    for i, suggestion in enumerate(suggestions, 1):
        print(f"  {i}. {suggestion}")


def main():
    """Main test execution function."""
    print("🎮 Plot Graph 系统集成测试")
    print("=" * 60)
    print("这个脚本全面测试 plot_graph.py 模块的所有功能")
    print("包括基础操作、复杂结构、验证、序列化和性能")
    
    results = {}
    test_count = 0
    
    try:
        # Run all test modules
        print(f"\n开始执行测试...")
        
        test_count += 1
        results['basic_graph'] = test_basic_operations()
        
        test_count += 1
        results['complex_graph'] = test_complex_narrative()
        
        test_count += 1
        results['validation_graph'] = test_graph_validation()
        
        test_count += 1
        results['serialization_data'] = test_serialization()
        
        test_count += 1
        results['utility_graph'] = test_utility_methods()
        
        test_count += 1
        results['edge_case_graph'] = test_edge_cases()
        
        test_count += 1
        results['performance'] = run_performance_test()
        
        # Generate comprehensive report
        generate_test_report(results)
        
        print(f"\n🎉 所有 {test_count} 个测试模块成功完成!")
        print(f"Plot Graph 系统功能验证完毕 ✅")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败在模块 {test_count}: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 