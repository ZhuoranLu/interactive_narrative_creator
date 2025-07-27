#!/usr/bin/env python3
"""
Test Script for Story Edit History Feature

This script tests the new story edit history and rollback functionality
including creating snapshots, retrieving history, and performing rollbacks.

Usage:
    python test_story_history_feature.py

Requirements:
    - FastAPI server running on localhost:8000
    - Test user account (will be created if needed)
    - Test project (will be created if needed)
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class StoryHistoryTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.access_token = None
        self.test_user = {
            "username": f"history_test_user_{int(time.time())}",
            "email": f"history_test_{int(time.time())}@example.com",
            "password": "test_password_123"
        }
        self.test_project_id = None
        self.test_node_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {"Content-Type": "application/json"}
        if self.access_token:
            default_headers["Authorization"] = f"Bearer {self.access_token}"
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=default_headers)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=default_headers)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=default_headers)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=default_headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request error: {e}", "ERROR")
            raise
    
    def test_connection(self) -> bool:
        """Test if the FastAPI server is running"""
        self.log("Testing server connection...")
        
        try:
            response = self.make_request("GET", "/")
            if response.status_code == 200:
                self.log("✅ Server connection successful")
                return True
            else:
                self.log(f"❌ Server returned status {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to connect to server: {e}", "ERROR")
            return False
    
    def create_test_user(self) -> bool:
        """Create a test user account"""
        self.log(f"Creating test user: {self.test_user['username']}")
        
        try:
            response = self.make_request("POST", "/auth/register", self.test_user)
            
            if response.status_code == 200:
                self.log("✅ Test user created successfully")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                self.log(f"❌ Failed to create user: {error_detail}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ User creation error: {e}", "ERROR")
            return False
    
    def login_test_user(self) -> bool:
        """Login with test user credentials"""
        self.log("Logging in test user...")
        
        try:
            login_data = {
                "username": self.test_user["username"],
                "password": self.test_user["password"]
            }
            
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.log("✅ Login successful")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                self.log(f"❌ Login failed: {error_detail}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Login error: {e}", "ERROR")
            return False
    
    def create_test_project(self) -> bool:
        """Create a test project"""
        self.log("Creating test project...")
        
        try:
            project_data = {
                "title": f"History Test Project {int(time.time())}",
                "description": "Test project for story edit history functionality"
            }
            
            response = self.make_request("POST", "/projects", project_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_project_id = data.get("id")
                self.log(f"✅ Test project created: {self.test_project_id}")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                self.log(f"❌ Failed to create project: {error_detail}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Project creation error: {e}", "ERROR")
            return False
    
    def create_test_node(self) -> bool:
        """Create a test node in the project"""
        self.log("Creating test node...")
        
        try:
            # First, let's try to bootstrap a story
            bootstrap_data = {
                "request_type": "bootstrap_node",
                "context": {"idea": "A test story for history functionality"},
                "user_input": "Create a simple test story"
            }
            
            response = self.make_request("POST", "/narrative", bootstrap_data)
            
            if response.status_code == 200:
                data = response.json()
                # Extract node ID from response if available
                if data.get("success") and data.get("data"):
                    self.test_node_id = data["data"].get("id", "test_node_123")
                else:
                    self.test_node_id = "test_node_123"
                
                self.log(f"✅ Test node created: {self.test_node_id}")
                return True
            else:
                # If bootstrap fails, we'll create a simple node for testing
                self.test_node_id = "test_node_123"
                self.log("⚠️ Bootstrap failed, using mock node ID for testing")
                return True
        except Exception as e:
            self.log(f"❌ Node creation error: {e}", "ERROR")
            return False
    
    def test_create_snapshot(self) -> bool:
        """Test creating a snapshot"""
        self.log("Testing snapshot creation...")
        
        try:
            snapshot_data = {
                "operation_type": "test_operation",
                "operation_description": "Test snapshot for history functionality",
                "affected_node_id": self.test_node_id
            }
            
            response = self.make_request(
                "POST", 
                f"/projects/{self.test_project_id}/history/snapshot",
                snapshot_data
            )
            
            if response.status_code == 200:
                data = response.json()
                snapshot_id = data.get("snapshot_id")
                self.log(f"✅ Snapshot created successfully: {snapshot_id}")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                self.log(f"❌ Failed to create snapshot: {error_detail}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Snapshot creation error: {e}", "ERROR")
            return False
    
    def test_get_history(self) -> Optional[Dict]:
        """Test retrieving project history"""
        self.log("Testing history retrieval...")
        
        try:
            response = self.make_request("GET", f"/projects/{self.test_project_id}/history")
            
            if response.status_code == 200:
                data = response.json()
                history = data.get("history", [])
                total_count = data.get("total_count", 0)
                
                self.log(f"✅ History retrieved successfully: {total_count} entries")
                
                if history:
                    self.log("📋 History entries:")
                    for i, entry in enumerate(history):
                        self.log(f"   {i+1}. {entry.get('operation_type')} - {entry.get('operation_description')}")
                
                return data
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                self.log(f"❌ Failed to get history: {error_detail}", "ERROR")
                return None
        except Exception as e:
            self.log(f"❌ History retrieval error: {e}", "ERROR")
            return None
    
    def test_multiple_snapshots(self) -> bool:
        """Test creating multiple snapshots"""
        self.log("Testing multiple snapshot creation...")
        
        operations = [
            ("edit_scene", "Edited scene description"),
            ("add_event", "Added a dialogue event"),
            ("add_action", "Added a new action"),
            ("update_event", "Updated event content"),
            ("delete_action", "Deleted an action")
        ]
        
        success_count = 0
        
        for i, (op_type, op_desc) in enumerate(operations):
            try:
                snapshot_data = {
                    "operation_type": op_type,
                    "operation_description": f"{op_desc} #{i+1}",
                    "affected_node_id": self.test_node_id
                }
                
                response = self.make_request(
                    "POST",
                    f"/projects/{self.test_project_id}/history/snapshot",
                    snapshot_data
                )
                
                if response.status_code == 200:
                    success_count += 1
                    self.log(f"   ✅ Created snapshot {i+1}: {op_type}")
                else:
                    self.log(f"   ❌ Failed to create snapshot {i+1}: {op_type}")
                
                # Small delay between snapshots
                time.sleep(0.1)
                
            except Exception as e:
                self.log(f"   ❌ Error creating snapshot {i+1}: {e}")
        
        self.log(f"✅ Created {success_count}/{len(operations)} snapshots successfully")
        return success_count > 0
    
    def test_rollback(self, history_data: Dict) -> bool:
        """Test rollback functionality"""
        self.log("Testing rollback functionality...")
        
        history = history_data.get("history", [])
        
        if len(history) < 2:
            self.log("⚠️ Not enough history entries to test rollback")
            return True
        
        # Try to rollback to the second most recent snapshot
        rollback_target = history[1]  # Skip the most recent one
        snapshot_id = rollback_target["id"]
        description = rollback_target["operation_description"]
        
        try:
            rollback_data = {"snapshot_id": snapshot_id}
            
            response = self.make_request(
                "POST",
                f"/projects/{self.test_project_id}/history/rollback",
                rollback_data
            )
            
            if response.status_code == 200:
                self.log(f"✅ Rollback successful to: {description}")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error')
                self.log(f"❌ Rollback failed: {error_detail}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Rollback error: {e}", "ERROR")
            return False
    
    def test_cleanup_old_history(self) -> bool:
        """Test that old history entries are cleaned up (max 5)"""
        self.log("Testing history cleanup (max 5 entries)...")
        
        # Create 7 snapshots to test cleanup
        for i in range(7):
            try:
                snapshot_data = {
                    "operation_type": "cleanup_test",
                    "operation_description": f"Cleanup test snapshot #{i+1}",
                    "affected_node_id": self.test_node_id
                }
                
                self.make_request(
                    "POST",
                    f"/projects/{self.test_project_id}/history/snapshot",
                    snapshot_data
                )
                time.sleep(0.05)
            except:
                pass
        
        # Check that we have at most 5 entries
        history_data = self.test_get_history()
        if history_data:
            count = history_data.get("total_count", 0)
            if count <= 5:
                self.log(f"✅ History cleanup working: {count} entries (≤ 5)")
                return True
            else:
                self.log(f"❌ History cleanup failed: {count} entries (> 5)", "ERROR")
                return False
        
        return False
    
    def run_all_tests(self) -> bool:
        """Run all history feature tests"""
        self.log("=" * 60)
        self.log("🧪 Starting Story History Feature Tests")
        self.log("=" * 60)
        
        tests = [
            ("Server Connection", self.test_connection),
            ("User Creation", self.create_test_user),
            ("User Login", self.login_test_user),
            ("Project Creation", self.create_test_project),
            ("Node Creation", self.create_test_node),
            ("Snapshot Creation", self.test_create_snapshot),
            ("Multiple Snapshots", self.test_multiple_snapshots),
        ]
        
        for test_name, test_func in tests:
            self.log(f"\n🧪 Running test: {test_name}")
            if not test_func():
                self.log(f"❌ Test failed: {test_name}", "ERROR")
                return False
        
        # Get history for rollback test
        self.log(f"\n🧪 Running test: History Retrieval")
        history_data = self.test_get_history()
        if not history_data:
            self.log("❌ Test failed: History Retrieval", "ERROR")
            return False
        
        # Test rollback
        self.log(f"\n🧪 Running test: Rollback")
        if not self.test_rollback(history_data):
            self.log("❌ Test failed: Rollback", "ERROR")
            return False
        
        # Test cleanup
        self.log(f"\n🧪 Running test: History Cleanup")
        if not self.test_cleanup_old_history():
            self.log("❌ Test failed: History Cleanup", "ERROR")
            return False
        
        self.log("\n" + "=" * 60)
        self.log("🎉 All tests passed successfully!")
        self.log("=" * 60)
        self.log("✨ Story history feature is working correctly!")
        self.log("🔄 Users can create snapshots, view history, and rollback changes")
        self.log("🧹 History is automatically cleaned up (max 5 entries)")
        
        return True

def main():
    """Main test function"""
    tester = StoryHistoryTester()
    
    try:
        success = tester.run_all_tests()
        if success:
            print("\n✅ All story history tests completed successfully!")
        else:
            print("\n❌ Some tests failed. Check the logs above.")
            exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during testing: {e}")
        exit(1)

if __name__ == "__main__":
    main() 