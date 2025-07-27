#!/usr/bin/env python3
"""
Quick test for rollback functionality after fixes
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_rollback():
    print("🧪 Testing rollback functionality...")
    
    # First, create a test user and login
    user_data = {
        "username": f"rollback_test_{int(time.time())}",
        "email": f"rollback_test_{int(time.time())}@example.com",
        "password": "test123"
    }
    
    # Register user
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if response.status_code != 200:
        print(f"❌ Failed to register user: {response.text}")
        return False
    
    # Login
    login_data = {"username": user_data["username"], "password": user_data["password"]}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Failed to login: {response.text}")
        return False
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a test project
    project_data = {"title": "Rollback Test Project", "description": "Testing rollback"}
    response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create project: {response.text}")
        return False
    
    project_id = response.json()["id"]
    print(f"✅ Created test project: {project_id}")
    
    # Create some snapshots
    for i in range(3):
        snapshot_data = {
            "operation_type": "test_operation",
            "operation_description": f"Test snapshot #{i+1}",
            "affected_node_id": "test_node_123"
        }
        
        response = requests.post(
            f"{BASE_URL}/projects/{project_id}/history/snapshot",
            json=snapshot_data,
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to create snapshot {i+1}: {response.text}")
            return False
        
        print(f"✅ Created snapshot {i+1}")
        time.sleep(0.1)
    
    # Get history
    response = requests.get(f"{BASE_URL}/projects/{project_id}/history", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get history: {response.text}")
        return False
    
    history = response.json()
    print(f"✅ Retrieved history: {len(history['history'])} entries")
    
    if len(history['history']) < 2:
        print("❌ Not enough history entries to test rollback")
        return False
    
    # Try rollback to second most recent snapshot
    rollback_target = history['history'][1]
    rollback_data = {"snapshot_id": rollback_target["id"]}
    
    print(f"🔄 Attempting rollback to: {rollback_target['operation_description']}")
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/rollback",
        json=rollback_data,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Rollback successful!")
        return True
    else:
        print(f"❌ Rollback failed: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    try:
        success = test_rollback()
        if success:
            print("\n🎉 Rollback test passed!")
        else:
            print("\n❌ Rollback test failed!")
    except Exception as e:
        print(f"\n💥 Test crashed: {e}")
        import traceback
        traceback.print_exc() 