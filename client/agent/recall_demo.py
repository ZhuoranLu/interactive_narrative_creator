"""
演示LLM回忆相似作品的功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from narrative_generator import create_story_from_idea


def demo_different_genres():
    """演示不同题材的回忆效果"""
    print("=" * 70)
    print("🧠 LLM回忆功能演示 - 不同题材")
    print("=" * 70)
    
    test_cases = [
        {
            "title": "三国历史架空",
            "idea": "若诸葛亮没死，他会如何改变三国的历史",
            "expected": "三国演义、历史小说"
        },
        {
            "title": "赛博朋克科幻",
            "idea": "在赛博朋克2077的世界里，你是一名数据黑客，发现了公司的阴谋",
            "expected": "黑客帝国、攻壳机动队"
        },
        {
            "title": "魔法学院奇幻",
            "idea": "霍格沃茨魔法学校的新学期开始了，但今年有些不同寻常的事情发生",
            "expected": "哈利波特系列"
        },
        {
            "title": "末日生存",
            "idea": "僵尸末日爆发后的第三年，你是幸存者基地的领导者",
            "expected": "行尸走肉、生化危机"
        },
        {
            "title": "古风武侠",
            "idea": "江湖传说中的神秘剑客终于现身，而你意外卷入了一场武林纷争",
            "expected": "金庸、古龙作品"
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n{'-'*50}")
        print(f"📖 测试 {i}: {case['title']}")
        print(f"💡 创意: {case['idea']}")
        print(f"🎯 期望回忆: {case['expected']}")
        print(f"{'-'*50}")
        
        try:
            first_node, initial_state = create_story_from_idea(case['idea'])
            
            print(f"✅ 生成成功!")
            print(f"📝 场景: {first_node.scene[:200]}...")
            
            # 分析生成的内容风格
            world_state = first_node.metadata.get("world_state", {})
            characters = world_state.get("characters", [])
            location = world_state.get("location", "未知")
            
            print(f"🏛️  设定地点: {location}")
            print(f"👥 主要角色: {', '.join(characters) if characters else '未明确'}")
            
            # 显示动作类型
            print(f"⚡ 关键动作数: {len(first_node.outgoing_actions)}")
            for j, binding in enumerate(first_node.outgoing_actions[:2], 1):  # 只显示前2个
                action = binding.action
                nav = action.metadata.get('navigation', 'continue')
                print(f"   {j}. {action.description} ({nav})")
            
        except Exception as e:
            print(f"❌ 生成失败: {e}")
        
        if i < len(test_cases):
            input("\n按回车键继续下一个测试...")
    
    print(f"\n{'='*70}")
    print("🎉 演示完成！")
    print("通过以上测试可以看到，LLM能够：")
    print("✓ 回忆不同题材的经典作品")
    print("✓ 采用相应的叙述风格和设定")
    print("✓ 创造符合genre特点的角色和情节")
    print(f"{'='*70}")


if __name__ == "__main__":
    demo_different_genres() 