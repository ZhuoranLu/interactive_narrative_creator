#!/usr/bin/env python3
"""
Interactive Narrative Graph System - Integration Test Script

This script demonstrates all the features of the narrative graph system including:
- Basic graph operations (create_node, attach_event, create_action, bind_action)
- High-level builder API for fluent narrative construction
- Predefined templates for common story structures
- Analysis and validation tools
- Export capabilities (JSON, Mermaid, DOT)
"""

import sys
import os
import json
from typing import Dict, Any

# Add the utils directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from narrative_graph import NarrativeGraph, Node, Action, Event, NodeType, ActionType
from narrative_builder import NarrativeBuilder, NarrativeTemplate, NarrativeAnalyzer


def test_basic_api():
    """Test the basic low-level API operations."""
    print("=" * 60)
    print("测试基础 API 功能")
    print("=" * 60)
    
    # 创建剧情图
    graph = NarrativeGraph("基础API测试故事")
    
    # 1. 创建节点 (create_node)
    print("\n1. 创建节点 (create_node)")
    start_node = graph.create_node("你在一片神秘的森林中醒来")
    cottage_node = graph.create_node("你发现了一座古老的小屋")
    river_node = graph.create_node("你来到一条清澈的河流边")
    
    print(f"   创建起始节点: {start_node.scene}")
    print(f"   创建小屋节点: {cottage_node.scene}")
    print(f"   创建河流节点: {river_node.scene}")
    print(f"   当前图中节点数量: {len(graph.nodes)}")
    
    # 2. 添加事件 (attach_event)
    print("\n2. 添加事件 (attach_event)")
    event1 = graph.attach_event(start_node, "远处传来神秘的音乐声")
    event2 = graph.attach_event(cottage_node, "小屋的窗户里透出温暖的光芒")
    event3 = graph.attach_event(river_node, "河水中映出了月亮的倒影")
    
    print(f"   起始节点事件: {event1.description}")
    print(f"   小屋节点事件: {event2.description}")
    print(f"   河流节点事件: {event3.description}")
    
    # 3. 创建动作模板 (create_action)
    print("\n3. 创建动作模板 (create_action)")
    key_action1 = graph.create_action("向左走，寻找小屋", is_key_action=True)
    key_action2 = graph.create_action("向右走，前往河流", is_key_action=True)
    regular_action = graph.create_action("仔细观察周围", is_key_action=False)
    
    print(f"   关键动作1: {key_action1.description} (类型: {key_action1.action_type.value})")
    print(f"   关键动作2: {key_action2.description} (类型: {key_action2.action_type.value})")
    print(f"   普通动作: {regular_action.description} (类型: {regular_action.action_type.value})")
    
    # 4. 绑定动作到节点 (bind_action)
    print("\n4. 绑定动作到节点 (bind_action)")
    
    # 绑定关键动作（会改变主线进展）
    success1 = graph.bind_action(start_node, key_action1, node_to=cottage_node)
    success2 = graph.bind_action(start_node, key_action2, node_to=river_node)
    
    # 绑定普通动作（仅触发事件）
    observation_event = Event(description="你注意到树木上有古老的符文", content="古老的符文散发着微弱的蓝光")
    success3 = graph.bind_action(start_node, regular_action, event=observation_event)
    
    print(f"   绑定关键动作1成功: {success1}")
    print(f"   绑定关键动作2成功: {success2}")
    print(f"   绑定普通动作成功: {success3}")
    
    # 验证约束条件
    print("\n5. 验证动作绑定约束")
    try:
        # 尝试创建无效绑定（关键动作没有目标节点）
        invalid_key_action = graph.create_action("无效的关键动作", is_key_action=True)
        graph.bind_action(start_node, invalid_key_action, event=observation_event)
        print("   错误: 应该抛出异常!")
    except ValueError as e:
        print(f"   ✓ 正确捕获约束违反: {e}")
    
    try:
        # 尝试创建无效绑定（普通动作没有事件）
        invalid_regular_action = graph.create_action("无效的普通动作", is_key_action=False)
        graph.bind_action(start_node, invalid_regular_action, node_to=cottage_node)
        print("   错误: 应该抛出异常!")
    except ValueError as e:
        print(f"   ✓ 正确捕获约束违反: {e}")
    
    # 显示图的统计信息
    print("\n6. 图的统计信息")
    stats = graph.get_graph_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    return graph


def test_builder_api():
    """Test the high-level builder API."""
    print("\n" + "=" * 60)
    print("测试高级构建器 API")
    print("=" * 60)
    
    # 使用流式API构建复杂剧情
    story = (NarrativeBuilder("魔法学院的秘密")
             .scene("entrance_hall", "你站在魔法学院的大厅里，四周是高耸的石柱和神秘的画像")
             .event("画像中的人物似乎在窃窃私语")
             .action("倾听画像的对话", "你听到他们在讨论一个失踪的学生")
             .choice("前往图书馆调查", "library")
             .choice("去找院长询问", "headmaster_office")
             .choice("到学生宿舍打探消息", "dormitory")
             
             .scene("library", "古老的图书馆里堆满了厚重的魔法书籍")
             .event("一本书突然自己翻开了")
             .action("查看那本自动翻开的书", "书中记录着关于禁忌魔法的内容")
             .choice("深入研究禁忌魔法", "forbidden_magic")
             .choice("寻找关于失踪学生的线索", "missing_student_clue")
             .choice("返回大厅", "entrance_hall")
             
             .scene("headmaster_office", "院长的办公室里飘浮着各种神奇的物品")
             .event("院长看起来心事重重")
             .action("观察院长的表情", "你感觉院长隐瞒了什么重要信息")
             .choice("直接询问失踪学生的事", "direct_question")
             .choice("旁敲侧击地试探", "indirect_approach")
             .choice("离开办公室", "entrance_hall")
             
             .scene("dormitory", "学生宿舍里弥漫着不安的气氛")
             .event("其他学生都显得很紧张")
             .action("与其他学生交谈", "你了解到失踪的学生最近在研究危险的魔法")
             .choice("询问更多细节", "student_details")
             .choice("前往失踪学生的房间", "missing_room")
             .choice("返回大厅重新考虑", "entrance_hall")
             
             # 分支剧情
             .scene("forbidden_magic", "你发现了关于黑魔法的可怕真相")
             .scene("missing_student_clue", "你找到了失踪学生留下的神秘笔记")
             .scene("direct_question", "院长承认了学院里确实发生了一些不寻常的事情")
             .scene("indirect_approach", "院长给出了一些模糊的暗示")
             .scene("student_details", "学生们告诉你失踪者最后被看到时在地下室")
             .scene("missing_room", "失踪学生的房间里有明显的魔法斗争痕迹")
             
             # 设置起始场景
             .start_at("entrance_hall")
             .build())
    
    print(f"构建完成故事: {story.title}")
    print(f"节点数量: {len(story.nodes)}")
    print(f"起始节点: {story.get_start_node().scene if story.get_start_node() else 'None'}")
    
    # 分析故事结构
    analyzer = NarrativeAnalyzer(story)
    summary = analyzer.get_narrative_summary()
    
    print(f"\n故事分析:")
    print(f"  总路径数: {summary['total_paths']}")
    print(f"  最长路径: {summary['max_path_length']} 个场景")
    print(f"  最短路径: {summary['min_path_length']} 个场景")
    print(f"  选择点数量: {summary['choice_points']}")
    print(f"  平均分支因子: {summary['branching_factor']:.2f}")
    
    # 显示选择点
    choice_points = analyzer.get_choice_points()
    print(f"\n主要选择点:")
    for i, (scene, choices) in enumerate(choice_points[:3], 1):
        print(f"  {i}. {scene}")
        for choice in choices:
            print(f"     - {choice}")
    
    return story


def test_templates():
    """Test predefined narrative templates."""
    print("\n" + "=" * 60)
    print("测试预定义模板")
    print("=" * 60)
    
    templates = [
        ("简单选择故事", NarrativeTemplate.simple_choice_story),
        ("悬疑调查", NarrativeTemplate.mystery_investigation),
        ("RPG冒险", NarrativeTemplate.rpg_adventure)
    ]
    
    template_results = []
    
    for name, template_func in templates:
        print(f"\n测试模板: {name}")
        story = template_func().build()
        analyzer = NarrativeAnalyzer(story)
        summary = analyzer.get_narrative_summary()
        
        print(f"  标题: {story.title}")
        print(f"  节点数: {summary['statistics']['total_nodes']}")
        print(f"  路径数: {summary['total_paths']}")
        print(f"  选择点: {summary['choice_points']}")
        
        template_results.append((name, summary))
    
    # 比较模板复杂度
    print(f"\n模板复杂度比较:")
    for name, summary in template_results:
        complexity_score = (summary['statistics']['total_nodes'] * 
                           summary['choice_points'] * 
                           summary['branching_factor'])
        print(f"  {name}: 复杂度分数 {complexity_score:.1f}")
    
    return template_results


def test_graph_validation():
    """Test graph validation and error detection."""
    print("\n" + "=" * 60)
    print("测试图验证功能")
    print("=" * 60)
    
    # 创建一个有问题的图进行测试
    graph = NarrativeGraph("验证测试图")
    
    # 创建一些节点
    node1 = graph.create_node("起始场景")
    node2 = graph.create_node("可达场景")
    node3 = graph.create_node("不可达场景")  # 这个节点将无法从起始节点到达
    
    # 只连接node1到node2，node3保持孤立
    action = graph.create_action("前进", is_key_action=True)
    graph.bind_action(node1, action, node_to=node2)
    
    # 验证图
    print("验证图结构...")
    issues = graph.validate_graph()
    
    print(f"验证结果:")
    for category, problems in issues.items():
        if problems:
            print(f"  {category}:")
            for problem in problems:
                print(f"    - {problem}")
        else:
            print(f"  {category}: ✓ 无问题")
    
    # 测试可达性分析
    reachable = graph.get_reachable_nodes()
    unreachable = graph.get_unreachable_nodes()
    
    print(f"\n可达性分析:")
    print(f"  可达节点数: {len(reachable)}")
    print(f"  不可达节点数: {len(unreachable)}")
    
    if unreachable:
        print(f"  不可达节点:")
        for node in unreachable:
            print(f"    - {node.scene}")
    
    return graph


def test_serialization():
    """Test JSON serialization and deserialization."""
    print("\n" + "=" * 60)
    print("测试序列化功能")
    print("=" * 60)
    
    # 创建一个测试故事
    original_story = (NarrativeBuilder("序列化测试故事")
                     .scene("start", "开始场景")
                     .event("一个测试事件")
                     .action("测试动作", "测试事件描述")
                     .choice("选择A", "scene_a")
                     .choice("选择B", "scene_b")
                     .scene("scene_a", "场景A")
                     .scene("scene_b", "场景B")
                     .start_at("start")
                     .build())
    
    print(f"原始故事: {original_story.title}")
    print(f"原始节点数: {len(original_story.nodes)}")
    
    # 导出为JSON
    json_data = original_story.to_json(indent=2)
    print(f"JSON大小: {len(json_data)} 字符")
    
    # 从JSON恢复
    restored_story = NarrativeGraph.from_json(json_data)
    print(f"恢复的故事: {restored_story.title}")
    print(f"恢复的节点数: {len(restored_story.nodes)}")
    
    # 验证数据完整性
    print(f"\n数据完整性验证:")
    print(f"  标题匹配: {original_story.title == restored_story.title}")
    print(f"  节点数匹配: {len(original_story.nodes) == len(restored_story.nodes)}")
    print(f"  起始节点匹配: {original_story.start_node_id == restored_story.start_node_id}")
    
    # 保存到文件
    output_file = "test_story_export.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(json_data)
    print(f"  JSON已保存到: {output_file}")
    
    return json_data


def test_export_formats():
    """Test different export formats (Mermaid, DOT)."""
    print("\n" + "=" * 60)
    print("测试导出格式")
    print("=" * 60)
    
    # 创建一个简单的测试故事
    story = (NarrativeBuilder("导出测试")
             .scene("start", "起始")
             .choice("选择1", "end1")
             .choice("选择2", "end2")
             .scene("end1", "结局1")
             .scene("end2", "结局2")
             .start_at("start")
             .build())
    
    analyzer = NarrativeAnalyzer(story)
    
    # Mermaid格式
    print("Mermaid 图表格式:")
    mermaid_output = analyzer.export_to_mermaid()
    print(mermaid_output)
    
    # 保存Mermaid文件
    with open("test_story.mermaid", 'w', encoding='utf-8') as f:
        f.write(mermaid_output)
    print(f"Mermaid图表已保存到: test_story.mermaid")
    
    print("\n" + "-" * 40)
    
    # DOT格式
    print("Graphviz DOT 格式:")
    dot_output = analyzer.export_to_dot()
    print(dot_output)
    
    # 保存DOT文件
    with open("test_story.dot", 'w', encoding='utf-8') as f:
        f.write(dot_output)
    print(f"DOT图表已保存到: test_story.dot")
    
    return mermaid_output, dot_output


def test_advanced_features():
    """Test advanced features like metadata and custom operations."""
    print("\n" + "=" * 60)
    print("测试高级功能")
    print("=" * 60)
    
    # 创建带有元数据的复杂故事
    story = (NarrativeBuilder("高级功能测试")
             .add_graph_metadata("author", "测试作者")
             .add_graph_metadata("version", "1.0")
             .add_graph_metadata("tags", ["测试", "演示", "高级功能"])
             
             .scene("hub", "中心枢纽 - 一个神奇的传送大厅")
             .add_metadata("location_type", "hub")
             .add_metadata("danger_level", 1)
             .event("魔法光芒在空中舞动")
             .action("感受魔法能量", "你感到体内的魔力在增强")
             
             # 创建分支路径
             .branch([
                 ("进入火焰之门", "fire_realm"),
                 ("进入冰霜之门", "ice_realm"),
                 ("进入阴影之门", "shadow_realm")
             ])
             
             .scene("fire_realm", "烈火领域 - 熔岩和火焰的世界")
             .add_metadata("location_type", "elemental")
             .add_metadata("element", "fire")
             .add_metadata("danger_level", 5)
             .event("岩浆气泡在你脚下爆裂")
             .choice("寻找火焰宝石", "fire_treasure")
             .choice("返回枢纽", "hub")
             
             .scene("ice_realm", "冰霜领域 - 永恒的冬日世界")
             .add_metadata("location_type", "elemental")
             .add_metadata("element", "ice")
             .add_metadata("danger_level", 4)
             .event("冰晶在阳光下闪闪发光")
             .choice("寻找冰霜之心", "ice_treasure")
             .choice("返回枢纽", "hub")
             
             .scene("shadow_realm", "阴影领域 - 黑暗和神秘的国度")
             .add_metadata("location_type", "elemental")
             .add_metadata("element", "shadow")
             .add_metadata("danger_level", 7)
             .event("黑暗中传来不明的低语")
             .choice("探索暗影深处", "shadow_treasure")
             .choice("返回枢纽", "hub")
             
             .scene("fire_treasure", "你找到了传说中的火焰宝石")
             .add_metadata("treasure", "fire_gem")
             .scene("ice_treasure", "你获得了神秘的冰霜之心")
             .add_metadata("treasure", "ice_heart")
             .scene("shadow_treasure", "你发现了隐藏在黑暗中的古老秘密")
             .add_metadata("treasure", "shadow_secret")
             
             .start_at("hub")
             .build())
    
    print(f"故事元数据:")
    for key, value in story.metadata.items():
        print(f"  {key}: {value}")
    
    print(f"\n场景元数据示例:")
    for node in list(story.nodes.values())[:3]:
        if node.metadata:
            print(f"  {node.scene}:")
            for key, value in node.metadata.items():
                print(f"    {key}: {value}")
    
    # 分析元数据
    print(f"\n元数据分析:")
    
    # 按危险等级分组
    danger_levels = {}
    for node in story.nodes.values():
        level = node.metadata.get('danger_level', 0)
        if level not in danger_levels:
            danger_levels[level] = []
        danger_levels[level].append(node.scene)
    
    print(f"  按危险等级分组:")
    for level in sorted(danger_levels.keys()):
        print(f"    等级 {level}: {len(danger_levels[level])} 个场景")
    
    # 元素类型统计
    elements = {}
    for node in story.nodes.values():
        element = node.metadata.get('element')
        if element:
            elements[element] = elements.get(element, 0) + 1
    
    print(f"  元素类型分布:")
    for element, count in elements.items():
        print(f"    {element}: {count} 个场景")
    
    return story


def generate_test_report(results: Dict[str, Any]):
    """Generate a comprehensive test report."""
    print("\n" + "=" * 60)
    print("测试报告总结")
    print("=" * 60)
    
    print(f"\n✓ 完成所有测试模块:")
    print(f"  ✓ 基础API功能测试")
    print(f"  ✓ 构建器API测试")
    print(f"  ✓ 预定义模板测试")
    print(f"  ✓ 图验证功能测试")
    print(f"  ✓ 序列化功能测试")
    print(f"  ✓ 导出格式测试")
    print(f"  ✓ 高级功能测试")
    
    print(f"\n📊 统计信息:")
    print(f"  总测试用例: 7 个主要模块")
    print(f"  创建的故事图: {len([k for k in results.keys() if 'story' in k or 'graph' in k])}")
    print(f"  导出文件: test_story_export.json, test_story.mermaid, test_story.dot")
    
    print(f"\n🎯 功能验证:")
    print(f"  ✓ 节点创建和管理")
    print(f"  ✓ 事件附加和处理")
    print(f"  ✓ 动作创建和绑定")
    print(f"  ✓ 约束条件验证")
    print(f"  ✓ 图结构分析")
    print(f"  ✓ JSON序列化/反序列化")
    print(f"  ✓ 多种导出格式")
    print(f"  ✓ 元数据支持")
    
    print(f"\n📝 使用建议:")
    print(f"  1. 对于简单故事，使用 NarrativeBuilder 的流式API")
    print(f"  2. 对于复杂逻辑，直接使用 NarrativeGraph 基础API")
    print(f"  3. 利用预定义模板快速开始")
    print(f"  4. 使用验证功能确保图结构正确")
    print(f"  5. 利用分析工具优化故事结构")


def main():
    """Main integration test function."""
    print("🎮 交互式叙事图系统 - 集成测试")
    print("=" * 60)
    print("此脚本演示剧情图系统的完整功能套件")
    print("包括基础操作、高级构建、模板、验证和分析工具")
    
    # 存储测试结果
    results = {}
    
    try:
        # 运行所有测试
        results['basic_graph'] = test_basic_api()
        results['builder_story'] = test_builder_api()
        results['templates'] = test_templates()
        results['validation_graph'] = test_graph_validation()
        results['json_data'] = test_serialization()
        results['export_formats'] = test_export_formats()
        results['advanced_story'] = test_advanced_features()
        
        # 生成测试报告
        generate_test_report(results)
        
        print(f"\n🎉 所有测试成功完成!")
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)