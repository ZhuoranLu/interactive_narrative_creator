#!/usr/bin/env python3
"""
Debug script to test rollback with real story data
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def debug_rollback():
    print("🐛 Debugging rollback issue...")
    
    # Create test user
    user_data = {
        "username": f"debug_test_{int(time.time())}",
        "email": f"debug_test_{int(time.time())}@example.com",
        "password": "test123"
    }
    
    # Register and login
    print("1. Registering user...")
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.text}")
        return
    
    print("2. Logging in...")
    login_data = {"username": user_data["username"], "password": user_data["password"]}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create project
    print("3. Creating project...")
    project_data = {"title": "Debug Rollback Project", "description": "Testing rollback with real data"}
    response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Project creation failed: {response.text}")
        return
    
    project_id = response.json()["id"]
    print(f"✅ Created project: {project_id}")
    
    # Create some real nodes with events and actions to simulate actual story data
    print("4. Creating test nodes with events and actions...")
    
    # Create node
    node_data = {
        "project_id": project_id,
        "scene": "The hero enters a mysterious castle",
        "node_type": "scene",
        "level": 0,
        "metadata": {"test": "data"}
    }
    
    # For now, let's just create a snapshot with empty data to test the core functionality
    print("5. Creating initial snapshot...")
    snapshot_data = {
        "operation_type": "initial_state",
        "operation_description": "Initial project state",
        "affected_node_id": None
    }
    
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/snapshot",
        json=snapshot_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Initial snapshot creation failed: {response.text}")
        return
    
    print("6. Creating second snapshot...")
    snapshot_data2 = {
        "operation_type": "edit_scene",
        "operation_description": "Modified the castle scene",
        "affected_node_id": "fake_node_123"
    }
    
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/snapshot",
        json=snapshot_data2,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Second snapshot creation failed: {response.text}")
        return
    
    # Get history to see what we have
    print("7. Getting project history...")
    response = requests.get(f"{BASE_URL}/projects/{project_id}/history", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get history: {response.text}")
        return
    
    history = response.json()
    print(f"✅ History entries: {len(history['history'])}")
    for i, entry in enumerate(history['history']):
        print(f"   {i}: {entry['operation_description']} (ID: {entry['id']})")
    
    if len(history['history']) < 2:
        print("❌ Not enough history entries")
        return
    
    # Try to rollback to the first snapshot
    target_snapshot = history['history'][1]  # Second entry (first is current state)
    print(f"8. Attempting rollback to: {target_snapshot['operation_description']}")
    
    rollback_data = {"snapshot_id": target_snapshot["id"]}
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/rollback",
        json=rollback_data,
        headers=headers
    )
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    if response.status_code == 200:
        print("✅ Rollback successful!")
    else:
        print(f"❌ Rollback failed with status {response.status_code}")
        print("Response details:")
        try:
            error_detail = response.json()
            print(json.dumps(error_detail, indent=2))
        except:
            print(f"Raw response: {response.text}")

if __name__ == "__main__":
    try:
        debug_rollback()
    except Exception as e:
        print(f"💥 Debug script crashed: {e}")
        import traceback
        traceback.print_exc() 