"""
Narrative Builder - High-level API for building interactive narratives

This module provides a simplified interface for creating complex narrative graphs
with fluent API design and helper methods.
"""

from typing import Dict, List, Optional, Tuple, Any, Union
from .narrative_graph import NarrativeGraph, Node, Action, Event, ActionBinding
import json


class NarrativeBuilder:
    """High-level builder for creating interactive narrative graphs."""
    
    def __init__(self, title: str = "New Interactive Story"):
        self.graph = NarrativeGraph(title)
        self.current_node: Optional[Node] = None
        self._node_references: Dict[str, Node] = {}
    
    def set_title(self, title: str) -> 'NarrativeBuilder':
        """Set the narrative title."""
        self.graph.title = title
        return self
    
    def scene(self, name: str, description: str) -> 'NarrativeBuilder':
        """Create a new scene node and set it as current."""
        node = self.graph.create_node(description)
        self.current_node = node
        self._node_references[name] = node
        return self
    
    def event(self, description: str) -> 'NarrativeBuilder':
        """Add an event to the current node."""
        if self.current_node is None:
            raise ValueError("No current node. Call scene() first.")
        self.graph.attach_event(self.current_node, description)
        return self
    
    def choice(self, action_text: str, target_scene: str) -> 'NarrativeBuilder':
        """Add a key action that leads to another scene."""
        if self.current_node is None:
            raise ValueError("No current node. Call scene() first.")
        
        # Store the action for later binding when target scene is created
        if not hasattr(self, '_pending_choices'):
            self._pending_choices = []
        
        self._pending_choices.append({
            'from_node': self.current_node,
            'action_text': action_text,
            'target_scene': target_scene
        })
        return self
    
    def action(self, description: str, event_description: str) -> 'NarrativeBuilder':
        """Add a regular action that triggers an event."""
        if self.current_node is None:
            raise ValueError("No current node. Call scene() first.")
        
        action = self.graph.create_action(description, is_key_action=False)
        event = Event(description=event_description, content=event_description)
        self.graph.bind_action(self.current_node, action, event=event)
        return self
    
    def goto(self, scene_name: str) -> 'NarrativeBuilder':
        """Switch to a previously created scene."""
        if scene_name not in self._node_references:
            raise ValueError(f"Scene '{scene_name}' not found. Available scenes: {list(self._node_references.keys())}")
        self.current_node = self._node_references[scene_name]
        return self
    
    def start_at(self, scene_name: str) -> 'NarrativeBuilder':
        """Set the starting scene of the narrative."""
        if scene_name not in self._node_references:
            raise ValueError(f"Scene '{scene_name}' not found.")
        self.graph.set_start_node(self._node_references[scene_name].id)
        return self
    
    def build(self) -> NarrativeGraph:
        """Finalize the narrative graph by resolving all pending connections."""
        # Resolve pending choices
        if hasattr(self, '_pending_choices'):
            for choice in self._pending_choices:
                from_node = choice['from_node']
                action_text = choice['action_text']
                target_scene = choice['target_scene']
                
                if target_scene in self._node_references:
                    target_node = self._node_references[target_scene]
                    action = self.graph.create_action(action_text, is_key_action=True)
                    self.graph.bind_action(from_node, action, node_to=target_node)
                else:
                    print(f"Warning: Target scene '{target_scene}' not found for choice '{action_text}'")
            
            delattr(self, '_pending_choices')
        
        return self.graph
    
    def branch(self, choices: List[Tuple[str, str]]) -> 'NarrativeBuilder':
        """Add multiple branching choices from the current node."""
        for action_text, target_scene in choices:
            self.choice(action_text, target_scene)
        return self
    
    def linear_path(self, scenes: List[Tuple[str, str, str]]) -> 'NarrativeBuilder':
        """Create a linear sequence of scenes. Each tuple is (name, description, action_to_next)."""
        for i, (name, description, action_text) in enumerate(scenes):
            self.scene(name, description)
            
            # Add action to next scene (except for the last one)
            if i < len(scenes) - 1:
                next_scene_name = scenes[i + 1][0]
                self.choice(action_text, next_scene_name)
        
        return self
    
    def add_metadata(self, key: str, value: Any) -> 'NarrativeBuilder':
        """Add metadata to the current node."""
        if self.current_node is None:
            raise ValueError("No current node. Call scene() first.")
        self.current_node.metadata[key] = value
        return self
    
    def add_graph_metadata(self, key: str, value: Any) -> 'NarrativeBuilder':
        """Add metadata to the entire graph."""
        self.graph.metadata[key] = value
        return self


class NarrativeTemplate:
    """Predefined templates for common narrative structures."""
    
    @staticmethod
    def simple_choice_story() -> NarrativeBuilder:
        """Create a simple branching choice story template."""
        return (NarrativeBuilder("Simple Choice Story")
                .scene("start", "You stand at a crossroads in the forest.")
                .event("The wind rustles through the ancient trees.")
                .action("Look around", "You see paths leading in different directions.")
                .choice("Take the left path", "left_path")
                .choice("Take the right path", "right_path")
                .scene("left_path", "You discover an abandoned cottage.")
                .event("The door creaks open as you approach.")
                .choice("Enter the cottage", "cottage_inside")
                .choice("Return to the crossroads", "start")
                .scene("right_path", "You find a rushing river with a wooden bridge.")
                .event("Fish jump in the sparkling water.")
                .choice("Cross the bridge", "other_side")
                .choice("Return to the crossroads", "start")
                .scene("cottage_inside", "Inside, you find mysterious artifacts.")
                .scene("other_side", "Beyond the bridge lies a bustling village.")
                .start_at("start"))
    
    @staticmethod
    def mystery_investigation() -> NarrativeBuilder:
        """Create a mystery investigation template."""
        return (NarrativeBuilder("Mystery Investigation")
                .scene("crime_scene", "You arrive at the scene of a puzzling crime.")
                .event("Police tape flutters in the breeze.")
                .action("Examine the evidence", "You notice several important clues.")
                .choice("Interview the witness", "witness")
                .choice("Check the security footage", "footage")
                .choice("Search the nearby area", "search")
                .scene("witness", "A nervous witness provides conflicting testimony.")
                .choice("Press for details", "witness_details")
                .choice("End the interview", "crime_scene")
                .scene("footage", "The security camera reveals a suspicious figure.")
                .choice("Enhance the image", "enhanced_footage")
                .choice("Check other cameras", "more_footage")
                .scene("search", "You discover a hidden item in the bushes.")
                .choice("Analyze the item", "lab_analysis")
                .choice("Return to the scene", "crime_scene")
                .scene("witness_details", "The witness admits to seeing something important.")
                .scene("enhanced_footage", "The enhanced image reveals a crucial detail.")
                .scene("more_footage", "Additional footage shows the suspect's escape route.")
                .scene("lab_analysis", "Laboratory tests reveal surprising results.")
                .start_at("crime_scene"))
    
    @staticmethod
    def rpg_adventure() -> NarrativeBuilder:
        """Create an RPG-style adventure template."""
        return (NarrativeBuilder("RPG Adventure")
                .scene("tavern", "You sit in a dimly lit tavern, seeking adventure.")
                .event("A hooded stranger approaches your table.")
                .action("Order another drink", "The bartender slides you a mysterious note.")
                .choice("Accept the stranger's quest", "quest_accept")
                .choice("Ignore the stranger", "tavern_stay")
                .choice("Leave the tavern", "town_square")
                .scene("quest_accept", "The stranger offers you a dangerous but rewarding mission.")
                .choice("Head to the ancient ruins", "ruins")
                .choice("Gather supplies first", "shop")
                .scene("tavern_stay", "You continue drinking and overhear interesting rumors.")
                .choice("Investigate the rumors", "rumors")
                .choice("Go to sleep", "inn_room")
                .scene("town_square", "The town square bustles with merchants and travelers.")
                .choice("Visit the marketplace", "shop")
                .choice("Check the notice board", "notice_board")
                .scene("ruins", "You arrive at crumbling stone structures covered in moss.")
                .scene("shop", "The merchant has various weapons and supplies for sale.")
                .scene("rumors", "The rumors lead you to discover a hidden conspiracy.")
                .scene("inn_room", "You rest and prepare for tomorrow's adventures.")
                .scene("notice_board", "Several quests and bounties are posted here.")
                .start_at("tavern"))


class NarrativeAnalyzer:
    """Tools for analyzing and visualizing narrative graphs."""
    
    def __init__(self, graph: NarrativeGraph):
        self.graph = graph
    
    def get_story_paths(self) -> List[List[str]]:
        """Get all possible story paths from start to end nodes."""
        start_node = self.graph.get_start_node()
        if not start_node:
            return []
        
        paths = []
        
        def dfs(current_node: Node, current_path: List[str], visited: set):
            current_path.append(current_node.scene)
            
            # Check if this is an end node (no outgoing key actions)
            key_actions = current_node.get_key_actions()
            if not key_actions:
                paths.append(current_path.copy())
            else:
                for binding in key_actions:
                    if binding.target_node and binding.target_node.id not in visited:
                        new_visited = visited.copy()
                        new_visited.add(current_node.id)
                        dfs(binding.target_node, current_path.copy(), new_visited)
        
        dfs(start_node, [], set())
        return paths
    
    def get_choice_points(self) -> List[Tuple[str, List[str]]]:
        """Get all choice points and their available options."""
        choice_points = []
        
        for node in self.graph.get_all_nodes():
            key_actions = node.get_key_actions()
            if len(key_actions) > 1:
                choices = [binding.action.description for binding in key_actions]
                choice_points.append((node.scene, choices))
        
        return choice_points
    
    def get_narrative_summary(self) -> Dict[str, Any]:
        """Get a comprehensive summary of the narrative."""
        stats = self.graph.get_graph_stats()
        paths = self.get_story_paths()
        choice_points = self.get_choice_points()
        
        return {
            'title': self.graph.title,
            'statistics': stats,
            'total_paths': len(paths),
            'max_path_length': max(len(path) for path in paths) if paths else 0,
            'min_path_length': min(len(path) for path in paths) if paths else 0,
            'choice_points': len(choice_points),
            'branching_factor': sum(len(choices) for _, choices in choice_points) / len(choice_points) if choice_points else 0
        }
    
    def export_to_mermaid(self) -> str:
        """Export the narrative graph to Mermaid diagram format."""
        lines = ["graph TD"]
        
        # Add nodes
        for node_id, node in self.graph.nodes.items():
            safe_id = node_id.replace('-', '_')
            scene_text = node.scene.replace('"', "'")[:50] + ("..." if len(node.scene) > 50 else "")
            lines.append(f'    {safe_id}["{scene_text}"]')
        
        # Add edges
        for node_id, node in self.graph.nodes.items():
            safe_from_id = node_id.replace('-', '_')
            for binding in node.get_key_actions():
                if binding.target_node:
                    safe_to_id = binding.target_node.id.replace('-', '_')
                    action_text = binding.action.description.replace('"', "'")[:30]
                    lines.append(f'    {safe_from_id} -->|"{action_text}"| {safe_to_id}')
        
        return '\n'.join(lines)
    
    def export_to_dot(self) -> str:
        """Export the narrative graph to Graphviz DOT format."""
        lines = ["digraph NarrativeGraph {", "    rankdir=TB;", "    node [shape=box];"]
        
        # Add nodes
        for node_id, node in self.graph.nodes.items():
            scene_text = node.scene.replace('"', '\\"')[:50] + ("..." if len(node.scene) > 50 else "")
            color = "lightblue" if node_id == self.graph.start_node_id else "white"
            lines.append(f'    "{node_id}" [label="{scene_text}" fillcolor="{color}" style="filled"];')
        
        # Add edges
        for node_id, node in self.graph.nodes.items():
            for binding in node.get_key_actions():
                if binding.target_node:
                    action_text = binding.action.description.replace('"', '\\"')[:30]
                    lines.append(f'    "{node_id}" -> "{binding.target_node.id}" [label="{action_text}"];')
        
        lines.append("}")
        return '\n'.join(lines)


# Example usage
if __name__ == "__main__":
    # Create a story using the builder
    story = (NarrativeBuilder("The Enchanted Forest")
             .scene("forest_entrance", "You stand before a mysterious enchanted forest.")
             .event("Strange lights flicker between the trees.")
             .action("Listen carefully", "You hear distant music and whispers.")
             .choice("Enter the forest", "deep_forest")
             .choice("Walk around the forest", "village")
             .scene("deep_forest", "You're surrounded by towering, magical trees.")
             .event("A fairy appears and offers guidance.")
             .choice("Follow the fairy", "fairy_grove")
             .choice("Explore on your own", "lost_path")
             .scene("village", "You arrive at a peaceful village near the forest.")
             .choice("Ask about the forest", "village_elder")
             .choice("Return to the forest", "forest_entrance")
             .scene("fairy_grove", "The fairy leads you to a beautiful grove.")
             .scene("lost_path", "You become lost in the magical wilderness.")
             .scene("village_elder", "The elder tells you ancient forest legends.")
             .start_at("forest_entrance")
             .build())
    
    # Analyze the story
    analyzer = NarrativeAnalyzer(story)
    summary = analyzer.get_narrative_summary()
    
    print("=== Narrative Builder Demo ===")
    print(f"Story: {story.title}")
    print(f"Summary: {summary}")
    print(f"\nStory paths: {len(analyzer.get_story_paths())}")
    print(f"Choice points: {len(analyzer.get_choice_points())}")
    
    # Test templates
    mystery = NarrativeTemplate.mystery_investigation().build()
    print(f"\nMystery template stats: {mystery.get_graph_stats()}") 