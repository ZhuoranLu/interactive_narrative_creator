"""
Database initialization script
Run this to set up the database and create sample data
"""

import os
import sys
from datetime import datetime

# Add the parent directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from app.database import engine, Base, SessionLocal
from app.repositories import NarrativeRepository, NodeRepository, EventRepository, ActionRepository, WorldStateRepository


def create_database():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


def create_sample_data():
    """Create some sample data for testing"""
    print("Creating sample data...")
    
    db = SessionLocal()
    try:
        # Create repositories
        narrative_repo = NarrativeRepository(db)
        node_repo = NodeRepository(db)
        event_repo = EventRepository(db)
        action_repo = ActionRepository(db)
        world_state_repo = WorldStateRepository(db)
        
        # Create a sample project
        project = narrative_repo.create_project(
            title="Sample Interactive Story",
            description="A sample story to test the database functionality",
            world_setting="Modern urban fantasy",
            characters=["Detective Sarah", "Mysterious Figure", "Cafe Owner"],
            style="Mystery/Thriller"
        )
        
        print(f"✅ Created project: {project.title} (ID: {project.id})")
        
        # Create a root node
        root_node = node_repo.create_node(
            project_id=project.id,
            scene="Detective Sarah sits in a dimly lit cafe, rain pattering against the windows. Her phone buzzes with an unknown number.",
            node_type="scene",
            level=0,
            metadata={"is_starting_node": True}
        )
        
        print(f"✅ Created root node (ID: {root_node.id})")
        
        # Create events for the root node
        event1 = event_repo.create_event(
            node_id=root_node.id,
            content="The phone rings insistently. The caller ID shows 'Unknown'.",
            speaker="",
            event_type="narration",
            timestamp=1
        )
        
        event2 = event_repo.create_event(
            node_id=root_node.id,
            content="Should I answer this? It could be important... or dangerous.",
            speaker="Detective Sarah",
            event_type="dialogue",
            timestamp=2
        )
        
        print(f"✅ Created {2} events")
        
        # Create actions
        action1 = action_repo.create_action(
            description="Answer the phone call",
            is_key_action=True,
            metadata={"leads_to": "phone_conversation"}
        )
        
        action2 = action_repo.create_action(
            description="Ignore the call and observe the cafe",
            is_key_action=True,
            metadata={"leads_to": "cafe_observation"}
        )
        
        action3 = action_repo.create_action(
            description="Check the caller ID more carefully",
            is_key_action=False,
            event_id=event1.id
        )
        
        print(f"✅ Created {3} actions")
        
        # Create a second node (choice consequence)
        choice_node = node_repo.create_node(
            project_id=project.id,
            scene="Sarah picks up the phone. A distorted voice speaks: 'Detective, you're in danger. The cafe you're in... it's not safe.'",
            node_type="scene",
            level=1,
            parent_node_id=root_node.id
        )
        
        # Create action bindings
        binding1 = action_repo.create_action_binding(
            action_id=action1.id,
            source_node_id=root_node.id,
            target_node_id=choice_node.id
        )
        
        binding2 = action_repo.create_action_binding(
            action_id=action2.id,
            source_node_id=root_node.id,
            target_node_id=None  # Would lead to another node
        )
        
        binding3 = action_repo.create_action_binding(
            action_id=action3.id,
            source_node_id=root_node.id,
            target_event_id=event1.id
        )
        
        print(f"✅ Created {3} action bindings")
        
        # Update project to set start node
        narrative_repo.update_project(project.id, start_node_id=root_node.id)
        
        # Create sample world state
        world_state = world_state_repo.save_world_state(
            project_id=project.id,
            current_node_id=root_node.id,
            state_data={
                "player_name": "Detective Sarah",
                "location": "Downtown Cafe",
                "time_of_day": "evening",
                "weather": "rainy",
                "tension_level": 3,
                "clues_discovered": [],
                "relationships": {
                    "cafe_owner": "neutral",
                    "mysterious_caller": "unknown"
                }
            }
        )
        
        print(f"✅ Created world state")
        print(f"🎉 Sample data creation complete!")
        print(f"   Project ID: {project.id}")
        print(f"   Root Node ID: {root_node.id}")
        print(f"   You can test the API with these IDs")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()


def reset_database():
    """Drop and recreate all tables (WARNING: This will delete all data!)"""
    print("⚠️  WARNING: This will delete all existing data!")
    confirm = input("Are you sure you want to reset the database? (y/N): ")
    
    if confirm.lower() == 'y':
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        print("✅ All tables dropped")
        
        create_database()
        create_sample_data()
        print("🎉 Database reset complete!")
    else:
        print("Database reset cancelled.")


def main():
    """Main function with command line options"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "reset":
            reset_database()
        elif command == "init":
            create_database()
        elif command == "sample":
            create_sample_data()
        else:
            print("Unknown command. Available commands:")
            print("  init     - Create database tables")
            print("  sample   - Create sample data")
            print("  reset    - Reset database (WARNING: deletes all data)")
    else:
        print("Interactive Narrative Creator - Database Setup")
        print("=" * 50)
        print("1. Initialize database")
        print("2. Create sample data")
        print("3. Reset database (WARNING: deletes all data)")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            create_database()
        elif choice == "2":
            create_sample_data()
        elif choice == "3":
            reset_database()
        elif choice == "4":
            print("Goodbye!")
        else:
            print("Invalid choice. Please run the script again.")


if __name__ == "__main__":
    main() 