"""
Repository layer for database operations
Handles CRUD operations and data mapping between domain models and database models
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from .database import (
    NarrativeProject, NarrativeNode, NarrativeEvent, Action, ActionBinding, WorldState
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
                        event_id=db_event.id,
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