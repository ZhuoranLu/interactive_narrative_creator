#!/usr/bin/env python3
"""
实际使用示例：数据库同步功能集成

这个示例展示了如何在实际项目中集成数据库同步功能，
包括用户认证、项目管理和实时编辑。
"""

import os
import sys
import json

# 添加路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from client.utils.api_client import api_client, APIResponse
from client.plot.database_sync_editor import create_database_sync_editor
from client.plot.plot_graph import Node, Event, Action, ActionBinding, NodeType
from server.app.agent.narrative_generator import NarrativeGenerator


class NarrativeProjectManager:
    """叙事项目管理器，集成数据库同步功能"""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        api_client.base_url = base_url
        self.current_user = None
        self.current_project = None
        self.editor = None
        
    def login(self, username: str, password: str) -> bool:
        """用户登录"""
        print(f"🔐 正在登录用户: {username}")
        
        try:
            import requests
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"username": username, "password": password},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                login_data = response.json()
                self.current_user = login_data['user']
                
                # 设置认证令牌
                api_client.set_auth_token(login_data['access_token'])
                
                # 初始化编辑器
                generator = NarrativeGenerator()
                self.editor = create_database_sync_editor(
                    generator, 
                    auth_token=login_data['access_token'],
                    auto_sync=True
                )
                
                print(f"✅ 登录成功，欢迎 {self.current_user['username']}")
                return True
            else:
                print(f"❌ 登录失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 登录错误: {str(e)}")
            return False
    
    def create_project(self, title: str, description: str = "", **kwargs) -> dict:
        """创建新项目"""
        print(f"📝 创建项目: {title}")
        
        project_data = {
            "title": title,
            "description": description,
            "world_setting": kwargs.get("world_setting", ""),
            "characters": kwargs.get("characters", []),
            "style": kwargs.get("style", "")
        }
        
        try:
            import requests
            response = requests.post(
                f"{self.base_url}/projects",
                json=project_data,
                headers={
                    "Authorization": f"Bearer {api_client.auth_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                self.current_project = response.json()
                print(f"✅ 项目创建成功: {self.current_project['id']}")
                return self.current_project
            else:
                print(f"❌ 项目创建失败: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ 项目创建错误: {str(e)}")
            return None
    
    def load_project(self, project_id: str) -> bool:
        """加载现有项目"""
        print(f"📂 加载项目: {project_id}")
        
        try:
            import requests
            response = requests.get(
                f"{self.base_url}/projects/{project_id}",
                headers={
                    "Authorization": f"Bearer {api_client.auth_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                self.current_project = response.json()
                print(f"✅ 项目加载成功: {self.current_project['title']}")
                return True
            else:
                print(f"❌ 项目加载失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 项目加载错误: {str(e)}")
            return False
    
    def create_story_node(self, scene_text: str) -> Node:
        """创建故事节点（自动同步到数据库）"""
        print(f"🎬 创建故事节点")
        
        # 创建节点对象
        node = Node(
            scene=scene_text,
            node_type=NodeType.SCENE
        )
        
        # 这里需要通过API创建节点，因为我们需要project_id关联
        # 在实际实现中，您可能需要调用一个专门的节点创建API
        print(f"节点创建: {node.scene[:50]}...")
        
        return node
    
    def edit_node_with_sync(self, node: Node, new_scene: str = None, **kwargs) -> Node:
        """编辑节点并同步到数据库"""
        if not self.editor:
            print("❌ 编辑器未初始化，请先登录")
            return node
        
        print("✏️ 编辑节点...")
        
        # 更新场景文本
        if new_scene:
            node = self.editor.edit_scene(node, new_scene)
        
        # 添加对话事件
        if 'dialogue' in kwargs:
            for speaker, content in kwargs['dialogue']:
                node = self.editor.add_dialogue_event(node, speaker, content)
        
        # 添加动作
        if 'actions' in kwargs:
            for action_desc, nav_type in kwargs['actions']:
                node = self.editor.add_action(node, action_desc, nav_type)
        
        return node
    
    def interactive_editing_session(self, node: Node):
        """交互式编辑会话"""
        print("\n🎮 进入交互式编辑模式")
        print("可用命令：scene, dialogue, action, save, quit")
        print("-" * 50)
        
        while True:
            try:
                command = input("\n📝 请输入命令 > ").strip().lower()
                
                if command == 'quit' or command == 'q':
                    break
                    
                elif command == 'scene':
                    new_scene = input("输入新的场景描述: ")
                    if new_scene:
                        node = self.editor.edit_scene(node, new_scene)
                        
                elif command == 'dialogue' or command == 'd':
                    speaker = input("角色名: ")
                    content = input("对话内容: ")
                    if speaker and content:
                        node = self.editor.add_dialogue_event(node, speaker, content)
                        
                elif command == 'action' or command == 'a':
                    description = input("动作描述: ")
                    nav_type = input("导航类型 (continue/stay): ")
                    if description and nav_type in ['continue', 'stay']:
                        node = self.editor.add_action(node, description, nav_type)
                    else:
                        print("❌ 无效的导航类型")
                        
                elif command == 'save' or command == 's':
                    print("💾 执行批量同步...")
                    responses = self.editor.batch_sync_node(node)
                    success_count = sum(1 for r in responses if r.success)
                    print(f"同步结果: {success_count}/{len(responses)} 成功")
                    
                elif command == 'status':
                    self.show_node_status(node)
                    
                elif command == 'help' or command == 'h':
                    print("可用命令:")
                    print("  scene - 编辑场景文本")
                    print("  dialogue/d - 添加对话")
                    print("  action/a - 添加动作")
                    print("  save/s - 批量同步到数据库")
                    print("  status - 显示节点状态")
                    print("  quit/q - 退出")
                    
                else:
                    print("❌ 未知命令，输入 'help' 查看帮助")
                    
            except KeyboardInterrupt:
                print("\n\n👋 编辑会话结束")
                break
            except Exception as e:
                print(f"❌ 错误: {str(e)}")
        
        return node
    
    def show_node_status(self, node: Node):
        """显示节点状态"""
        print(f"\n📊 节点状态:")
        print(f"ID: {node.id}")
        print(f"场景: {node.scene[:100]}...")
        print(f"事件数量: {len(node.events)}")
        print(f"动作数量: {len(node.outgoing_actions)}")
        
        if node.events:
            print("\n对话事件:")
            for i, event in enumerate(node.events, 1):
                print(f"  {i}. {event.speaker}: {event.content[:50]}...")
        
        if node.outgoing_actions:
            print("\n可用动作:")
            for i, binding in enumerate(node.outgoing_actions, 1):
                action_type = "主要" if binding.action.is_key_action else "普通"
                print(f"  {i}. [{action_type}] {binding.action.description}")
    
    def demo_workflow(self):
        """演示完整工作流程"""
        print("🎬 演示：数据库同步功能完整工作流程")
        print("=" * 60)
        
        # 步骤1：创建示例项目
        project = self.create_project(
            title="魔法图书馆历险记",
            description="一个关于在古老图书馆中探索魔法奥秘的互动故事",
            world_setting="奇幻世界",
            characters=["主角", "图书管理员", "魔法学者"],
            style="互动小说"
        )
        
        if not project:
            print("❌ 项目创建失败，无法继续演示")
            return
        
        # 步骤2：创建故事节点
        initial_scene = """
        你推开厚重的橡木门，踏入了传说中的魔法图书馆。高耸的书架延伸到看不见的天花板，
        书架间漂浮着发出微光的法术书籍。空气中弥漫着古老羊皮纸和神秘香料的味道。
        一位穿着深蓝色长袍的图书管理员向你走来。
        """
        
        node = self.create_story_node(initial_scene.strip())
        
        # 步骤3：使用编辑器添加内容
        print("\n📝 添加对话和动作...")
        
        node = self.edit_node_with_sync(
            node,
            dialogue=[
                ("图书管理员", "欢迎来到阿卡纳图书馆，年轻的探索者。你是来寻找特定的知识，还是纯粹被好奇心驱使？"),
                ("主角", "我听说这里有关于失落法术的古老典籍，我想了解更多关于时间魔法的知识。")
            ],
            actions=[
                ("询问关于时间魔法的具体信息", "stay"),
                ("请求查看禁书区域", "continue"),
                ("感谢并离开图书馆", "continue")
            ]
        )
        
        # 步骤4：显示节点状态
        self.show_node_status(node)
        
        # 步骤5：演示交互式编辑（可选）
        user_input = input("\n🤔 是否要进入交互式编辑模式？(y/n): ").strip().lower()
        if user_input == 'y':
            node = self.interactive_editing_session(node)
        
        # 步骤6：最终同步
        print("\n💾 执行最终同步...")
        if self.editor:
            responses = self.editor.batch_sync_node(node)
            success_count = sum(1 for r in responses if r.success)
            print(f"✅ 同步完成: {success_count}/{len(responses)} 操作成功")
        
        print("\n🎉 演示完成！数据库同步功能运行正常。")
        return node


def main():
    """主函数"""
    print("Interactive Narrative Creator - Database Sync Demo")
    print("=" * 55)
    
    # 创建项目管理器
    manager = NarrativeProjectManager()
    
    # 模拟用户登录（在实际应用中，这些信息来自用户输入）
    print("📋 注意：这是演示模式")
    print("在实际使用中，您需要：")
    print("1. 启动后端API服务器 (python -m uvicorn server.app.main:app --reload)")
    print("2. 创建用户账户")
    print("3. 使用真实的登录凭据")
    
    # 演示登录流程（需要真实的服务器）
    demo_mode = input("\n是否运行离线演示模式？(y/n): ").strip().lower()
    
    if demo_mode == 'y':
        print("\n🔧 离线演示模式")
        # 模拟登录成功
        manager.current_user = {"username": "demo_user", "id": "demo_123"}
        
        # 创建离线编辑器
        generator = NarrativeGenerator()
        manager.editor = create_database_sync_editor(generator, auto_sync=False)
        manager.editor.disable_sync()
        
        print("⚠️ 数据库同步已禁用（离线模式）")
        
        # 运行演示工作流程
        manager.demo_workflow()
    else:
        print("\n🌐 在线模式")
        print("请确保API服务器正在运行，然后输入登录信息：")
        
        username = input("用户名: ")
        password = input("密码: ")
        
        if manager.login(username, password):
            manager.demo_workflow()
        else:
            print("❌ 登录失败，请检查服务器状态和登录信息")


if __name__ == "__main__":
    main() 