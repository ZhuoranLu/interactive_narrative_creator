#!/usr/bin/env python3
"""
Test rollback with real-world scenario: actual nodes, events, and actions
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_real_world_rollback():
    print("🌍 Testing rollback with real-world scenario...")
    
    # Create test user
    user_data = {
        "username": f"realworld_test_{int(time.time())}",
        "email": f"realworld_test_{int(time.time())}@example.com",
        "password": "test123"
    }
    
    # Register and login
    print("1. Setting up user...")
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.text}")
        return
    
    login_data = {"username": user_data["username"], "password": user_data["password"]}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create project with story tree structure
    print("2. Creating project with real story data...")
    response = requests.get(f"{BASE_URL}/user/projects", headers=headers)
    projects = response.json()
    
    # Use existing project or load one from the frontend structure
    if projects:
        project_id = projects[0]["id"]
        print(f"✅ Using existing project: {project_id}")
        
        # Load the project's story tree
        response = requests.get(f"{BASE_URL}/user/projects/{project_id}/story-tree", headers=headers)
        if response.status_code == 200:
            story_data = response.json()["data"]
            print(f"✅ Loaded story tree with {len(story_data.get('nodes', {}))} nodes")
        else:
            print(f"❌ Failed to load story tree: {response.text}")
            return
    else:
        # Create a new project
        project_data = {"title": "Real World Test Project", "description": "Testing with real data"}
        response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=headers)
        if response.status_code != 200:
            print(f"❌ Project creation failed: {response.text}")
            return
        project_id = response.json()["id"]
        print(f"✅ Created new project: {project_id}")
    
    # Create initial snapshot (of current state, whatever it is)
    print("3. Creating initial snapshot of current state...")
    snapshot_data = {
        "operation_type": "initial_state",
        "operation_description": "Initial state before test modifications",
        "affected_node_id": None
    }
    
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/snapshot",
        json=snapshot_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Initial snapshot failed: {response.text}")
        return
    
    initial_snapshot_id = response.json()["snapshot_id"]
    print(f"✅ Created initial snapshot: {initial_snapshot_id}")
    
    # Simulate some editing operations (create a node, add events/actions)
    print("4. Simulating editing operations...")
    
    # If there are existing nodes, let's try to edit one
    response = requests.get(f"{BASE_URL}/user/projects/{project_id}/story-tree", headers=headers)
    if response.status_code == 200:
        story_data = response.json()["data"]
        nodes = story_data.get("nodes", {})
        
        if nodes:
            # Edit an existing node
            node_id = list(nodes.keys())[0]
            print(f"Editing existing node: {node_id}")
            
            # Add an event to this node
            event_data = {
                "node_id": node_id,
                "content": "This is a test dialogue added during rollback testing",
                "speaker": "Test Speaker",
                "event_type": "dialogue"
            }
            
            response = requests.post(f"{BASE_URL}/events", json=event_data, headers=headers)
            if response.status_code == 200:
                event_id = response.json()["id"]
                print(f"✅ Added event: {event_id}")
                
                # Create snapshot after adding event
                snapshot_data = {
                    "operation_type": "add_event",
                    "operation_description": "Added test dialogue event",
                    "affected_node_id": node_id
                }
                
                response = requests.post(
                    f"{BASE_URL}/projects/{project_id}/history/snapshot",
                    json=snapshot_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    after_edit_snapshot_id = response.json()["snapshot_id"]
                    print(f"✅ Created snapshot after edit: {after_edit_snapshot_id}")
                else:
                    print(f"❌ Failed to create snapshot after edit: {response.text}")
                    return
            else:
                print(f"❌ Failed to add event: {response.text}")
                return
    
    # Get history
    print("5. Getting project history...")
    response = requests.get(f"{BASE_URL}/projects/{project_id}/history", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get history: {response.text}")
        return
    
    history = response.json()
    print(f"✅ History entries: {len(history['history'])}")
    for i, entry in enumerate(history['history']):
        print(f"   {i}: {entry['operation_description']} (ID: {entry['id'][:8]}...)")
    
    if len(history['history']) < 2:
        print("❌ Not enough history entries for rollback test")
        return
    
    # Try to rollback to the initial state
    target_snapshot = None
    for entry in history['history']:
        if entry['operation_description'] == "Initial state before test modifications":
            target_snapshot = entry
            break
    
    if not target_snapshot:
        target_snapshot = history['history'][-1]  # Use last entry
    
    print(f"6. Attempting rollback to: {target_snapshot['operation_description']}")
    
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
        
        # Verify the rollback worked by checking the story tree
        print("7. Verifying rollback results...")
        response = requests.get(f"{BASE_URL}/user/projects/{project_id}/story-tree", headers=headers)
        if response.status_code == 200:
            restored_story = response.json()["data"]
            print(f"✅ Restored story has {len(restored_story.get('nodes', {}))} nodes")
        else:
            print(f"⚠️ Could not verify rollback: {response.text}")
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
        test_real_world_rollback()
    except Exception as e:
        print(f"💥 Test crashed: {e}")
        import traceback
        traceback.print_exc() 