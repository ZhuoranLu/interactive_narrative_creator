## given a json file, build a graph

import json
from plot_graph import NarrativeGraph
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from utils import *

example_json = {
    "scenes": [
        {
            "id": "scene_1",
            "description": "This is the introduction scene",
            "events": [
                {
                    "id": "event_1",
                    "description": "This is the first event"
                },
                {
                    "id": "event_2",
                    "description": "This is the second event"
                }
            ],
            "actions": [
                {
                    "description": "This is the first action",
                    "next_scene": "scene_2"
                },
                {
                    "description": "This is the second action",
                    "next_scene": "scene_3"

                }
            ],
        },
        {
            "id": "scene_2",
            "description": "This is the second scene",
            "events": [],
            "actions": [],
        },
        {
            "id": "scene_3",
            "description": "This is the third scene",
            "events": [],
            "actions": [],
        }
    ]
}



def build_graph(plot_data):
    graph = NarrativeGraph()
    for scene in plot_data['scenes']:
        node = graph.create_node(scene['description'], scene['id'])
        for event in scene['events']:
            graph.attach_event(node, event['description'])
    for scene in plot_data['scenes']:
        node_from = graph.get_node(scene['id'])
        for action in scene['actions']:
            node_to = graph.get_node(action['next_scene'])
            print(action['next_scene'], graph.get_node(action['next_scene']))
            created_action = graph.create_action(action['description'],True)
            graph.bind_action(node_from=node_from, action=created_action, node_to=node_to)
    return graph


def main():
    # plot_data = json_load_helper('plot/plot.json')
    plot_data = example_json
    graph = build_graph(plot_data)
    (graph.visualize())
    # print(graph.get_node("scene_2"))

if __name__ == '__main__':
    main()
