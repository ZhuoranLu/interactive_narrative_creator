"""
Repository layer for database operations
Handles CRUD operations and data mapping between domain models and database models
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import time # Added for timestamp generation in _apply_snapshot

from .database import (
    NarrativeProject, NarrativeNode, NarrativeEvent, Action, ActionBinding, WorldState, StoryEditHistory
)

# Import domain models
import sys
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(parent_dir)
sys.path.insert(0, project_root)

try:
    from client.utils.narrative_graph import Node, Event, Action as DomainAction, ActionBinding as DomainActionBinding, NarrativeGraph, NodeType
except ImportError:
    # Fallback imports for when running in different context
    pass


class NarrativeRepository:
    """Repository for narrative project operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_project(self, title: str, description: str = "", world_setting: str = "", 
                      characters: List[str] = None, style: str = "", owner_id: str = None) -> NarrativeProject:
        """Create a new narrative project"""
        project = NarrativeProject(
            title=title,
            description=description,
            world_setting=world_setting,
            characters=characters or [],
            style=style,
            owner_id=owner_id,
            meta_data={}
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_project(self, project_id: str) -> Optional[NarrativeProject]:
        """Get a project by ID"""
        return self.db.query(NarrativeProject).filter(NarrativeProject.id == project_id).first()

    def get_all_projects(self) -> List[NarrativeProject]:
        """Get all projects"""
        return self.db.query(NarrativeProject).all()
    
    def get_projects_by_owner(self, owner_id: str, skip: int = 0, limit: int = 100) -> List[NarrativeProject]:
        """Get projects owned by a specific user"""
        return self.db.query(NarrativeProject).filter(
            NarrativeProject.owner_id == owner_id
        ).offset(skip).limit(limit).all()
    
    def get_public_projects(self, skip: int = 0, limit: int = 100) -> List[NarrativeProject]:
        """Get public projects"""
        return self.db.query(NarrativeProject).filter(
            NarrativeProject.is_public == True
        ).offset(skip).limit(limit).all()
    
    def check_project_access(self, project_id: str, user_id: str) -> bool:
        """Check if user has access to project (owner or collaborator)"""
        from .database import ProjectCollaborator
        
        project = self.get_project(project_id)
        if not project:
            return False
        
        # Check if user is owner
        if project.owner_id == user_id:
            return True
        
        # Check if user is collaborator
        collaborator = self.db.query(ProjectCollaborator).filter(
            and_(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.user_id == user_id,
                ProjectCollaborator.is_active == True
            )
        ).first()
        
        return collaborator is not None

    def update_project(self, project_id: str, **updates) -> Optional[NarrativeProject]:
        """Update a project"""
        project = self.get_project(project_id)
        if project:
            for key, value in updates.items():
                if hasattr(project, key):
                    setattr(project, key, value)
            project.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(project)
        return project

    def delete_project(self, project_id: str) -> bool:
        """Delete a project and all its data"""
        project = self.get_project(project_id)
        if project:
            self.db.delete(project)
            self.db.commit()
            return True
        return False


class NodeRepository:
    """Repository for narrative node operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_node(self, project_id: str, scene: str, node_type: str = "scene", 
                   level: int = 0, parent_node_id: str = None, metadata: Dict = None) -> NarrativeNode:
        """Create a new narrative node"""
        node = NarrativeNode(
            project_id=project_id,
            scene=scene,
            node_type=node_type,
            level=level,
            parent_node_id=parent_node_id,
            meta_data=metadata or {}
        )
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node

    def get_node(self, node_id: str) -> Optional[NarrativeNode]:
        """Get a node by ID with all relationships loaded"""
        return self.db.query(NarrativeNode).filter(NarrativeNode.id == node_id).first()

    def get_nodes_by_project(self, project_id: str) -> List[NarrativeNode]:
        """Get all nodes for a project"""
        return self.db.query(NarrativeNode).filter(NarrativeNode.project_id == project_id).all()

    def get_child_nodes(self, parent_node_id: str) -> List[NarrativeNode]:
        """Get all child nodes of a parent node"""
        return self.db.query(NarrativeNode).filter(NarrativeNode.parent_node_id == parent_node_id).all()

    def update_node(self, node_id: str, **updates) -> Optional[NarrativeNode]:
        """Update a node"""
        node = self.get_node(node_id)
        if node:
            for key, value in updates.items():
                if hasattr(node, key):
                    setattr(node, key, value)
            node.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(node)
        return node

    def delete_node(self, node_id: str) -> bool:
        """Delete a node and all its dependencies"""
        node = self.get_node(node_id)
        if node:
            self.db.delete(node)
            self.db.commit()
            return True
        return False


class EventRepository:
    """Repository for narrative event operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_event(self, node_id: str, content: str, speaker: str = "", 
                    description: str = "", timestamp: int = 0, event_type: str = "dialogue", 
                    metadata: Dict = None) -> NarrativeEvent:
        """Create a new narrative event"""
        event = NarrativeEvent(
            node_id=node_id,
            content=content,
            speaker=speaker,
            description=description,
            timestamp=timestamp,
            event_type=event_type,
            meta_data=metadata or {}
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_event(self, event_id: str) -> Optional[NarrativeEvent]:
        """Get an event by ID"""
        return self.db.query(NarrativeEvent).filter(NarrativeEvent.id == event_id).first()

    def get_events_by_node(self, node_id: str) -> List[NarrativeEvent]:
        """Get all events for a node"""
        return self.db.query(NarrativeEvent).filter(NarrativeEvent.node_id == node_id).order_by(NarrativeEvent.timestamp).all()

    def update_event(self, event_id: str, **updates) -> Optional[NarrativeEvent]:
        """Update an event"""
        event = self.db.query(NarrativeEvent).filter(NarrativeEvent.id == event_id).first()
        if event:
            for key, value in updates.items():
                if hasattr(event, key):
                    setattr(event, key, value)
            self.db.commit()
            self.db.refresh(event)
        return event

    def delete_event(self, event_id: str) -> bool:
        """Delete an event and all its dependencies"""
        event = self.get_event(event_id)
        if event:
            self.db.delete(event)
            self.db.commit()
            return True
        return False


class ActionRepository:
    """Repository for action operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_action(self, description: str, is_key_action: bool = False, 
                     event_id: str = None, metadata: Dict = None) -> Action:
        """Create a new action"""
        action = Action(
            description=description,
            is_key_action=is_key_action,
            event_id=event_id,
            meta_data=metadata or {}
        )
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        return action

    def get_action(self, action_id: str) -> Optional[Action]:
        """Get an action by ID"""
        return self.db.query(Action).filter(Action.id == action_id).first()

    def update_action(self, action_id: str, **updates) -> Optional[Action]:
        """Update an action"""
        action = self.get_action(action_id)
        if action:
            for key, value in updates.items():
                if hasattr(action, key):
                    setattr(action, key, value)
            self.db.commit()
            self.db.refresh(action)
        return action

    def delete_action(self, action_id: str) -> bool:
        """Delete an action and all its dependencies"""
        action = self.get_action(action_id)
        if action:
            self.db.delete(action)
            self.db.commit()
            return True
        return False

    def create_action_binding(self, action_id: str, source_node_id: str, 
                             target_node_id: str = None, target_event_id: str = None) -> ActionBinding:
        """Create an action binding"""
        binding = ActionBinding(
            action_id=action_id,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            target_event_id=target_event_id
        )
        self.db.add(binding)
        self.db.commit()
        self.db.refresh(binding)
        return binding

    def get_action_binding(self, binding_id: str) -> Optional[ActionBinding]:
        """Get an action binding by ID"""
        return self.db.query(ActionBinding).filter(ActionBinding.id == binding_id).first()

    def update_action_binding(self, binding_id: str, **updates) -> Optional[ActionBinding]:
        """Update an action binding"""
        binding = self.get_action_binding(binding_id)
        if binding:
            for key, value in updates.items():
                if hasattr(binding, key):
                    setattr(binding, key, value)
            self.db.commit()
            self.db.refresh(binding)
        return binding

    def delete_action_binding(self, binding_id: str) -> bool:
        """Delete an action binding"""
        binding = self.get_action_binding(binding_id)
        if binding:
            self.db.delete(binding)
            self.db.commit()
            return True
        return False


class WorldStateRepository:
    """Repository for world state operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def save_world_state(self, project_id: str, current_node_id: str, state_data: Dict) -> WorldState:
        """Save or update world state for a project"""
        # Check if world state already exists for this project
        existing_state = self.db.query(WorldState).filter(WorldState.project_id == project_id).first()
        
        if existing_state:
            existing_state.current_node_id = current_node_id
            existing_state.state_data = state_data
            existing_state.updated_at = datetime.utcnow()
            world_state = existing_state
        else:
            world_state = WorldState(
                project_id=project_id,
                current_node_id=current_node_id,
                state_data=state_data
            )
            self.db.add(world_state)
        
        self.db.commit()
        self.db.refresh(world_state)
        return world_state

    def get_world_state(self, project_id: str) -> Optional[WorldState]:
        """Get world state for a project"""
        return self.db.query(WorldState).filter(WorldState.project_id == project_id).first()


class NarrativeGraphRepository:
    """Repository for converting between database models and domain models"""
    
    def __init__(self, db: Session):
        self.db = db
        self.narrative_repo = NarrativeRepository(db)
        self.node_repo = NodeRepository(db)
        self.event_repo = EventRepository(db)
        self.action_repo = ActionRepository(db)
        self.world_state_repo = WorldStateRepository(db)

    def save_narrative_graph(self, graph: 'NarrativeGraph', project_id: str = None) -> str:
        """Save a narrative graph to the database"""
        # Create or update project
        if project_id:
            project = self.narrative_repo.get_project(project_id)
            if project:
                self.narrative_repo.update_project(project_id, title=graph.title, meta_data=graph.metadata)
            else:
                raise ValueError(f"Project {project_id} not found")
        else:
            project = self.narrative_repo.create_project(
                title=graph.title,
                meta_data=graph.metadata
            )
            project_id = project.id

        # Save all nodes
        node_id_mapping = {}
        for node_id, domain_node in graph.nodes.items():
            db_node = self.node_repo.create_node(
                project_id=project_id,
                scene=domain_node.scene,
                node_type=domain_node.node_type.value,
                metadata=domain_node.metadata
            )
            node_id_mapping[node_id] = db_node.id

            # Save events for this node
            for domain_event in domain_node.events:
                db_event = self.event_repo.create_event(
                    node_id=db_node.id,
                    content=domain_event.content,
                    speaker=domain_event.speaker,
                    description=domain_event.description,
                    timestamp=domain_event.timestamp,
                    event_type=domain_event.event_type,
                    metadata=domain_event.metadata
                )

                # Save actions for this event
                for domain_action in domain_event.actions:
                    self.action_repo.create_action(
                        description=domain_action.description,
                        is_key_action=domain_action.is_key_action,
                        metadata=domain_action.metadata
                    )

        # Save action bindings (after all nodes are created)
        for node_id, domain_node in graph.nodes.items():
            source_node_id = node_id_mapping[node_id]
            for binding in domain_node.outgoing_actions:
                # Create action if it doesn't exist
                db_action = self.action_repo.create_action(
                    description=binding.action.description,
                    is_key_action=binding.action.is_key_action,
                    metadata=binding.action.metadata
                )
                
                # Create binding
                target_node_id = None
                target_event_id = None
                
                if binding.target_node:
                    target_node_id = node_id_mapping.get(binding.target_node.id)
                
                self.action_repo.create_action_binding(
                    action_id=db_action.id,
                    source_node_id=source_node_id,
                    target_node_id=target_node_id,
                    target_event_id=target_event_id
                )

        # Update start node
        if graph.start_node_id and graph.start_node_id in node_id_mapping:
            start_node_db_id = node_id_mapping[graph.start_node_id]
            self.narrative_repo.update_project(project_id, start_node_id=start_node_db_id)

        return project_id

    def load_narrative_graph(self, project_id: str) -> Optional['NarrativeGraph']:
        """Load a narrative graph from the database"""
        try:
            project = self.narrative_repo.get_project(project_id)
            if not project:
                return None

            # Create narrative graph
            graph = NarrativeGraph(title=project.title)
            graph.metadata = project.meta_data or {}

            # Load all nodes
            db_nodes = self.node_repo.get_nodes_by_project(project_id)
            node_mapping = {}

            for db_node in db_nodes:
                # Create domain node
                domain_node = Node(
                    id=db_node.id,
                    scene=db_node.scene,
                    node_type=NodeType(db_node.node_type),
                    metadata=db_node.meta_data or {}
                )

                # Load events
                db_events = self.event_repo.get_events_by_node(db_node.id)
                for db_event in db_events:
                    domain_event = Event(
                        id=db_event.id,
                        speaker=db_event.speaker,
                        content=db_event.content,
                        description=db_event.description,
                        timestamp=db_event.timestamp,
                        event_type=db_event.event_type,
                        metadata=db_event.meta_data or {}
                    )
                    
                    # Load actions for event
                    for db_action in db_event.actions:
                        domain_action = DomainAction(
                            id=db_action.id,
                            description=db_action.description,
                            is_key_action=db_action.is_key_action,
                            metadata=db_action.meta_data or {}
                        )
                        domain_event.actions.append(domain_action)
                    
                    domain_node.events.append(domain_event)

                graph.nodes[db_node.id] = domain_node
                node_mapping[db_node.id] = domain_node

            # Load action bindings
            for db_node in db_nodes:
                domain_node = node_mapping[db_node.id]
                for db_binding in db_node.outgoing_actions:
                    domain_action = DomainAction(
                        id=db_binding.action.id,
                        description=db_binding.action.description,
                        is_key_action=db_binding.action.is_key_action,
                        metadata=db_binding.action.meta_data or {}
                    )
                    
                    target_node = None
                    target_event = None
                    
                    if db_binding.target_node_id and db_binding.target_node_id in node_mapping:
                        target_node = node_mapping[db_binding.target_node_id]
                    
                    domain_binding = DomainActionBinding(
                        action=domain_action,
                        target_node=target_node,
                        target_event=target_event
                    )
                    
                    domain_node.outgoing_actions.append(domain_binding)

            # Set start node
            if project.start_node_id:
                graph.start_node_id = project.start_node_id

            return graph
            
        except Exception as e:
            print(f"Error loading narrative graph: {e}")
            return None 


class StoryHistoryRepository:
    """Repository for managing story edit history and undo operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def save_snapshot(self, project_id: str, user_id: str, snapshot_data: Dict, 
                     operation_type: str, operation_description: str, 
                     affected_node_id: str = None) -> StoryEditHistory:
        """Save a snapshot of the current story state before an operation"""
        
        # Clean up old history (keep only last 5 entries per project)
        self._cleanup_old_history(project_id)
        
        history_entry = StoryEditHistory(
            project_id=project_id,
            user_id=user_id,
            snapshot_data=snapshot_data,
            operation_type=operation_type,
            operation_description=operation_description,
            affected_node_id=affected_node_id
        )
        
        self.db.add(history_entry)
        self.db.commit()
        self.db.refresh(history_entry)
        return history_entry
    
    def get_project_history(self, project_id: str, limit: int = 5) -> List[StoryEditHistory]:
        """Get the edit history for a project (most recent first)"""
        return self.db.query(StoryEditHistory).filter(
            StoryEditHistory.project_id == project_id
        ).order_by(StoryEditHistory.created_at.desc()).limit(limit).all()
    
    def get_latest_snapshot(self, project_id: str) -> Optional[StoryEditHistory]:
        """Get the most recent snapshot for rollback"""
        return self.db.query(StoryEditHistory).filter(
            StoryEditHistory.project_id == project_id
        ).order_by(StoryEditHistory.created_at.desc()).first()
    
    def restore_snapshot(self, project_id: str, snapshot_id: str, user_id: str) -> bool:
        """Restore a project to a previous snapshot state"""
        print(f"Starting restore for project {project_id}, snapshot {snapshot_id}")
        
        snapshot = self.db.query(StoryEditHistory).filter(
            StoryEditHistory.id == snapshot_id,
            StoryEditHistory.project_id == project_id
        ).first()
        
        if not snapshot:
            print(f"Snapshot {snapshot_id} not found")
            return False
        
        try:
            print(f"Found snapshot: {snapshot.operation_description}")
            
            # Validate snapshot data before proceeding
            snapshot_data = snapshot.snapshot_data
            if not snapshot_data or not isinstance(snapshot_data, dict):
                print("Error: Invalid or empty snapshot data")
                return False
            
            nodes_data = snapshot_data.get("nodes", {})
            if not isinstance(nodes_data, dict):
                print("Error: Invalid nodes data in snapshot")
                return False
            
            print(f"Snapshot contains {len(nodes_data)} nodes")
            
            # Get current state before rollback (but don't save it yet)
            print("Creating current state snapshot...")
            current_snapshot = self._create_current_snapshot(project_id)
            
            # Try the rollback operation in a separate transaction
            try:
                # Begin a savepoint for rollback safety
                savepoint = self.db.begin_nested()
                
                print("Applying snapshot...")
                self._apply_snapshot_safe(project_id, snapshot_data)
                
                # If we got here, the snapshot application succeeded
                savepoint.commit()
                print("Snapshot application successful, committing...")
                
                # Now save the current state as a rollback point
                self.save_snapshot(
                    project_id=project_id,
                    user_id=user_id,
                    snapshot_data=current_snapshot,
                    operation_type="rollback_point",
                    operation_description=f"State before rollback to {snapshot.operation_description}",
                    affected_node_id=None
                )
                print("Rollback point saved")
                
                # Final commit
                self.db.commit()
                print("Snapshot restore completed successfully")
                return True
                
            except Exception as apply_error:
                print(f"Error during snapshot application: {apply_error}")
                # Roll back to the savepoint
                savepoint.rollback()
                print("Rolled back to savepoint due to error")
                raise apply_error
            
        except Exception as e:
            print(f"Error during snapshot restore: {e}")
            print(f"Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            self.db.rollback()
            return False
    
    def _cleanup_old_history(self, project_id: str):
        """Remove old history entries, keeping only the last 5"""
        old_entries = self.db.query(StoryEditHistory).filter(
            StoryEditHistory.project_id == project_id
        ).order_by(StoryEditHistory.created_at.desc()).offset(4).all()
        
        for entry in old_entries:
            self.db.delete(entry)
    
    def _create_current_snapshot(self, project_id: str) -> Dict:
        """Create a snapshot of the current project state"""
        try:
            print(f"Creating snapshot for project {project_id}")
            narrative_repo = NarrativeRepository(self.db)
            
            project = narrative_repo.get_project(project_id)
            if not project:
                print(f"Warning: Project {project_id} not found")
                return {}
            
            # Get all nodes with their events and actions
            nodes = self.db.query(NarrativeNode).filter(
                NarrativeNode.project_id == project_id
            ).all()
            
            print(f"Found {len(nodes)} nodes for snapshot")
            
            snapshot = {
                "project_info": {
                    "id": project.id,
                    "title": project.title or "",
                    "description": project.description or "",
                    "start_node_id": project.start_node_id
                },
                "nodes": {}
            }
            
            for node in nodes:
                try:
                    # Get events for this node
                    events = self.db.query(NarrativeEvent).filter(
                        NarrativeEvent.node_id == node.id
                    ).all()
                    
                    # Get action bindings for this node
                    action_bindings = self.db.query(ActionBinding).filter(
                        ActionBinding.source_node_id == node.id
                    ).all()
                    
                    print(f"Node {node.id}: {len(events)} events, {len(action_bindings)} action bindings")
                    
                    # Build events data
                    events_data = []
                    for event in events:
                        try:
                            event_data = {
                                "id": event.id,
                                "speaker": event.speaker or "",
                                "content": event.content or "",
                                "description": event.description or "",
                                "timestamp": event.timestamp or 0,
                                "event_type": event.event_type or "dialogue",
                                "meta_data": event.meta_data or {}
                            }
                            events_data.append(event_data)
                        except Exception as e:
                            print(f"Warning: Error processing event {event.id}: {e}")
                            continue
                    
                    # Build actions data
                    actions_data = []
                    for binding in action_bindings:
                        try:
                            if not binding.action:
                                print(f"Warning: ActionBinding {binding.id} has no action")
                                continue
                            
                            action_data = {
                                "binding_id": binding.id,
                                "action": {
                                    "id": binding.action.id,
                                    "description": binding.action.description or "",
                                    "is_key_action": binding.action.is_key_action or False,
                                    "meta_data": binding.action.meta_data or {}
                                },
                                "target_node_id": binding.target_node_id,
                                "target_event_id": binding.target_event_id
                            }
                            actions_data.append(action_data)
                        except Exception as e:
                            print(f"Warning: Error processing action binding {binding.id}: {e}")
                            continue
                    
                    # Build node data
                    snapshot["nodes"][node.id] = {
                        "id": node.id,
                        "scene": node.scene or "",
                        "node_type": node.node_type or "scene",
                        "level": node.level or 0,
                        "parent_node_id": node.parent_node_id,
                        "meta_data": node.meta_data or {},
                        "events": events_data,
                        "actions": actions_data
                    }
                    
                except Exception as e:
                    print(f"Warning: Error processing node {node.id}: {e}")
                    continue
            
            print(f"Snapshot created with {len(snapshot['nodes'])} nodes")
            return snapshot
            
        except Exception as e:
            print(f"Error creating snapshot for project {project_id}: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    def _apply_snapshot(self, project_id: str, snapshot_data: Dict):
        """Apply a snapshot to restore project state"""
        try:
            print(f"Starting snapshot restore for project {project_id}")
            print(f"Snapshot data keys: {list(snapshot_data.keys())}")
            
            # Validate snapshot data
            if not snapshot_data:
                print("Warning: Empty snapshot data")
                return
            
            nodes_data = snapshot_data.get("nodes", {})
            print(f"Snapshot contains {len(nodes_data)} nodes")
            
            # Get all current nodes for this project first
            current_nodes = self.db.query(NarrativeNode).filter(
                NarrativeNode.project_id == project_id
            ).all()
            
            print(f"Current project has {len(current_nodes)} nodes to delete")
            
            # Delete in proper order to handle foreign key constraints
            
            # 1. Delete action bindings first
            bindings_deleted = 0
            for node in current_nodes:
                deleted_count = self.db.query(ActionBinding).filter(
                    ActionBinding.source_node_id == node.id
                ).delete(synchronize_session=False)
                bindings_deleted += deleted_count
            print(f"Deleted {bindings_deleted} action bindings")
            
            # 2. Delete actions (only standalone actions, not those linked to events)
            actions_deleted = 0
            for node in current_nodes:
                # Get events for this node
                events = self.db.query(NarrativeEvent).filter(
                    NarrativeEvent.node_id == node.id
                ).all()
                
                # Delete actions linked to these events
                for event in events:
                    deleted_count = self.db.query(Action).filter(
                        Action.event_id == event.id
                    ).delete(synchronize_session=False)
                    actions_deleted += deleted_count
            print(f"Deleted {actions_deleted} actions")
            
            # 3. Delete events
            events_deleted = 0
            for node in current_nodes:
                deleted_count = self.db.query(NarrativeEvent).filter(
                    NarrativeEvent.node_id == node.id
                ).delete(synchronize_session=False)
                events_deleted += deleted_count
            print(f"Deleted {events_deleted} events")
            
            # 4. Delete nodes
            nodes_deleted = self.db.query(NarrativeNode).filter(
                NarrativeNode.project_id == project_id
            ).delete(synchronize_session=False)
            print(f"Deleted {nodes_deleted} nodes")
            
            # Commit deletions
            self.db.commit()
            print(f"Deletion phase completed successfully")
            
            # Recreate from snapshot
            print(f"Recreating {len(nodes_data)} nodes from snapshot")
            
            created_nodes = 0
            created_events = 0
            created_actions = 0
            created_bindings = 0
            
            for node_id, node_data in nodes_data.items():
                try:
                    print(f"Creating node {node_id}: {node_data.get('scene', 'No scene')[:50]}...")
                    
                    # Validate node data
                    if not isinstance(node_data, dict):
                        print(f"Warning: Invalid node data for {node_id}, skipping")
                        continue
                    
                    # Create node with safe defaults
                    new_node = NarrativeNode(
                        id=node_data.get("id", node_id),
                        project_id=project_id,
                        scene=node_data.get("scene", ""),
                        node_type=node_data.get("node_type", "scene"),
                        level=int(node_data.get("level", 0)),
                        parent_node_id=node_data.get("parent_node_id"),
                        meta_data=node_data.get("meta_data") or {}
                    )
                    self.db.add(new_node)
                    created_nodes += 1
                    
                    # Create events
                    events_data = node_data.get("events", [])
                    if not isinstance(events_data, list):
                        print(f"Warning: Invalid events data for node {node_id}")
                        events_data = []
                    
                    for event_data in events_data:
                        if not isinstance(event_data, dict):
                            print(f"Warning: Invalid event data in node {node_id}")
                            continue
                            
                        new_event = NarrativeEvent(
                            id=event_data.get("id", f"event_{int(time.time() * 1000000)}"),
                            node_id=node_data.get("id", node_id),
                            speaker=str(event_data.get("speaker", "")),
                            content=str(event_data.get("content", "")),
                            description=str(event_data.get("description", "")),
                            timestamp=int(event_data.get("timestamp", 0)),
                            event_type=str(event_data.get("event_type", "dialogue")),
                            meta_data=event_data.get("meta_data") or {}
                        )
                        self.db.add(new_event)
                        created_events += 1
                    
                    # Create actions and bindings
                    actions_data = node_data.get("actions", [])
                    if not isinstance(actions_data, list):
                        print(f"Warning: Invalid actions data for node {node_id}")
                        actions_data = []
                    
                    for action_data in actions_data:
                        if not isinstance(action_data, dict):
                            print(f"Warning: Invalid action data in node {node_id}")
                            continue
                            
                        action_info = action_data.get("action", {})
                        if not isinstance(action_info, dict):
                            print(f"Warning: Invalid action info in node {node_id}")
                            continue
                        
                        action_id = action_info.get("id")
                        if not action_id:
                            print(f"Warning: Missing action ID in node {node_id}")
                            continue
                        
                        new_action = Action(
                            id=action_id,
                            description=str(action_info.get("description", "")),
                            is_key_action=bool(action_info.get("is_key_action", False)),
                            meta_data=action_info.get("meta_data") or {},
                            event_id=None  # Standalone action
                        )
                        self.db.add(new_action)
                        created_actions += 1
                        
                        binding_id = action_data.get("binding_id")
                        if not binding_id:
                            print(f"Warning: Missing binding ID for action {action_id}")
                            continue
                        
                        new_binding = ActionBinding(
                            id=binding_id,
                            action_id=action_id,
                            source_node_id=node_data.get("id", node_id),
                            target_node_id=action_data.get("target_node_id"),
                            target_event_id=action_data.get("target_event_id")
                        )
                        self.db.add(new_binding)
                        created_bindings += 1
                        
                except Exception as e:
                    print(f"Error recreating node {node_id}: {e}")
                    import traceback
                    traceback.print_exc()
                    raise
            
            print(f"Created: {created_nodes} nodes, {created_events} events, {created_actions} actions, {created_bindings} bindings")
            
            # Update project info
            project_info = snapshot_data.get("project_info", {})
            if project_info and isinstance(project_info, dict):
                project = self.db.query(NarrativeProject).filter(
                    NarrativeProject.id == project_id
                ).first()
                if project:
                    start_node_id = project_info.get("start_node_id")
                    if start_node_id:
                        project.start_node_id = start_node_id
                        print(f"Updated project start_node_id to {start_node_id}")
            
            # Final commit
            self.db.commit()
            print(f"Successfully restored snapshot for project {project_id}")
            
        except Exception as e:
            print(f"Error in _apply_snapshot: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            self.db.rollback()
            raise 

    def _apply_snapshot_safe(self, project_id: str, snapshot_data: Dict):
        """Safely apply a snapshot with better error handling and validation"""
        try:
            print(f"Starting safe snapshot restore for project {project_id}")
            
            # Validate snapshot data structure
            if not snapshot_data or not isinstance(snapshot_data, dict):
                raise ValueError("Invalid snapshot data")
            
            nodes_data = snapshot_data.get("nodes", {})
            if not isinstance(nodes_data, dict):
                raise ValueError("Invalid nodes data in snapshot")
            
            print(f"Snapshot contains {len(nodes_data)} nodes")
            
            # Step 1: Collect all current data
            current_nodes = self.db.query(NarrativeNode).filter(
                NarrativeNode.project_id == project_id
            ).all()
            
            print(f"Current project has {len(current_nodes)} nodes")
            
            # Step 2: Safe deletion in correct order
            self._safe_delete_project_data(project_id, current_nodes)
            
            # Step 3: Recreate from snapshot with validation
            self._safe_recreate_from_snapshot(project_id, snapshot_data)
            
            print(f"Safe snapshot restore completed for project {project_id}")
            
        except Exception as e:
            print(f"Error in _apply_snapshot_safe: {e}")
            raise
    
    def _safe_delete_project_data(self, project_id: str, current_nodes: list):
        """Safely delete current project data"""
        try:
            print("Starting safe deletion of current project data...")
            
            # CRITICAL FIX: Clear project.start_node_id before deleting nodes
            # This prevents foreign key constraint violations
            project = self.db.query(NarrativeProject).filter(
                NarrativeProject.id == project_id
            ).first()
            
            if project and project.start_node_id:
                print(f"Clearing project start_node_id: {project.start_node_id}")
                project.start_node_id = None
                self.db.flush()  # Apply this change immediately
            
            # STEP 1: Collect all action IDs BEFORE deleting anything
            print("Collecting all action IDs for deletion...")
            all_action_ids = []
            
            # Get all action IDs from action bindings (standalone actions)
            for node in current_nodes:
                try:
                    bindings = self.db.query(ActionBinding).filter(
                        ActionBinding.source_node_id == node.id
                    ).all()
                    for binding in bindings:
                        if binding.action_id:
                            all_action_ids.append(binding.action_id)
                except Exception as e:
                    print(f"Warning: Error getting action IDs for node {node.id}: {e}")
            
            # Get all action IDs from events (event-linked actions)
            for node in current_nodes:
                try:
                    events = self.db.query(NarrativeEvent).filter(
                        NarrativeEvent.node_id == node.id
                    ).all()
                    
                    for event in events:
                        try:
                            actions = self.db.query(Action).filter(
                                Action.event_id == event.id
                            ).all()
                            for action in actions:
                                all_action_ids.append(action.id)
                        except Exception as e:
                            print(f"Warning: Error getting action IDs for event {event.id}: {e}")
                except Exception as e:
                    print(f"Warning: Error processing events for node {node.id}: {e}")
            
            # Remove duplicates
            unique_action_ids = list(set(all_action_ids))
            print(f"Found {len(unique_action_ids)} unique actions to delete")
            
            # STEP 2: Now delete in safe order
            total_bindings = 0
            total_actions = 0
            total_events = 0
            
            # 1. Delete action bindings first
            for node in current_nodes:
                try:
                    count = self.db.query(ActionBinding).filter(
                        ActionBinding.source_node_id == node.id
                    ).delete(synchronize_session=False)
                    total_bindings += count
                except Exception as e:
                    print(f"Warning: Error deleting bindings for node {node.id}: {e}")
            
            print(f"Deleted {total_bindings} action bindings")
            
            # 2. Delete all collected actions in batches
            batch_size = 100
            for i in range(0, len(unique_action_ids), batch_size):
                batch = unique_action_ids[i:i + batch_size]
                try:
                    count = self.db.query(Action).filter(
                        Action.id.in_(batch)
                    ).delete(synchronize_session=False)
                    total_actions += count
                    print(f"Deleted {count} actions in batch {i//batch_size + 1}")
                except Exception as e:
                    print(f"Warning: Error deleting action batch {i//batch_size + 1}: {e}")
            
            print(f"Deleted {total_actions} total actions")
            
            # 3. Delete events
            for node in current_nodes:
                try:
                    count = self.db.query(NarrativeEvent).filter(
                        NarrativeEvent.node_id == node.id
                    ).delete(synchronize_session=False)
                    total_events += count
                except Exception as e:
                    print(f"Warning: Error deleting events for node {node.id}: {e}")
            
            print(f"Deleted {total_events} events")
            
            # 4. Now safely delete nodes (start_node_id is already cleared)
            try:
                nodes_count = self.db.query(NarrativeNode).filter(
                    NarrativeNode.project_id == project_id
                ).delete(synchronize_session=False)
                print(f"Deleted {nodes_count} nodes")
            except Exception as e:
                print(f"Error deleting nodes: {e}")
                raise
            
            # Commit deletion phase
            self.db.flush()  # Flush instead of commit to keep in transaction
            print("Deletion phase completed successfully")
            
        except Exception as e:
            print(f"Error in safe deletion: {e}")
            raise
    
    def _safe_recreate_from_snapshot(self, project_id: str, snapshot_data: Dict):
        """Safely recreate data from snapshot with validation"""
        try:
            nodes_data = snapshot_data.get("nodes", {})
            print(f"Recreating {len(nodes_data)} nodes from snapshot")
            
            created_counts = {"nodes": 0, "events": 0, "actions": 0, "bindings": 0}
            
            # Create nodes and events first
            for node_id, node_data in nodes_data.items():
                try:
                    self._safe_create_node_and_events(project_id, node_id, node_data, created_counts)
                except Exception as e:
                    print(f"Error creating node {node_id}: {e}")
                    raise
            
            # Then create actions and bindings
            for node_id, node_data in nodes_data.items():
                try:
                    self._safe_create_actions_and_bindings(node_id, node_data, created_counts)
                except Exception as e:
                    print(f"Error creating actions for node {node_id}: {e}")
                    raise
            
            print(f"Created: {created_counts}")
            
            # CRITICAL: Flush nodes and actions first before updating project.start_node_id
            # This ensures the nodes exist in the database before we reference them
            self.db.flush()
            print("Flushed created nodes and actions to database")
            
            # Now safely update project info (after nodes exist in database)
            self._safe_update_project_info(project_id, snapshot_data)
            
            # Final flush for project info updates
            self.db.flush()
            print("Recreation phase completed successfully")
            
        except Exception as e:
            print(f"Error in safe recreation: {e}")
            raise
    
    def _safe_create_node_and_events(self, project_id: str, node_id: str, node_data: dict, counts: dict):
        """Safely create a node and its events"""
        if not isinstance(node_data, dict):
            print(f"Warning: Invalid node data for {node_id}")
            return
        
        # Create node with safe defaults
        try:
            new_node = NarrativeNode(
                id=str(node_data.get("id", node_id)),
                project_id=project_id,
                scene=str(node_data.get("scene", ""))[:2000],  # Limit length
                node_type=str(node_data.get("node_type", "scene"))[:50],
                level=max(0, int(node_data.get("level", 0))),  # Ensure non-negative
                parent_node_id=node_data.get("parent_node_id"),
                meta_data=node_data.get("meta_data") if isinstance(node_data.get("meta_data"), dict) else {}
            )
            self.db.add(new_node)
            counts["nodes"] += 1
            
            # Create events for this node
            events_data = node_data.get("events", [])
            if isinstance(events_data, list):
                for event_data in events_data:
                    if isinstance(event_data, dict) and event_data.get("id"):
                        try:
                            new_event = NarrativeEvent(
                                id=str(event_data["id"]),
                                node_id=str(node_data.get("id", node_id)),
                                speaker=str(event_data.get("speaker", ""))[:200],
                                content=str(event_data.get("content", ""))[:5000],
                                description=str(event_data.get("description", ""))[:1000],
                                timestamp=max(0, int(event_data.get("timestamp", 0))),
                                event_type=str(event_data.get("event_type", "dialogue"))[:50],
                                meta_data=event_data.get("meta_data") if isinstance(event_data.get("meta_data"), dict) else {}
                            )
                            self.db.add(new_event)
                            counts["events"] += 1
                        except Exception as e:
                            print(f"Warning: Failed to create event {event_data.get('id')}: {e}")
                            
        except Exception as e:
            print(f"Error creating node {node_id}: {e}")
            raise
    
    def _safe_create_actions_and_bindings(self, node_id: str, node_data: dict, counts: dict):
        """Safely create actions and bindings for a node"""
        actions_data = node_data.get("actions", [])
        if not isinstance(actions_data, list):
            return
        
        for action_data in actions_data:
            if not isinstance(action_data, dict):
                continue
                
            action_info = action_data.get("action", {})
            if not isinstance(action_info, dict) or not action_info.get("id"):
                continue
            
            try:
                # Create action
                new_action = Action(
                    id=str(action_info["id"]),
                    description=str(action_info.get("description", ""))[:500],
                    is_key_action=bool(action_info.get("is_key_action", False)),
                    meta_data=action_info.get("meta_data") if isinstance(action_info.get("meta_data"), dict) else {},
                    event_id=None  # Standalone action
                )
                self.db.add(new_action)
                counts["actions"] += 1
                
                # Create binding if we have binding_id
                binding_id = action_data.get("binding_id")
                if binding_id:
                    new_binding = ActionBinding(
                        id=str(binding_id),
                        action_id=str(action_info["id"]),
                        source_node_id=str(node_data.get("id", node_id)),
                        target_node_id=action_data.get("target_node_id"),
                        target_event_id=action_data.get("target_event_id")
                    )
                    self.db.add(new_binding)
                    counts["bindings"] += 1
                    
            except Exception as e:
                print(f"Warning: Failed to create action {action_info.get('id')}: {e}")
    
    def _safe_update_project_info(self, project_id: str, snapshot_data: dict):
        """Safely update project information from snapshot"""
        try:
            project_info = snapshot_data.get("project_info", {})
            if isinstance(project_info, dict):
                project = self.db.query(NarrativeProject).filter(
                    NarrativeProject.id == project_id
                ).first()
                
                if project:
                    start_node_id = project_info.get("start_node_id")
                    if start_node_id:
                        # CRITICAL: Verify that the start_node_id actually exists before setting it
                        node_exists = self.db.query(NarrativeNode).filter(
                            NarrativeNode.id == start_node_id,
                            NarrativeNode.project_id == project_id
                        ).first()
                        
                        if node_exists:
                            project.start_node_id = str(start_node_id)
                            print(f"Updated project start_node_id to {start_node_id}")
                        else:
                            print(f"Warning: start_node_id {start_node_id} does not exist, keeping project.start_node_id as None")
                            project.start_node_id = None
                    else:
                        # No start_node_id in snapshot, set to None
                        project.start_node_id = None
                        print("Set project.start_node_id to None (no start node in snapshot)")
        except Exception as e:
            print(f"Warning: Failed to update project info: {e}")
            # Don't raise here, this is not critical enough to fail the entire rollback 