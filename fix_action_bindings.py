#!/usr/bin/env python3
"""
修复 action bindings
"""

import os
import sys
from pathlib import Path

# Add server app to path
current_dir = Path(__file__).parent
server_dir = current_dir / "server"
sys.path.insert(0, str(server_dir))

from server.app.database import SessionLocal, Action, ActionBinding
from server.app.repositories import NarrativeRepository, NodeRepository, ActionRepository

def fix_action_bindings():
    """修复 action bindings"""
    print("🔧 开始修复 action bindings...")
    
    db = SessionLocal()
    try:
        narrative_repo = NarrativeRepository(db)
        node_repo = NodeRepository(db)
        action_repo = ActionRepository(db)
        
        # 获取所有项目
        projects = narrative_repo.get_all_projects()
        
        for project in projects:
            print(f"\n📂 处理项目: {project.title} (ID: {project.id})")
            
            # 获取项目的所有节点
            nodes = node_repo.get_nodes_by_project(project.id)
            print(f"找到 {len(nodes)} 个节点")
            
            for node in nodes:
                print(f"\n  处理节点: {node.id}")
                print(f"  节点场景: {node.scene[:50]}...")
                
                # 获取所有没有 binding 的 actions
                actions = db.query(Action).filter(
                    ~Action.id.in_(
                        db.query(ActionBinding.action_id)
                    ),
                    Action.meta_data.has_key('target_node_id')
                ).all()
                
                print(f"  找到 {len(actions)} 个需要修复的 actions")
                
                for action in actions:
                    target_node_id = action.meta_data.get('target_node_id')
                    if target_node_id:
                        print(f"    ➡️  Action {action.id} ({action.description[:30]}...)")
                        print(f"       目标节点: {target_node_id}")
                        
                        # 检查目标节点是否存在
                        target_node = node_repo.get_node(target_node_id)
                        if not target_node:
                            print(f"       ⚠️  目标节点不存在，跳过")
                            continue
                        
                        # 创建 binding
                        try:
                            binding = action_repo.create_action_binding(
                                action_id=action.id,
                                source_node_id=node.id,
                                target_node_id=target_node_id
                            )
                            print(f"       ✅ 创建了新的 binding: {binding.id}")
                        except Exception as e:
                            print(f"       ❌ 创建 binding 失败: {e}")
                
                # 检查现有的 bindings
                existing_bindings = db.query(ActionBinding).filter(
                    ActionBinding.source_node_id == node.id
                ).all()
                
                print(f"  节点当前有 {len(existing_bindings)} 个 bindings")
                for binding in existing_bindings:
                    action = db.query(Action).get(binding.action_id)
                    if action:
                        print(f"    - {action.description[:50]}... -> {binding.target_node_id}")
        
        print("\n✅ Action bindings 修复完成！")
        
    except Exception as e:
        print(f"\n❌ 修复过程中出错: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_action_bindings()
