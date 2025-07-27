#!/usr/bin/env python3
"""
节点数据结构验证工具

使用示例:
    python3 validate_node_structure.py
    
功能:
    1. 验证 example_node_data.json 的结构完整性
    2. 生成新的真实节点示例
    3. 比较数据结构一致性
"""

import json
import sys
import os
from typing import Dict, Any

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(parent_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

def validate_example_file():
    """验证示例文件的结构"""
    print("🔍 验证 example_node_data.json 文件...")
    
    try:
        with open('example_node_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print("✅ JSON 文件格式正确")
        
        # 检查主要结构
        required_sections = [
            'narrative_graph_examples',
            'examples', 
            'data_structure_reference',
            'api_usage_examples',
            'development_guidelines'
        ]
        
        for section in required_sections:
            if section in str(data):
                print(f"✅ 包含 {section} 部分")
            else:
                print(f"❌ 缺少 {section} 部分")
        
        # 检查示例节点结构
        examples = data.get('narrative_graph_examples', {}).get('examples', {})
        if 'ai_generated_complete_node' in examples:
            node_data = examples['ai_generated_complete_node']['node_data']
            required_fields = ['id', 'scene', 'node_type', 'events', 'outgoing_actions', 'metadata']
            
            for field in required_fields:
                if field in node_data:
                    print(f"✅ 节点包含 {field} 字段")
                else:
                    print(f"❌ 节点缺少 {field} 字段")
        
        return True
        
    except Exception as e:
        print(f"❌ 验证失败: {e}")
        return False

def generate_fresh_example():
    """生成新的真实示例节点"""
    print("\n🎲 生成新的真实节点示例...")
    
    try:
        from narrative_generator import NarrativeGenerator
        from llm_client import LLMClient
        
        # 创建生成器
        llm_client = LLMClient()
        generator = NarrativeGenerator(
            llm_client=llm_client,
            world_setting="科幻太空探索",
            characters=["船长莎拉", "AI助手"],
            style="科幻冒险风格"
        )
        
        # 生成节点
        idea = "宇宙飞船在未知星系发现了古老的外星遗迹"
        node = generator.bootstrap_node(idea)
        
        # 转换为字典
        node_dict = node.to_dict()
        
        print("✅ 新节点生成成功!")
        print(f"   节点ID: {node.id}")
        print(f"   场景长度: {len(node.scene)} 字符")
        print(f"   事件数量: {len(node.events)}")
        print(f"   动作数量: {len(node.outgoing_actions)}")
        
        return node_dict
        
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        return None

def compare_structures(dict1: Dict[str, Any], dict2: Dict[str, Any], path: str = ""):
    """比较两个字典的结构"""
    differences = []
    
    # 检查第一个字典的键
    for key in dict1.keys():
        current_path = f"{path}.{key}" if path else key
        
        if key not in dict2:
            differences.append(f"缺少字段: {current_path}")
        elif isinstance(dict1[key], dict) and isinstance(dict2[key], dict):
            differences.extend(compare_structures(dict1[key], dict2[key], current_path))
        elif type(dict1[key]) != type(dict2[key]):
            differences.append(f"类型不匹配: {current_path} ({type(dict1[key]).__name__} vs {type(dict2[key]).__name__})")
    
    # 检查第二个字典是否有额外的键
    for key in dict2.keys():
        current_path = f"{path}.{key}" if path else key
        if key not in dict1:
            differences.append(f"额外字段: {current_path}")
    
    return differences

def main():
    """主函数"""
    print("=" * 60)
    print("🔧 Interactive Narrative Creator - 数据结构验证工具")
    print("=" * 60)
    
    # 1. 验证示例文件
    if not validate_example_file():
        print("\n❌ 示例文件验证失败，请检查 example_node_data.json")
        return
    
    # 2. 生成新示例并比较
    print("\n" + "=" * 40)
    new_node = generate_fresh_example()
    
    if new_node:
        # 加载示例文件中的节点结构
        try:
            with open('example_node_data.json', 'r', encoding='utf-8') as f:
                examples = json.load(f)
            
            example_node = examples['narrative_graph_examples']['examples']['ai_generated_complete_node']['node_data']
            
            print("\n🔍 比较数据结构一致性...")
            differences = compare_structures(example_node, new_node)
            
            if not differences:
                print("✅ 数据结构完全一致!")
            else:
                print("⚠️  发现结构差异:")
                for diff in differences[:10]:  # 只显示前10个差异
                    print(f"   - {diff}")
                if len(differences) > 10:
                    print(f"   ... 还有 {len(differences) - 10} 个差异")
        
        except Exception as e:
            print(f"❌ 比较失败: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 验证完成!")
    print("\n📖 使用建议:")
    print("   1. 参考 example_node_data.json 了解完整数据结构")
    print("   2. 使用 data_structure_reference 部分作为开发参考")
    print("   3. 遵循 development_guidelines 中的规范")
    print("=" * 60)

if __name__ == "__main__":
    main() 