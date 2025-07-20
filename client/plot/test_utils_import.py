#!/usr/bin/env python3
"""
Test script demonstrating how to import from utils directory
and compare the two narrative graph implementations.
"""

import sys
import os

# Add the utils directory to Python path
utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'utils')
sys.path.insert(0, utils_path)

print(f"Added to sys.path: {utils_path}")
print(f"Utils path exists: {os.path.exists(utils_path)}")

try:
    # Import from utils directory
    from narrative_graph import NarrativeGraph as UtilsNarrativeGraph
    from narrative_builder import NarrativeBuilder, NarrativeTemplate
    print("✅ Successfully imported from utils!")
    
    # Import from current plot directory
    from plot_graph import NarrativeGraph as PlotNarrativeGraph
    print("✅ Successfully imported from plot!")
    
    print("\n" + "=" * 60)
    print("COMPARISON: Utils vs Plot Implementations")
    print("=" * 60)
    
    # Test utils implementation with NarrativeBuilder
    print("\n🔧 Testing Utils Implementation (with Builder):")
    story = (NarrativeBuilder("Utils Test Story")
             .scene("start", "You wake up in a mysterious place")
             .event("Strange sounds echo around you")
             .action("Look around", "You see ancient symbols on the walls")
             .choice("Go left", "left_path")
             .choice("Go right", "right_path")
             .scene("left_path", "You find a hidden chamber")
             .scene("right_path", "You discover an old library")
             .start_at("start")
             .build())
    
    print(f"  Story title: {story.title}")
    print(f"  Nodes: {len(story.nodes)}")
    print(f"  Stats: {story.get_graph_stats()}")
    
    # Test plot implementation
    print("\n⚙️  Testing Plot Implementation (basic API):")
    plot_graph = PlotNarrativeGraph("Plot Test Story")
    
    start_node = plot_graph.create_node("You wake up in a mysterious place")
    left_node = plot_graph.create_node("You find a hidden chamber")
    right_node = plot_graph.create_node("You discover an old library")
    
    plot_graph.attach_event(start_node, "Strange sounds echo around you")
    
    left_action = plot_graph.create_action("Go left", is_key_action=True)
    right_action = plot_graph.create_action("Go right", is_key_action=True)
    
    plot_graph.bind_action(start_node, left_action, node_to=left_node)
    plot_graph.bind_action(start_node, right_action, node_to=right_node)
    
    print(f"  Story title: {plot_graph.title}")
    print(f"  Nodes: {len(plot_graph.nodes)}")
    print(f"  Stats: {plot_graph.get_graph_stats()}")
    
    print("\n" + "=" * 60)
    print("KEY DIFFERENCES")
    print("=" * 60)
    print("📦 Utils Implementation:")
    print("  ✅ Includes NarrativeBuilder with fluent API")
    print("  ✅ Includes predefined templates")
    print("  ✅ Includes NarrativeAnalyzer for visualization")
    print("  ✅ Has export to Mermaid/DOT formats")
    print("  ✅ More advanced metadata support")
    
    print("\n📦 Plot Implementation:")
    print("  ✅ Core functionality with basic API")
    print("  ✅ Direct node/action/event manipulation")
    print("  ✅ Essential graph operations")
    print("  ✅ JSON serialization")
    print("  ✅ Graph validation")
    
    # Test template from utils
    print("\n🎨 Testing Utils Template:")
    mystery = NarrativeTemplate.mystery_investigation().build()
    print(f"  Template story: {mystery.title}")
    print(f"  Template nodes: {len(mystery.nodes)}")
    
    print("\n✅ All imports and tests successful!")
    
except ImportError as e:
    print(f"❌ Import failed: {e}")
    print(f"Current sys.path: {sys.path}")
    print(f"Files in utils directory:")
    if os.path.exists(utils_path):
        for file in os.listdir(utils_path):
            print(f"  - {file}")
    else:
        print("  Utils directory not found!")

except Exception as e:
    print(f"❌ Error during testing: {e}")
    import traceback
    traceback.print_exc()

if __name__ == "__main__":
    print("🧪 Utils Import Test Complete") 