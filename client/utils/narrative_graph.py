"""
Interactive Narrative Graph System

This module implements a directed graph structure for interactive narratives,
supporting main storyline nodes and events with player actions.
"""

from typing import Dict, List, Optional, Set, Tuple, Any, Union
from enum import Enum
from dataclasses import dataclass, field
import json
import uuid
from collections import defaultdict


class NodeType(Enum):
    """Types of narrative nodes."""
    SCENE = "scene"  # Main storyline node
    EVENT = "event"  # Independent event node


class ActionType(Enum):
    """Types of player actions."""
    KEY_ACTION = "key_action"      # Changes main storyline state
    REGULAR_ACTION = "regular_action"  # Triggers events/feedback only


@dataclass
class Event:
    """Represents a background dialogue or environmental description."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    speaker: str = ""  # 说话者，环境描述时为空
    content: str = ""  # 对话或环境描述内容
    timestamp: int = 0  # 时间戳，用于排序
    event_type: str = "dialogue"  # "dialogue" 或 "narration"
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # 保留原有字段以兼容旧代码
    description: str = ""
    actions: List['Action'] = field(default_factory=list)
    
    def add_action(self, action: 'Action') -> None:
        """Add a non-key action to this event."""
        if not action.is_key_action:  # 只允许非关键动作
            self.actions.append(action)
    
    def get_action_by_id(self, action_id: str) -> Optional['Action']:
        """Get action by ID."""
        for action in self.actions:
            if action.id == action_id:
                return action
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary representation."""
        return {
            'id': self.id,
            'speaker': self.speaker,
            'content': self.content,
            'timestamp': self.timestamp,
            'event_type': self.event_type,
            'description': self.description,  # 兼容性
            'actions': [action.to_dict() for action in self.actions],
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create event from dictionary representation."""
        event = cls(
            id=data.get('id', str(uuid.uuid4())),
            speaker=data.get('speaker', ''),
            content=data.get('content', ''),
            timestamp=data.get('timestamp', 0),
            event_type=data.get('event_type', 'dialogue'),
            description=data.get('description', ''),  # 兼容性
            metadata=data.get('metadata', {})
        )
        
        # Load actions
        for action_data in data.get('actions', []):
            action = Action.from_dict(action_data)
            event.actions.append(action)
        
        return event


@dataclass
class Action:
    """Represents a player action template."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: str = ""
    is_key_action: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def action_type(self) -> ActionType:
        """Get the action type based on is_key_action flag."""
        return ActionType.KEY_ACTION if self.is_key_action else ActionType.REGULAR_ACTION
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert action to dictionary representation."""
        return {
            'id': self.id,
            'description': self.description,
            'is_key_action': self.is_key_action,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Action':
        """Create action from dictionary representation."""
        return cls(
            id=data.get('id', str(uuid.uuid4())),
            description=data.get('description', ''),
            is_key_action=data.get('is_key_action', False),
            metadata=data.get('metadata', {})
        )


@dataclass
class ActionBinding:
    """Represents a bound action with its target."""
    action: Action
    target_node: Optional['Node'] = None
    target_event: Optional[Event] = None
    
    def validate(self) -> bool:
        """Validate the action binding according to constraints."""
        if self.action.is_key_action:
            return self.target_node is not None and self.target_event is None
        else:
            return self.target_event is not None and self.target_node is None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert action binding to dictionary representation."""
        return {
            'action': self.action.to_dict(),
            'target_node_id': self.target_node.id if self.target_node else None,
            'target_event': self.target_event.to_dict() if self.target_event else None
        }


@dataclass
class Node:
    """Represents a narrative node in the graph."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    scene: str = ""
    node_type: NodeType = NodeType.SCENE
    events: List[Event] = field(default_factory=list)
    outgoing_actions: List[ActionBinding] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def add_event(self, event: Event) -> None:
        """Add an event to this node."""
        if event not in self.events:
            self.events.append(event)
    
    def remove_event(self, event_id: str) -> bool:
        """Remove an event from this node by ID."""
        for i, event in enumerate(self.events):
            if event.id == event_id:
                del self.events[i]
                return True
        return False
    
    def add_action_binding(self, binding: ActionBinding) -> bool:
        """Add an action binding to this node."""
        if binding.validate():
            self.outgoing_actions.append(binding)
            return True
        return False
    
    def remove_action_binding(self, action_id: str) -> bool:
        """Remove an action binding by action ID."""
        for i, binding in enumerate(self.outgoing_actions):
            if binding.action.id == action_id:
                del self.outgoing_actions[i]
                return True
        return False
    
    def get_key_actions(self) -> List[ActionBinding]:
        """Get all key action bindings from this node."""
        return [binding for binding in self.outgoing_actions if binding.action.is_key_action]
    
    def get_regular_actions(self) -> List[ActionBinding]:
        """Get all regular action bindings from this node."""
        return [binding for binding in self.outgoing_actions if not binding.action.is_key_action]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary representation."""
        return {
            'id': self.id,
            'scene': self.scene,
            'node_type': self.node_type.value,
            'events': [event.to_dict() for event in self.events],
            'outgoing_actions': [binding.to_dict() for binding in self.outgoing_actions],
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], node_lookup: Dict[str, 'Node'] = None) -> 'Node':
        """Create node from dictionary representation."""
        node = cls(
            id=data.get('id', str(uuid.uuid4())),
            scene=data.get('scene', ''),
            node_type=NodeType(data.get('node_type', NodeType.SCENE.value)),
            metadata=data.get('metadata', {})
        )
        
        # Load events
        for event_data in data.get('events', []):
            node.events.append(Event.from_dict(event_data))
        
        # Load action bindings (will need to be resolved after all nodes are loaded)
        node._pending_action_data = data.get('outgoing_actions', [])
        
        return node


class NarrativeGraph:
    """Manages the complete narrative graph structure."""
    
    def __init__(self, title: str = "Untitled Narrative"):
        self.title = title
        self.nodes: Dict[str, Node] = {}
        self.start_node_id: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
    
    # Basic node operations
    def create_node(self, scene: str) -> Node:
        """Create a new narrative node."""
        node = Node(scene=scene, node_type=NodeType.SCENE)
        self.nodes[node.id] = node
        
        # Set as start node if it's the first node
        if self.start_node_id is None:
            self.start_node_id = node.id
            
        return node
    
    def get_node(self, node_id: str) -> Optional[Node]:
        """Get a node by its ID."""
        return self.nodes.get(node_id)
    
    def remove_node(self, node_id: str) -> bool:
        """Remove a node and all references to it."""
        if node_id not in self.nodes:
            return False
        
        # Remove all action bindings that target this node
        for node in self.nodes.values():
            node.outgoing_actions = [
                binding for binding in node.outgoing_actions
                if binding.target_node is None or binding.target_node.id != node_id
            ]
        
        # Update start node if necessary
        if self.start_node_id == node_id:
            remaining_nodes = [nid for nid in self.nodes.keys() if nid != node_id]
            self.start_node_id = remaining_nodes[0] if remaining_nodes else None
        
        del self.nodes[node_id]
        return True
    
    # Event operations
    def attach_event(self, node: Node, event: str) -> Event:
        """Attach an event to a node."""
        event_obj = Event(description=event, content=event)
        node.add_event(event_obj)
        return event_obj
    
    def attach_event_by_id(self, node_id: str, event: str) -> Optional[Event]:
        """Attach an event to a node by node ID."""
        node = self.get_node(node_id)
        if node:
            return self.attach_event(node, event)
        return None
    
    # Action operations
    def create_action(self, description: str, is_key_action: bool) -> Action:
        """Create a new action template."""
        return Action(description=description, is_key_action=is_key_action)
    
    def bind_action(self, 
                   node_from: Node, 
                   action: Action, 
                   node_to: Optional[Node] = None, 
                   event: Optional[Event] = None) -> bool:
        """Bind an action to a node with its target."""
        # Validate constraints
        if action.is_key_action and node_to is None:
            raise ValueError("Key actions must specify a target node")
        if not action.is_key_action and event is None:
            raise ValueError("Regular actions must specify a target event")
        if action.is_key_action and event is not None:
            raise ValueError("Key actions cannot have target events")
        if not action.is_key_action and node_to is not None:
            raise ValueError("Regular actions cannot have target nodes")
        
        binding = ActionBinding(action=action, target_node=node_to, target_event=event)
        return node_from.add_action_binding(binding)
    
    def bind_action_by_id(self,
                         node_from_id: str,
                         action: Action,
                         node_to_id: Optional[str] = None,
                         event: Optional[Event] = None) -> bool:
        """Bind an action using node IDs."""
        node_from = self.get_node(node_from_id)
        node_to = self.get_node(node_to_id) if node_to_id else None
        
        if node_from is None:
            return False
        if action.is_key_action and node_to is None:
            return False
            
        return self.bind_action(node_from, action, node_to, event)
    
    # Graph analysis
    def get_all_nodes(self) -> List[Node]:
        """Get all nodes in the graph."""
        return list(self.nodes.values())
    
    def get_start_node(self) -> Optional[Node]:
        """Get the starting node of the narrative."""
        return self.get_node(self.start_node_id) if self.start_node_id else None
    
    def set_start_node(self, node_id: str) -> bool:
        """Set the starting node of the narrative."""
        if node_id in self.nodes:
            self.start_node_id = node_id
            return True
        return False
    
    def get_reachable_nodes(self, start_node_id: Optional[str] = None) -> Set[str]:
        """Get all nodes reachable from a starting node."""
        start_id = start_node_id or self.start_node_id
        if not start_id or start_id not in self.nodes:
            return set()
        
        visited = set()
        stack = [start_id]
        
        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue
            
            visited.add(current_id)
            current_node = self.nodes[current_id]
            
            # Add target nodes from key actions
            for binding in current_node.get_key_actions():
                if binding.target_node and binding.target_node.id not in visited:
                    stack.append(binding.target_node.id)
        
        return visited
    
    def get_unreachable_nodes(self) -> List[Node]:
        """Get all nodes that are not reachable from the start node."""
        reachable = self.get_reachable_nodes()
        return [node for node_id, node in self.nodes.items() if node_id not in reachable]
    
    def validate_graph(self) -> Dict[str, List[str]]:
        """Validate the graph and return any issues found."""
        issues = {
            'unreachable_nodes': [],
            'invalid_bindings': [],
            'missing_targets': [],
            'orphaned_events': []
        }
        
        # Check for unreachable nodes
        unreachable = self.get_unreachable_nodes()
        issues['unreachable_nodes'] = [f"Node {node.id}: {node.scene}" for node in unreachable]
        
        # Check for invalid action bindings
        for node in self.nodes.values():
            for binding in node.outgoing_actions:
                if not binding.validate():
                    issues['invalid_bindings'].append(
                        f"Node {node.id}: Invalid binding for action '{binding.action.description}'"
                    )
                
                # Check if target nodes exist
                if binding.target_node and binding.target_node.id not in self.nodes:
                    issues['missing_targets'].append(
                        f"Node {node.id}: Target node {binding.target_node.id} does not exist"
                    )
        
        return issues
    
    # Serialization
    def to_dict(self) -> Dict[str, Any]:
        """Convert the entire graph to dictionary representation."""
        return {
            'title': self.title,
            'start_node_id': self.start_node_id,
            'nodes': {node_id: node.to_dict() for node_id, node in self.nodes.items()},
            'metadata': self.metadata
        }
    
    def to_json(self, indent: int = 2) -> str:
        """Convert the graph to JSON string."""
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NarrativeGraph':
        """Create a graph from dictionary representation."""
        graph = cls(title=data.get('title', 'Untitled Narrative'))
        graph.start_node_id = data.get('start_node_id')
        graph.metadata = data.get('metadata', {})
        
        # First pass: create all nodes
        nodes_data = data.get('nodes', {})
        for node_id, node_data in nodes_data.items():
            node = Node.from_dict(node_data)
            graph.nodes[node_id] = node
        
        # Second pass: resolve action bindings
        for node_id, node in graph.nodes.items():
            if hasattr(node, '_pending_action_data'):
                for action_data in node._pending_action_data:
                    action = Action.from_dict(action_data['action'])
                    target_node_id = action_data.get('target_node_id')
                    target_event_data = action_data.get('target_event')
                    
                    target_node = graph.nodes.get(target_node_id) if target_node_id else None
                    target_event = Event.from_dict(target_event_data) if target_event_data else None
                    
                    binding = ActionBinding(
                        action=action,
                        target_node=target_node,
                        target_event=target_event
                    )
                    node.outgoing_actions.append(binding)
                
                delattr(node, '_pending_action_data')
        
        return graph
    
    @classmethod
    def from_json(cls, json_str: str) -> 'NarrativeGraph':
        """Create a graph from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    # Utility methods for common operations
    def create_simple_path(self, scenes: List[str], actions: List[str]) -> List[Node]:
        """Create a simple linear path of scenes connected by actions."""
        if len(scenes) != len(actions) + 1:
            raise ValueError("Number of actions must be one less than number of scenes")
        
        nodes = []
        for scene in scenes:
            nodes.append(self.create_node(scene))
        
        for i, action_desc in enumerate(actions):
            action = self.create_action(action_desc, is_key_action=True)
            self.bind_action(nodes[i], action, node_to=nodes[i + 1])
        
        return nodes
    
    def add_branch(self, from_node: Node, choices: List[Tuple[str, str]]) -> List[Node]:
        """Add branching paths from a node. Each choice is (action_description, scene_description)."""
        branch_nodes = []
        
        for action_desc, scene_desc in choices:
            target_node = self.create_node(scene_desc)
            action = self.create_action(action_desc, is_key_action=True)
            self.bind_action(from_node, action, node_to=target_node)
            branch_nodes.append(target_node)
        
        return branch_nodes
    
    def get_graph_stats(self) -> Dict[str, int]:
        """Get statistics about the graph."""
        total_nodes = len(self.nodes)
        total_events = sum(len(node.events) for node in self.nodes.values())
        total_actions = sum(len(node.outgoing_actions) for node in self.nodes.values())
        key_actions = sum(len(node.get_key_actions()) for node in self.nodes.values())
        regular_actions = sum(len(node.get_regular_actions()) for node in self.nodes.values())
        
        return {
            'total_nodes': total_nodes,
            'total_events': total_events,
            'total_actions': total_actions,
            'key_actions': key_actions,
            'regular_actions': regular_actions,
            'unreachable_nodes': len(self.get_unreachable_nodes())
        }


# Example usage and testing
if __name__ == "__main__":
    # Create a simple narrative graph
    graph = NarrativeGraph("Sample Interactive Story")
    
    # Create nodes
    start = graph.create_node("You wake up in a mysterious forest.")
    choice1 = graph.create_node("You follow the path to the left and find a cottage.")
    choice2 = graph.create_node("You follow the path to the right and find a river.")
    
    # Add events to nodes
    graph.attach_event(start, "You hear strange sounds in the distance.")
    graph.attach_event(choice1, "An old woman greets you from the cottage.")
    
    # Create and bind actions
    action_left = graph.create_action("Go left", is_key_action=True)
    action_right = graph.create_action("Go right", is_key_action=True)
    action_look = graph.create_action("Look around", is_key_action=False)
    
    graph.bind_action(start, action_left, node_to=choice1)
    graph.bind_action(start, action_right, node_to=choice2)
    
    # Add a regular action with event
    look_event = Event(description="You see tall trees and filtered sunlight.")
    graph.bind_action(start, action_look, event=look_event)
    
    print("=== Narrative Graph Demo ===")
    print(f"Graph: {graph.title}")
    print(f"Stats: {graph.get_graph_stats()}")
    
    # Validate graph
    issues = graph.validate_graph()
    print(f"Validation issues: {issues}")
    
    # Export to JSON
    json_output = graph.to_json()
    print(f"JSON export length: {len(json_output)} characters") 