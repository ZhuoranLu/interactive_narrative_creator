import React, { useState } from 'react';

interface StoryNode {
  id: string;
  level: number;
  type: string;
  parent_node_id?: string;
  data: {
    scene: string;
    outgoing_actions: Array<{
      action: {
        id: string;
        description: string;
        is_key_action: boolean;
      };
      target_node_id: string | null;
    }>;
  };
}

interface StoryTree {
  nodes: Record<string, StoryNode>;
  connections: Array<{
    from_node_id: string;
    to_node_id: string;
    action_id: string;
    action_description: string;
  }>;
  root_node_id: string;
}

interface StoryTreeGraphProps {
  storyData: StoryTree;
  onNodeUpdate?: (nodeId: string, updatedNode: StoryNode) => void;
}

const StoryTreeGraph: React.FC<StoryTreeGraphProps> = ({ storyData, onNodeUpdate }) => {
  const { nodes, connections } = storyData;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<StoryNode | null>(null);
  const [editFormData, setEditFormData] = useState<{
    scene: string;
    actions: Array<{
      id: string;
      description: string;
      is_key_action: boolean;
    }>;
  }>({ scene: '', actions: [] });
  
  // Calculate node positions
  const getNodePosition = (nodeId: string) => {
    const node = nodes[nodeId];
    const level = node.level;
    
    // Get nodes at the same level
    const nodesAtLevel = Object.values(nodes).filter(n => n.level === level);
    const indexAtLevel = nodesAtLevel.findIndex(n => n.id === nodeId);
    
    const x = 150 + level * 300;
    const y = 100 + indexAtLevel * 200;
    
    return { x, y };
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleNodeClick = (nodeId: string) => {
    const node = nodes[nodeId];
    setSelectedNodeId(nodeId);
    setEditingNode(node);
    setEditFormData({
      scene: node.data.scene,
      actions: node.data.outgoing_actions.map(a => a.action)
    });
  };

  const handleCloseEdit = () => {
    setSelectedNodeId(null);
    setEditingNode(null);
    setEditFormData({ scene: '', actions: [] });
  };

  const handleSaveEdit = () => {
    if (!editingNode || !selectedNodeId) return;

    const updatedNode: StoryNode = {
      ...editingNode,
      data: {
        ...editingNode.data,
        scene: editFormData.scene,
        outgoing_actions: editFormData.actions.map((action, index) => ({
          action,
          target_node_id: editingNode.data.outgoing_actions[index]?.target_node_id || null
        }))
      }
    };

    if (onNodeUpdate) {
      onNodeUpdate(selectedNodeId, updatedNode);
    }

    handleCloseEdit();
  };

  const updateAction = (actionIndex: number, field: string, value: any) => {
    const updatedActions = [...editFormData.actions];
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      [field]: value
    };
    setEditFormData({ ...editFormData, actions: updatedActions });
  };

  const addAction = () => {
    const newAction = {
      id: `action_${Date.now()}`,
      description: '',
      is_key_action: false
    };
    setEditFormData({
      ...editFormData,
      actions: [...editFormData.actions, newAction]
    });
  };

  const removeAction = (actionIndex: number) => {
    const updatedActions = editFormData.actions.filter((_, index) => index !== actionIndex);
    setEditFormData({ ...editFormData, actions: updatedActions });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px', overflow: 'auto', border: '1px solid #ccc' }}>
      <svg width="1200" height="800" style={{ background: '#f9f9f9' }}>
        {/* Render connections */}
        {connections.map((connection, index) => {
          const fromPos = getNodePosition(connection.from_node_id);
          const toPos = getNodePosition(connection.to_node_id);
          
          return (
            <g key={index}>
              <line
                x1={fromPos.x + 60}
                y1={fromPos.y + 30}
                x2={toPos.x}
                y2={toPos.y + 30}
                stroke="#666"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(fromPos.x + toPos.x) / 2}
                y={(fromPos.y + toPos.y) / 2 - 10}
                fontSize="10"
                fill="#555"
                textAnchor="middle"
              >
                {truncateText(connection.action_description, 30)}
              </text>
            </g>
          );
        })}
        
        {/* Render nodes */}
        {Object.entries(nodes).map(([nodeId, node]) => {
          const pos = getNodePosition(nodeId);
          const isRoot = node.type === 'root' || node.level === 0;
          const isSelected = selectedNodeId === nodeId;
          
          // Determine node color based on type and level
          let nodeColor = '#FF9800'; // default orange
          if (isRoot) {
            nodeColor = '#4CAF50'; // green for root
          } else if (node.level === 1 || node.type === 'child') {
            nodeColor = '#2196F3'; // blue for level 1/child
          } else if (node.level === 2 || node.type === 'grandchild') {
            nodeColor = '#9C27B0'; // purple for level 2/grandchild
          } else if (node.level >= 3) {
            nodeColor = '#FF5722'; // red for deeper levels
          }
          
          return (
            <g key={nodeId} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(nodeId)}>
              <rect
                x={pos.x}
                y={pos.y}
                width="120"
                height="60"
                fill={nodeColor}
                stroke={isSelected ? '#FF5722' : '#333'}
                strokeWidth={isSelected ? '4' : '2'}
                rx="5"
              />
              <text
                x={pos.x + 60}
                y={pos.y + 20}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
              >
                {(node.type || 'NODE').toUpperCase()}
              </text>
              <text
                x={pos.x + 60}
                y={pos.y + 35}
                textAnchor="middle"
                fontSize="10"
                fill="white"
              >
                Level {node.level}
              </text>
              <text
                x={pos.x + 60}
                y={pos.y + 50}
                textAnchor="middle"
                fontSize="9"
                fill="white"
              >
                {truncateText(node.data.scene, 20)}
              </text>
            </g>
          );
        })}
        
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#666"
            />
          </marker>
        </defs>
      </svg>

      {/* Floating Edit Window */}
      {editingNode && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            border: '2px solid #333',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000,
            minWidth: '400px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Edit Node: {editingNode.id}</h3>
            <button
              onClick={handleCloseEdit}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Scene Description:
            </label>
            <textarea
              value={editFormData.scene}
              onChange={(e) => setEditFormData({ ...editFormData, scene: e.target.value })}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
              placeholder="Enter scene description..."
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold' }}>Actions:</label>
              <button
                onClick={addAction}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                + Add Action
              </button>
            </div>

            {editFormData.actions.map((action, index) => (
              <div key={action.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={action.description}
                    onChange={(e) => updateAction(index, 'description', e.target.value)}
                    placeholder="Action description..."
                    style={{
                      flex: 1,
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginRight: '10px'
                    }}
                  />
                  <button
                    onClick={() => removeAction(index)}
                    style={{
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={action.is_key_action}
                    onChange={(e) => updateAction(index, 'is_key_action', e.target.checked)}
                    style={{ marginRight: '6px' }}
                  />
                  Key Action
                </label>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={handleCloseEdit}
              style={{
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {editingNode && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={handleCloseEdit}
        />
      )}
    </div>
  );
};

export default StoryTreeGraph; 