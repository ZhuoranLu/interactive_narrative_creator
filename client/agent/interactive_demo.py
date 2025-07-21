"""
interactive_demo.py

一个交互式命令行工具，用于测试和演示 `NarrativeEditor` 提供的所有UGC功能。
"""

import os
import sys

# 兼容包内导入和直接运行
try:
    from .narrative_generator import NarrativeGenerator, create_story_from_idea
    from .llm_client import LLMClient
    from .narrative_editor import NarrativeEditor
    from ..utils.narrative_graph import Node
except (ImportError, SystemError):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    sys.path.insert(0, os.path.dirname(current_dir))
    from narrative_generator import NarrativeGenerator, create_story_from_idea # type: ignore
    from llm_client import LLMClient # type: ignore
    from narrative_editor import NarrativeEditor # type: ignore
    from client.utils.narrative_graph import Node # type: ignore


def display_node(node: Node):
    """在控制台清晰地展示节点内容"""
    print("\n" + "="*80)
    print("🎭 当前场景")
    print("="*80)
    print(node.scene)
    
    if node.events:
        print("\n" + "-"*30 + " 背景事件 " + "-"*30)
        for event in node.events:
            speaker = event.speaker or "旁白"
            print(f"  [{event.id[:8]}] {speaker}: {event.content}")

    if node.outgoing_actions:
        print("\n" + "-"*30 + " 动作选项 " + "-"*30)
        for binding in node.outgoing_actions:
            action = binding.action
            nav = action.metadata.get('navigation', 'unknown')
            print(f"  [{action.id[:8]}] ({nav}) - {action.description}")
    print("="*80)


def get_user_input(prompt: str) -> str:
    """获取用户输入，处理退出"""
    response = input(f"\n> {prompt}")
    if response.lower() in ['quit', 'exit']:
        raise KeyboardInterrupt
    return response

def main_loop(editor: NarrativeEditor, initial_node: Node):
    """主交互循环"""
    current_node = initial_node
    
    while True:
        display_node(current_node)
        print("\n你可以做什么? (输入 'help' 查看所有指令)")
        command = get_user_input("请输入指令: ").lower().strip()

        if command == 'help':
            print("""
--- 指令列表 ---
[内容编辑]
  regen scene            - 重新生成场景
  regen events           - 重新生成背景事件
  regen actions          - 重新生成动作选项
  edit scene             - 直接编辑场景文本

[动作编辑]
  add action             - 添加一个新动作
  edit action [id]       - 修改一个动作的描述
  del action [id]        - 删除一个动作

[事件编辑]
  add dialogue           - 添加一句对话
  del event [id]         - 删除一个事件

[其他]
  next                   - (占位) 进入下一个节点 (未实现)
  quit / exit            - 退出
""")
        # --- 内容编辑 ---
        elif command == 'regen scene':
            context = get_user_input("请输入重新生成场景的额外要求 (可选): ")
            current_node = editor.regenerate_part(current_node, 'scene', context)
        elif command == 'regen events':
            context = get_user_input("请输入重新生成事件的额外要求 (可选): ")
            current_node = editor.regenerate_part(current_node, 'events', context)
        elif command == 'regen actions':
            context = get_user_input("请输入重新生成动作的额外要求 (可选): ")
            current_node = editor.regenerate_part(current_node, 'actions', context)
        elif command == 'edit scene':
            print("--- 当前场景 ---")
            print(current_node.scene)
            print("--- (在新行输入你的新场景内容, 输入 'END' 结束) ---")
            new_scene_lines = []
            while True:
                line = get_user_input("")
                if line == 'END':
                    break
                new_scene_lines.append(line)
            current_node = editor.edit_scene(current_node, "\n".join(new_scene_lines))

        # --- 动作编辑 ---
        elif command == 'add action':
            desc = get_user_input("输入新动作的描述: ")
            nav = get_user_input("输入类型 ('continue' 或 'stay'): ").lower()
            fx_choice = get_user_input("AI生成效果还是自己写? (ai/manual): ").lower()
            effects = None
            if fx_choice == 'manual':
                response = get_user_input("输入 'stay' 时的反馈文本 (可选): ")
                world_changes = get_user_input("输入对世界状态的影响: ")
                effects = {"response": response, "effects": {"world_state_changes": world_changes}}
            current_node = editor.add_action(current_node, desc, nav, effects)

        elif command.startswith('edit action'):
            try:
                action_id_prefix = command.split()[2]
                action_id = [b.action.id for b in current_node.outgoing_actions if b.action.id.startswith(action_id_prefix)][0]
                new_desc = get_user_input(f"输入动作 '{action_id_prefix}' 的新描述: ")
                current_node = editor.edit_action_description(current_node, action_id, new_desc)
            except (IndexError, TypeError):
                print("❌ 指令格式错误。用法: edit action [id]")

        elif command.startswith('del action'):
            try:
                action_id_prefix = command.split()[2]
                action_id = [b.action.id for b in current_node.outgoing_actions if b.action.id.startswith(action_id_prefix)][0]
                current_node = editor.delete_action(current_node, action_id)
            except (IndexError, TypeError):
                print("❌ 指令格式错误。用法: del action [id]")

        # --- 事件编辑 ---
        elif command == 'add dialogue':
            speaker = get_user_input("输入说话人: ")
            content = get_user_input("输入对话内容: ")
            current_node = editor.add_dialogue_event(current_node, speaker, content)

        elif command.startswith('del event'):
            try:
                event_id_prefix = command.split()[2]
                event_id = [e.id for e in current_node.events if e.id.startswith(event_id_prefix)][0]
                current_node = editor.delete_event(current_node, event_id)
            except (IndexError, TypeError):
                print("❌ 指令格式错误。用法: del event [id]")

        elif command == 'next':
            print("🚧 'next' 功能尚未实现。请重启以开始新故事。")
            
        else:
            print(f"❓ 未知指令: '{command}'")


if __name__ == "__main__":
    print("🚀 欢迎来到UGC互动叙事编辑器!")
    
    # 初始化
    llm = LLMClient()
    generator = NarrativeGenerator(
        llm,
        world_setting="现代都市奇幻",
        characters=["主角 (你)", "一个神秘的街头艺人"],
        style="悬疑, 轻小说",
        tags=["都市传说", "超能力"]
    )
    editor = NarrativeEditor(generator)

    idea = get_user_input("请输入你的故事创意 (例如: '在一个雨夜，我遇到一个能预见未来的街头艺人'): ")
    
    print("\n⏳ 正在生成初始故事节点...")
    # 直接调用 generator.bootstrap_node()
    first_node = generator.bootstrap_node(idea)
    initial_state = first_node.metadata.get("world_state", {})
    
    try:
        main_loop(editor, first_node)
    except KeyboardInterrupt:
        print("\n\n👋 感谢使用，再见!")
    except Exception as e:
        print(f"\n❌ 发生意外错误: {e}") 