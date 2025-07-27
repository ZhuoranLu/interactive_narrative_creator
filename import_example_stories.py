#!/usr/bin/env python3
"""
Import example stories into the database and bind them to admin user.
导入示例故事到数据库并绑定给管理员用户。

Usage:
    python import_example_stories.py

Requirements:
    - Database should be initialized (run server/app/init_db.py first)
    - Admin user should exist (created by init_db.py sample data)
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional

# Add server app to path
current_dir = Path(__file__).parent
server_dir = current_dir / "server"
sys.path.insert(0, str(server_dir))

from server.app.database import SessionLocal, engine
from server.app.repositories import NarrativeRepository, NodeRepository, EventRepository, ActionRepository
from server.app.user_repositories import UserRepository


class StoryImporter:
    """Import example stories from JSON files into the database"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.narrative_repo = NarrativeRepository(self.db)
        self.node_repo = NodeRepository(self.db)
        self.event_repo = EventRepository(self.db)
        self.action_repo = ActionRepository(self.db)
        self.user_repo = UserRepository(self.db)
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def get_or_create_admin_user(self) -> str:
        """Get admin user ID or create if not exists"""
        # Try to find existing admin user
        admin_user = self.user_repo.get_user_by_username("admin")
        
        if admin_user:
            print(f"✅ Found existing admin user: {admin_user.username} (ID: {admin_user.id})")
            return admin_user.id
        
        # Create admin user if not exists
        print("Creating admin user...")
        admin_user = self.user_repo.create_user(
            username="admin",
            email="admin@example.com",
            password="admin123",
            full_name="Administrator",
            is_verified=True,
            is_premium=True
        )
        
        print(f"✅ Created admin user: {admin_user.username} (ID: {admin_user.id})")
        return admin_user.id
    
    def load_example_story(self, file_path: str) -> Optional[Dict]:
        """Load example story from JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading {file_path}: {e}")
            return None
    
    def import_story_from_json(self, story_data: Dict, admin_user_id: str) -> Optional[str]:
        """Import a story from JSON data structure"""
        try:
            metadata = story_data.get("metadata", {})
            title = metadata.get("title", "Untitled Story")
            description = metadata.get("description", "")
            
            generator_settings = metadata.get("generator_settings", {})
            world_setting = generator_settings.get("world_setting", "")
            characters = generator_settings.get("characters", [])
            style = generator_settings.get("style", "")
            
            # Create the project
            project = self.narrative_repo.create_project(
                title=title,
                description=description,
                world_setting=world_setting,
                characters=characters,
                style=style,
                owner_id=admin_user_id
            )
            
            print(f"✅ Created project: {title} (ID: {project.id})")
            
            # Import nodes
            nodes_data = story_data.get("nodes", {})
            node_id_mapping = {}  # Map old IDs to new database IDs
            
            # Sort nodes by level to ensure parent nodes are created first
            sorted_nodes = sorted(
                nodes_data.items(),
                key=lambda x: x[1].get("level", 0)
            )
            
            for old_node_id, node_info in sorted_nodes:
                node_data = node_info.get("data", {})
                level = node_info.get("level", 0)
                node_type = node_info.get("type", "scene")
                
                # Map node type
                if node_type == "root":
                    node_type = "scene"
                
                # Create the node
                db_node = self.node_repo.create_node(
                    project_id=project.id,
                    scene=node_data.get("scene", ""),
                    node_type=node_data.get("node_type", node_type),
                    level=level,
                    metadata={
                        "original_id": old_node_id,
                        "world_state": node_data.get("metadata", {}).get("world_state", {}),
                        **node_data.get("metadata", {})
                    }
                )
                
                node_id_mapping[old_node_id] = db_node.id
                
                # Import events for this node
                events_data = node_data.get("events", [])
                for event_data in events_data:
                    db_event = self.event_repo.create_event(
                        node_id=db_node.id,
                        content=event_data.get("content", ""),
                        speaker=event_data.get("speaker", ""),
                        description=event_data.get("description", ""),
                        timestamp=event_data.get("timestamp", 0),
                        event_type=event_data.get("event_type", "dialogue"),
                        metadata={
                            "original_id": event_data.get("id", ""),
                            **event_data.get("metadata", {})
                        }
                    )
                    
                    # Import actions for this event
                    actions_data = event_data.get("actions", [])
                    for action_data in actions_data:
                        self.action_repo.create_action(
                            description=action_data.get("description", ""),
                            is_key_action=action_data.get("is_key_action", False),
                            event_id=db_event.id,
                            metadata={
                                "original_id": action_data.get("id", ""),
                                **action_data.get("metadata", {})
                            }
                        )
                
                # Import outgoing actions for this node
                outgoing_actions = node_data.get("outgoing_actions", [])
                for action_binding in outgoing_actions:
                    action_data = action_binding.get("action", {})
                    
                    # Create the action
                    db_action = self.action_repo.create_action(
                        description=action_data.get("description", ""),
                        is_key_action=action_data.get("is_key_action", False),
                        metadata={
                            "original_id": action_data.get("id", ""),
                            "navigation": action_data.get("metadata", {}).get("navigation", "continue"),
                            "response": action_data.get("metadata", {}).get("response", ""),
                            "effects": action_data.get("metadata", {}).get("effects", {}),
                            **action_data.get("metadata", {})
                        }
                    )
                    
                    # Create action binding (will be handled later for target_node_id mapping)
                    # For now, store the binding info in action metadata
                    if action_binding.get("target_node_id"):
                        # Update the action's metadata properly
                        updated_metadata = dict(db_action.meta_data) if db_action.meta_data else {}
                        updated_metadata["target_node_id"] = action_binding["target_node_id"]
                        
                        # Update the action in database directly
                        db_action.meta_data = updated_metadata
                        self.db.commit()
            
            print(f"✅ Imported {len(sorted_nodes)} nodes with events and actions")
            
            # Set the first node as start_node if it's a root node
            root_nodes = [
                (old_id, new_id) for old_id, new_id in node_id_mapping.items()
                if nodes_data[old_id].get("type") == "root" or nodes_data[old_id].get("level", 0) == 0
            ]
            
            if root_nodes:
                start_node_id = root_nodes[0][1]  # Get the new database ID
                project.start_node_id = start_node_id
                self.db.commit()
                print(f"✅ Set start node: {start_node_id}")
            
            return project.id
            
        except Exception as e:
            print(f"❌ Error importing story: {e}")
            self.db.rollback()
            return None
    
    def run_import(self, force_reimport=True):
        """Main import process"""
        print("🚀 Starting example story import...")
        
        # Get admin user
        admin_user_id = self.get_or_create_admin_user()
        
        # Define example story files to import
        story_files = [
            "client/agent/complete_story_tree_example.json",
            "interactive_narrative/public/story_tree_example.json"
        ]
        
        imported_count = 0
        
        for story_file in story_files:
            file_path = current_dir / story_file
            
            if not file_path.exists():
                print(f"⚠️  Story file not found: {file_path}")
                continue
            
            print(f"\n📖 Importing story from: {story_file}")
            
            # Load story data
            story_data = self.load_example_story(str(file_path))
            if not story_data:
                continue
            
            # Check if this story is already imported (by title)
            title = story_data.get("metadata", {}).get("title", "")
            existing_projects = self.narrative_repo.get_projects_by_owner(admin_user_id)
            
            existing_project = None
            for p in existing_projects:
                if p.title == title:
                    existing_project = p
                    break
            
            if existing_project:
                if force_reimport:
                    print(f"🔄 Story '{title}' already exists, deleting and reimporting...")
                    self.narrative_repo.delete_project(existing_project.id)
                else:
                    print(f"⚠️  Story '{title}' already exists, skipping...")
                    continue
            
            # Import the story
            project_id = self.import_story_from_json(story_data, admin_user_id)
            
            if project_id:
                imported_count += 1
                print(f"✅ Successfully imported story '{title}' (Project ID: {project_id})")
            else:
                print(f"❌ Failed to import story from {story_file}")
        
        print(f"\n🎉 Import completed! Imported {imported_count} stories.")
        
        if imported_count > 0:
            print(f"\n📋 All stories have been bound to admin user (ID: {admin_user_id})")
            print("   You can access them by logging in as:")
            print("   Username: admin")
            print("   Password: admin123")


def main():
    """Main entry point"""
    try:
        with StoryImporter() as importer:
            importer.run_import()
    except Exception as e:
        print(f"❌ Import failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 