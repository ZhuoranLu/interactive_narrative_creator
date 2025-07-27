#!/usr/bin/env python3
"""
Debug a specific project's rollback issue
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def debug_specific_project(project_id=None):
    print(f"🔍 Debugging specific project rollback issue...")
    
    if len(sys.argv) > 1:
        project_id = sys.argv[1]
        print(f"Using project ID from command line: {project_id}")
    
    # For testing, we'll use any available project
    # First, let's check what projects exist
    print("1. Checking existing projects...")
    
    # Since we don't have auth here, let's create a test user quickly
    user_data = {
        "username": f"debug_user_{int(time.time())}",
        "email": f"debug_user_{int(time.time())}@example.com", 
        "password": "test123"
    }
    
    import time
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
    
    # Get user's projects
    response = requests.get(f"{BASE_URL}/user/projects", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get projects: {response.text}")
        return
    
    projects = response.json()
    print(f"Found {len(projects)} projects")
    
    if not projects:
        print("Creating a test project with complex data...")
        # Create a project with complex structure
        project_data = {"title": "Complex Debug Project", "description": "For debugging rollback"}
        response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=headers)
        if response.status_code != 200:
            print(f"❌ Project creation failed: {response.text}")
            return
        
        project_id = response.json()["id"]
        print(f"✅ Created project: {project_id}")
        
        # Add some complex data
        print("Adding complex test data...")
        
        # Create multiple events
        for i in range(3):
            event_data = {
                "node_id": "fake_node_" + str(i),  # This will fail, but let's see what happens
                "content": f"Test event {i} content",
                "speaker": f"Speaker {i}",
                "event_type": "dialogue"
            }
            # This will fail because node doesn't exist, but that's ok for debugging
            requests.post(f"{BASE_URL}/events", json=event_data, headers=headers)
    else:
        project_id = projects[0]["id"]
        print(f"Using existing project: {project_id}")
    
    # Load the project structure
    print(f"2. Loading project {project_id} structure...")
    response = requests.get(f"{BASE_URL}/user/projects/{project_id}/story-tree", headers=headers)
    if response.status_code == 200:
        story_data = response.json()["data"]
        nodes = story_data.get("nodes", {})
        connections = story_data.get("connections", [])
        print(f"Project has {len(nodes)} nodes and {len(connections)} connections")
        
        # Print detailed structure
        for node_id, node in nodes.items():
            events = node.get("data", {}).get("events", [])
            actions = node.get("data", {}).get("outgoing_actions", [])
            print(f"  Node {node_id}: {len(events)} events, {len(actions)} actions")
    else:
        print(f"❌ Failed to load story tree: {response.text}")
        return
    
    # Create a snapshot of current state
    print("3. Creating snapshot of current state...")
    snapshot_data = {
        "operation_type": "debug_test",
        "operation_description": "Debug snapshot before rollback test",
        "affected_node_id": None
    }
    
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/snapshot",
        json=snapshot_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Snapshot creation failed: {response.text}")
        return
    
    snapshot_id = response.json()["snapshot_id"]
    print(f"✅ Created snapshot: {snapshot_id}")
    
    # If we have nodes, try adding an event to trigger more complex snapshot
    if nodes:
        node_id = list(nodes.keys())[0]
        print(f"4. Adding event to node {node_id} to create more complex snapshot...")
        
        event_data = {
            "node_id": node_id,
            "content": "Debug test event content",
            "speaker": "Debug Speaker",
            "event_type": "dialogue"
        }
        
        response = requests.post(f"{BASE_URL}/events", json=event_data, headers=headers)
        if response.status_code == 200:
            print(f"✅ Added event successfully")
            
            # Create another snapshot
            snapshot_data2 = {
                "operation_type": "add_event",
                "operation_description": "Added debug event",
                "affected_node_id": node_id
            }
            
            response = requests.post(
                f"{BASE_URL}/projects/{project_id}/history/snapshot",
                json=snapshot_data2,
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"✅ Created second snapshot")
            else:
                print(f"❌ Second snapshot failed: {response.text}")
        else:
            print(f"⚠️ Failed to add event: {response.text}")
    
    # Get history
    print("5. Getting project history...")
    response = requests.get(f"{BASE_URL}/projects/{project_id}/history", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get history: {response.text}")
        return
    
    history = response.json()
    print(f"History has {len(history['history'])} entries:")
    for i, entry in enumerate(history['history']):
        print(f"  {i}: {entry['operation_description']} (ID: {entry['id'][:8]}...)")
    
    if len(history['history']) < 2:
        print("⚠️ Not enough history for rollback test")
        return
    
    # Try rollback to the first snapshot
    target_snapshot = history['history'][1]  # Second entry (first is most recent)
    print(f"6. Attempting rollback to: {target_snapshot['operation_description']}")
    
    rollback_data = {"snapshot_id": target_snapshot["id"]}
    response = requests.post(
        f"{BASE_URL}/projects/{project_id}/history/rollback",
        json=rollback_data,
        headers=headers
    )
    
    print(f"Rollback response status: {response.status_code}")
    print(f"Rollback response: {response.text}")
    
    if response.status_code == 200:
        print("✅ Rollback succeeded!")
    else:
        print("❌ Rollback failed!")
        try:
            error_data = response.json()
            print("Error details:")
            print(json.dumps(error_data, indent=2))
        except:
            print("Raw error response:", response.text)

if __name__ == "__main__":
    debug_specific_project() 