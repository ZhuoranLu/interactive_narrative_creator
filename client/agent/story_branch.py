"""story_branch.py
提供便捷方法：根据一个创意自动生成完整剧情分支，
将所有需要人工决策的地方（动作选择）交由可注入的回调处理。
"""

from typing import Callable, Tuple, List, Dict, Optional

# 处理直接运行脚本与包内导入的兼容
try:
    # 作为包导入
    from .narrative_generator import NarrativeGenerator, create_story_from_idea
    from .llm_client import LLMClient
    from ..utils.narrative_graph import Node, ActionBinding
except (ImportError, SystemError):
    # 直接运行脚本时的相对路径处理
    import os, sys
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    sys.path.insert(0, current_dir)
    sys.path.insert(0, parent_dir)
    from narrative_generator import NarrativeGenerator, create_story_from_idea  # type: ignore
    from llm_client import LLMClient  # type: ignore
    from client.utils.narrative_graph import Node, ActionBinding  # type: ignore

# 类型定义
action_choice_fn = Callable[[Node, List[ActionBinding]], str]


def default_action_choice(node: Node, choices: List[ActionBinding]) -> str:
    """默认动作选择：优先选第一个continue，否则首个stay"""
    for b in choices:
        if b.action.metadata.get("navigation") == "continue":
            return b.action.id
    return choices[0].action.id if choices else ""


def generate_story_branch(
    idea: str,
    generator: Optional[NarrativeGenerator] = None,
    choose_action: action_choice_fn = default_action_choice,
    max_depth: int = 10,
) -> Tuple[List[Node], Dict]:
    """从创意开始，自动生成一条剧情分支。
    choose_action 回调负责在每个节点选择一个动作id。
    返回 (节点列表, 最终世界状态)
    """
    if generator is None:
        generator = NarrativeGenerator(LLMClient())
    
    first_node, state = create_story_from_idea(idea)
    branch = [first_node]
    current_node = first_node

    depth = 0
    while depth < max_depth:
        # 过滤continue动作
        continue_actions = [b for b in current_node.outgoing_actions if b.action.metadata.get("navigation") == "continue"]
        if not continue_actions:
            print(f"第{len(branch)}节点没有continue动作，分支结束")
            break
        chosen_id = choose_action(current_node, continue_actions)
        if not chosen_id:
            print("没有选择任何动作，分支结束")
            break
        next_node, state, _ = generator.apply_action(current_node, chosen_id, state)
        if next_node is None:
            print("apply_action返回None，分支结束")
            break
        branch.append(next_node)
        current_node = next_node
        depth += 1
    return branch, state

# 示例运行
if __name__ == "__main__":
    idea_sample = "霍格沃茨开学第一天，哈利遇见了一个神秘的新生"
    gen = NarrativeGenerator(
        LLMClient(), 
        world_setting="哈利波特原著时间线：第三学年", 
        characters=["哈利", "神秘新生"], 
        cp="哈利×OC", 
        style="校园奇幻", 
        tags=["甜文", "友情"]
    )
    story_branch, final_state = generate_story_branch(idea_sample, gen)
    print("生成节点数:", len(story_branch))
    for idx, n in enumerate(story_branch, 1):
        continue_actions = [b for b in n.outgoing_actions if b.action.metadata.get("navigation") == "continue"]
        print(f"\n=== 第{idx}节点 ===\n{n.scene}\n可继续动作: {len(continue_actions)}")
        print(f"背景事件: {len(n.events)}个")
        print(f"总动作: {len(n.outgoing_actions)}个")
    print("最终世界状态:", final_state) 