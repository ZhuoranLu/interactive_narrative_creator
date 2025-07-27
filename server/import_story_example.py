#!/usr/bin/env python3
"""
Import story tree example from JSON into database
"""
import json
import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, NarrativeProject, NarrativeNode, NarrativeEvent, Action, ActionBinding
from app.user_repositories import UserRepository

def import_story_example():
    """Import the story tree example into database"""
    
    # Load the JSON file
    json_path = Path(__file__).parent.parent / "interactive_narrative" / "public" / "story_tree_example.json"
    
    # Try different possible paths
    possible_paths = [
        json_path,
        Path(__file__).parent / ".." / "interactive_narrative" / "public" / "story_tree_example.json",
        Path("/Users/luzhuoran/interactive_narrative_creator/interactive_narrative/public/story_tree_example.json")
    ]
    
    json_path = None
    for path in possible_paths:
        if path.exists():
            json_path = path
            break
    
    if not json_path:
        print(f"Story example file not found in any of these locations:")
        for path in possible_paths:
            print(f"  - {path}")
        return False
    
    with open(json_path, 'r', encoding='utf-8') as f:
        story_data = json.load(f)
    
    db = SessionLocal()
    try:
        # Get admin user
        user_repo = UserRepository(db)
        admin_user = user_repo.get_user_by_username("admin")
        if not admin_user:
            print("Admin user not found!")
            return False
        
        # Delete existing "深夜来电" project if it exists
        existing_project = db.query(NarrativeProject).filter(
            NarrativeProject.title == story_data["metadata"]["title"],
            NarrativeProject.owner_id == admin_user.id
        ).first()
        
        if existing_project:
            print(f"Deleting existing project: {existing_project.title}")
            db.delete(existing_project)
            db.commit()
        
        # Create new project (without start_node_id initially)
        project = NarrativeProject(
            title=story_data["metadata"]["title"],
            description=story_data["metadata"]["description"],
            world_setting=story_data["metadata"]["generator_settings"]["world_setting"],
            characters=story_data["metadata"]["generator_settings"]["characters"],
            style=story_data["metadata"]["generator_settings"]["style"],
            owner_id=admin_user.id
            # Don't set start_node_id yet - will set after nodes are created
        )
        
        db.add(project)
        db.commit()
        print(f"Created project: {project.title} (ID: {project.id})")
        
        # Create nodes
        node_mapping = {}  # JSON node ID -> DB node object
        
        for node_id, node_data in story_data["nodes"].items():
            db_node = NarrativeNode(
                id=node_id,
                project_id=project.id,
                scene=node_data["data"]["scene"],
                node_type=node_data["type"],
                level=node_data["level"],
                parent_node_id=node_data.get("parent_node_id")
            )
            
            db.add(db_node)
            node_mapping[node_id] = db_node
            print(f"Created node: {node_id} (Level {node_data['level']}, Type: {node_data['type']})")
        
        db.commit()
        
        # Create events
        for node_id, node_data in story_data["nodes"].items():
            if "events" in node_data["data"]:
                for event_data in node_data["data"]["events"]:
                    db_event = NarrativeEvent(
                        id=event_data["id"],
                        node_id=node_id,
                        speaker=event_data["speaker"],
                        content=event_data["content"],
                        event_type=event_data["event_type"],
                        timestamp=event_data["timestamp"]
                    )
                    
                    db.add(db_event)
                    print(f"Created event: {event_data['id']} ({event_data['event_type']})")
        
        db.commit()
        
        # Create actions and action bindings
        for node_id, node_data in story_data["nodes"].items():
            if "outgoing_actions" in node_data["data"]:
                for action_index, action_data in enumerate(node_data["data"]["outgoing_actions"]):
                    # Create action with unique ID
                    action_info = action_data["action"]
                    unique_action_id = f"{action_info['id']}_{node_id}_{action_index}"
                    
                    db_action = Action(
                        id=unique_action_id,
                        description=action_info["description"],
                        is_key_action=action_info["is_key_action"],
                        meta_data=action_info.get("metadata", {})
                    )
                    
                    db.add(db_action)
                    print(f"Created action: {unique_action_id} - {action_info['description'][:50]}...")
                    
                    # Create action binding
                    db_binding = ActionBinding(
                        action_id=unique_action_id,
                        source_node_id=node_id,
                        target_node_id=action_data["target_node_id"]
                    )
                    
                    db.add(db_binding)
                    print(f"Created binding: {node_id} -> {action_data['target_node_id']} via {unique_action_id}")
        
        db.commit()
        
        # Update project start_node_id
        project.start_node_id = story_data["root_node_id"]
        db.commit()
        
        print(f"✅ Successfully imported story '{story_data['metadata']['title']}'")
        print(f"   Project ID: {project.id}")
        print(f"   Nodes: {len(story_data['nodes'])}")
        print(f"   Connections: {len(story_data['connections'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error importing story: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    import_story_example() 