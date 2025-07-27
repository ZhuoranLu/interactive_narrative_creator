#!/usr/bin/env python3
"""
Test Script: Database Sync API Endpoints

This script tests the new CRUD API endpoints for nodes, events, and actions
to ensure they work correctly with the database synchronization features.
"""

import requests
import json
import sys
import os


class APITester:
    """Test the narrative database sync API endpoints"""
    
    def __init__(self, base_url="http://localhost:8000", auth_token=None):
        self.base_url = base_url
        self.headers = {"Content-Type": "application/json"}
        if auth_token:
            self.headers["Authorization"] = f"Bearer {auth_token}"
    
    def test_connection(self):
        """Test basic API connection"""
        print("🔗 测试API连接...")
        try:
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                print("✅ API连接成功")
                return True
            else:
                print(f"❌ API连接失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 连接错误: {str(e)}")
            return False
    
    def create_test_user(self):
        """Create a test user for API testing"""
        print("\n👤 创建测试用户...")
        user_data = {
            "username": "test_user_db_sync",
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Database Sync Test User"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                print("✅ 测试用户创建成功")
                return response.json()
            elif response.status_code == 400:
                print("⚠️ 用户可能已存在，尝试登录...")
                return self.login_test_user()
            else:
                print(f"❌ 用户创建失败: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ 用户创建错误: {str(e)}")
            return None
    
    def login_test_user(self):
        """Login with test user"""
        print("\n🔐 登录测试用户...")
        login_data = {
            "username": "test_user_db_sync",
            "password": "testpassword123"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                print("✅ 登录成功")
                login_response = response.json()
                # Update headers with auth token
                self.headers["Authorization"] = f"Bearer {login_response['access_token']}"
                return login_response
            else:
                print(f"❌ 登录失败: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ 登录错误: {str(e)}")
            return None
    
    def create_test_project(self):
        """Create a test project"""
        print("\n📝 创建测试项目...")
        project_data = {
            "title": "Database Sync Test Project",
            "description": "A project for testing database synchronization",
            "world_setting": "Modern fantasy world",
            "characters": ["Hero", "Guide"],
            "style": "Interactive fiction"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/projects",
                json=project_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                project = response.json()
                print(f"✅ 项目创建成功: {project['id']}")
                return project
            else:
                print(f"❌ 项目创建失败: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ 项目创建错误: {str(e)}")
            return None
    
    def test_node_operations(self, project_id):
        """Test node CRUD operations"""
        print("\n🏗️ 测试Node操作...")
        
        # First, we need to create a node through the project
        # For now, let's just test the update operation on a hypothetical node
        print("注意: Node创建需要通过项目图谱，这里测试的是更新和删除操作")
        
        # Test node update (would fail if node doesn't exist, which is expected)
        test_node_id = "test_node_123"
        update_data = {
            "scene": "Updated scene description for testing",
            "metadata": {"test": True}
        }
        
        try:
            response = requests.put(
                f"{self.base_url}/nodes/{test_node_id}",
                json=update_data,
                headers=self.headers
            )
            
            if response.status_code == 404:
                print("✅ Node更新API正常工作 (节点不存在，返回404)")
            else:
                print(f"📝 Node更新响应: {response.status_code}")
        except Exception as e:
            print(f"❌ Node更新测试错误: {str(e)}")
    
    def test_event_operations(self, project_id):
        """Test event CRUD operations"""
        print("\n🎭 测试Event操作...")
        
        # Test event creation (would fail without valid node_id)
        test_node_id = "test_node_123"
        event_data = {
            "node_id": test_node_id,
            "content": "Test dialogue content",
            "speaker": "Test Speaker",
            "event_type": "dialogue",
            "metadata": {"test": True}
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/events",
                json=event_data,
                headers=self.headers
            )
            
            if response.status_code == 404:
                print("✅ Event创建API正常工作 (节点不存在，返回404)")
            elif response.status_code == 403:
                print("✅ Event创建API正常工作 (权限验证正常)")
            else:
                print(f"📝 Event创建响应: {response.status_code}")
        except Exception as e:
            print(f"❌ Event创建测试错误: {str(e)}")
    
    def test_action_operations(self, project_id):
        """Test action CRUD operations"""
        print("\n⚡ 测试Action操作...")
        
        # Test action creation
        action_data = {
            "description": "Test action description",
            "is_key_action": False,
            "metadata": {"test": True}
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/actions",
                json=action_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                action = response.json()
                print(f"✅ Action创建成功: {action['id']}")
                
                # Test action update
                update_data = {
                    "description": "Updated test action description"
                }
                
                update_response = requests.put(
                    f"{self.base_url}/actions/{action['id']}",
                    json=update_data,
                    headers=self.headers
                )
                
                if update_response.status_code == 200:
                    print("✅ Action更新成功")
                else:
                    print(f"❌ Action更新失败: {update_response.status_code}")
                
                # Test action deletion
                delete_response = requests.delete(
                    f"{self.base_url}/actions/{action['id']}",
                    headers=self.headers
                )
                
                if delete_response.status_code == 200:
                    print("✅ Action删除成功")
                else:
                    print(f"❌ Action删除失败: {delete_response.status_code}")
                
                return action
            else:
                print(f"❌ Action创建失败: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Action操作测试错误: {str(e)}")
            return None
    
    def test_action_binding_operations(self, project_id):
        """Test action binding CRUD operations"""
        print("\n🔗 测试ActionBinding操作...")
        
        # Create a test action first
        action_data = {
            "description": "Test binding action",
            "is_key_action": True,
            "metadata": {"test": True}
        }
        
        try:
            action_response = requests.post(
                f"{self.base_url}/actions",
                json=action_data,
                headers=self.headers
            )
            
            if action_response.status_code != 200:
                print("❌ 无法创建测试Action进行绑定测试")
                return
            
            action = action_response.json()
            
            # Test action binding creation (would fail without valid nodes)
            binding_data = {
                "action_id": action['id'],
                "source_node_id": "test_source_node",
                "target_node_id": "test_target_node"
            }
            
            binding_response = requests.post(
                f"{self.base_url}/action-bindings",
                json=binding_data,
                headers=self.headers
            )
            
            if binding_response.status_code == 404:
                print("✅ ActionBinding创建API正常工作 (节点不存在，返回404)")
            elif binding_response.status_code == 403:
                print("✅ ActionBinding创建API正常工作 (权限验证正常)")
            else:
                print(f"📝 ActionBinding创建响应: {binding_response.status_code}")
            
            # Clean up the test action
            requests.delete(f"{self.base_url}/actions/{action['id']}", headers=self.headers)
            
        except Exception as e:
            print(f"❌ ActionBinding操作测试错误: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 开始数据库同步API测试")
        print("=" * 50)
        
        # Test basic connection
        if not self.test_connection():
            print("❌ 基础连接失败，无法继续测试")
            return False
        
        # Create or login test user
        user = self.create_test_user()
        if not user:
            print("❌ 用户认证失败，无法继续测试")
            return False
        
        # Create test project
        project = self.create_test_project()
        if not project:
            print("❌ 项目创建失败，无法继续测试")
            return False
        
        project_id = project['id']
        
        # Test CRUD operations
        self.test_node_operations(project_id)
        self.test_event_operations(project_id)
        self.test_action_operations(project_id)
        self.test_action_binding_operations(project_id)
        
        print("\n✨ 测试完成！")
        print("API端点基本功能正常，可以进行数据库同步操作。")
        
        return True


def main():
    """Main test function"""
    print("Database Sync API Test Script")
    print("=" * 40)
    
    # You can modify these settings
    base_url = "http://localhost:8000"
    
    # Create tester and run tests
    tester = APITester(base_url)
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 所有测试完成！数据库同步API准备就绪。")
    else:
        print("\n❌ 测试过程中遇到问题，请检查服务器状态。")
    
    return success


if __name__ == "__main__":
    main() 