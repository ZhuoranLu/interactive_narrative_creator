import React, { useState } from 'react';
import { narrativeService } from '../services/narrativeService';

interface StoryNode {
  id: string;
  level: number;
  type: string;
  parent_node_id?: string;
  data: {
    scene: string;
    events?: Array<{
      id?: string;
      speaker: string;
      content: string;
      event_type: string;
    }>;
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
  onApiError?: (error: string) => void;
}

const StoryTreeGraph: React.FC<StoryTreeGraphProps> = ({ storyData, onNodeUpdate, onApiError }) => {
  const { nodes, connections } = storyData;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<StoryNode | null>(null);
  const [editFormData, setEditFormData] = useState<{
    scene: string;
    events: Array<{
      id?: string;
      speaker: string;
      content: string;
      event_type: string;
    }>;
    actions: Array<{
      id: string;
      description: string;
      is_key_action: boolean;
    }>;
  }>({ scene: '', events: [], actions: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

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

  const showSyncStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setSyncStatus({ message, type });
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleNodeClick = (nodeId: string) => {
    const node = nodes[nodeId];
    setSelectedNodeId(nodeId);
    setEditingNode(node);
    setEditFormData({
      scene: node.data.scene,
      events: node.data.events || [],
      actions: node.data.outgoing_actions.map(a => a.action)
    });
  };

  const handleCloseEdit = () => {
    setSelectedNodeId(null);
    setEditingNode(null);
    setEditFormData({ scene: '', events: [], actions: [] });
    setSyncStatus(null);
  };

  const handleSaveEdit = async () => {
    if (!editingNode || !selectedNodeId) return;

    setIsLoading(true);
    try {
      // Track new items created for proper state update
      const newEventIds: string[] = [];
      const newActionIds: string[] = [];
      
      // Prepare updates
      const updates: any = {};
      
      // Check if scene changed
      if (editFormData.scene !== editingNode.data.scene) {
        updates.scene = editFormData.scene;
      }

      // Handle new events (create them first)
      const newEvents = editFormData.events.filter(event => !event.id);
      for (const newEvent of newEvents) {
        try {
          const createdEvent = await narrativeService.addDialogueEvent(
            selectedNodeId,
            newEvent.speaker,
            newEvent.content
          );
          newEventIds.push(createdEvent.id);
          // Update the local form data with the new ID
          const eventIndex = editFormData.events.findIndex(e => e === newEvent);
          if (eventIndex !== -1) {
            editFormData.events[eventIndex].id = createdEvent.id;
          }
          showSyncStatus(`新对话已添加: ${newEvent.speaker}`, 'success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showSyncStatus(`创建事件失败: ${errorMessage}`, 'error');
        }
      }

      // Handle new actions (create them first)
      const newActions = editFormData.actions.filter(action => action.id.startsWith('action_'));
      for (const newAction of newActions) {
        try {
          const createdAction = await narrativeService.addActionToNode(
            selectedNodeId,
            newAction.description,
            newAction.is_key_action
          );
          newActionIds.push(createdAction.id);
          // Update the local form data with the new ID
          const actionIndex = editFormData.actions.findIndex(a => a === newAction);
          if (actionIndex !== -1) {
            editFormData.actions[actionIndex].id = createdAction.id;
          }
          showSyncStatus(`新动作已添加: ${newAction.description}`, 'success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showSyncStatus(`创建动作失败: ${errorMessage}`, 'error');
        }
      }

      // Prepare event updates for existing events
      const eventUpdates = [];
      const originalEvents = editingNode.data.events || [];
      
      for (let i = 0; i < editFormData.events.length; i++) {
        const formEvent = editFormData.events[i];
        const originalEvent = originalEvents.find(e => e.id === formEvent.id);
        
        // Only update existing events that have changed
        if (formEvent.id && originalEvent && !newEventIds.includes(formEvent.id)) {
          if (formEvent.content !== originalEvent.content || 
              formEvent.speaker !== originalEvent.speaker ||
              formEvent.event_type !== originalEvent.event_type) {
            eventUpdates.push({
              id: formEvent.id,
              updates: {
                content: formEvent.content,
                speaker: formEvent.speaker,
                event_type: formEvent.event_type
              }
            });
          }
        }
      }

      // Prepare action updates for existing actions
      const actionUpdates = [];
      const originalActions = editingNode.data.outgoing_actions.map(a => a.action);
      
      for (let i = 0; i < editFormData.actions.length; i++) {
        const formAction = editFormData.actions[i];
        const originalAction = originalActions.find(a => a.id === formAction.id);
        
        // Only update existing actions that have changed
        if (originalAction && !newActionIds.includes(formAction.id)) {
          if (formAction.description !== originalAction.description ||
              formAction.is_key_action !== originalAction.is_key_action) {
            actionUpdates.push({
              id: formAction.id,
              updates: {
                description: formAction.description,
                is_key_action: formAction.is_key_action
              }
            });
          }
        }
      }

      // Add to updates object
      if (eventUpdates.length > 0) {
        updates.events = eventUpdates;
      }
      if (actionUpdates.length > 0) {
        updates.actions = actionUpdates;
      }

      // Perform batch update if there are any updates
      if (Object.keys(updates).length > 0) {
        const result = await narrativeService.batchUpdateNode(selectedNodeId, updates);
        
        const successCount = result.results.filter(r => r.success).length;
        const totalCount = result.results.length;
        
        if (successCount === totalCount) {
          showSyncStatus(`✅ 所有更改已同步到数据库 (${successCount}/${totalCount})`, 'success');
        } else {
          showSyncStatus(`⚠️ 部分更改同步成功 (${successCount}/${totalCount})`, 'error');
        }
      }

      // Update local state with all changes (including new items)
      const updatedNode: StoryNode = {
        ...editingNode,
        data: {
          ...editingNode.data,
          scene: editFormData.scene,
          events: editFormData.events.filter(e => e.id), // Only keep events with IDs (all should have IDs now)
          outgoing_actions: editFormData.actions.map((action, index) => ({
            action: {
              id: action.id,
              description: action.description,
              is_key_action: action.is_key_action
            },
            target_node_id: editingNode.data.outgoing_actions[index]?.target_node_id || null
          }))
        }
      };

      // Update the parent component's state
      if (onNodeUpdate) {
        onNodeUpdate(selectedNodeId, updatedNode);
      }

      // Close the edit modal
      handleCloseEdit();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showSyncStatus(`❌ 同步失败: ${errorMessage}`, 'error');
      if (onApiError) {
        onApiError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
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

  const removeAction = async (actionIndex: number) => {
    const actionToRemove = editFormData.actions[actionIndex];
    
    try {
      setIsLoading(true);
      
      // If this is an existing action (has a proper ID), delete it from the database
      if (actionToRemove.id && !actionToRemove.id.startsWith('action_')) {
        await narrativeService.deleteAction(actionToRemove.id);
        showSyncStatus(`动作已删除: ${actionToRemove.description}`, 'success');
      }
      
      // Remove from local state
      const updatedActions = editFormData.actions.filter((_, index) => index !== actionIndex);
      setEditFormData({ ...editFormData, actions: updatedActions });
      
      // Also update the parent component immediately if this was a real action
      if (actionToRemove.id && !actionToRemove.id.startsWith('action_') && editingNode && selectedNodeId) {
        const updatedNode: StoryNode = {
          ...editingNode,
          data: {
            ...editingNode.data,
            outgoing_actions: editingNode.data.outgoing_actions.filter(
              actionBinding => actionBinding.action.id !== actionToRemove.id
            )
          }
        };
        
        if (onNodeUpdate) {
          onNodeUpdate(selectedNodeId, updatedNode);
        }
        
        // Update local editing state as well
        setEditingNode(updatedNode);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showSyncStatus(`删除动作失败: ${errorMessage}`, 'error');
      if (onApiError) {
        onApiError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addEvent = () => {
    const newEvent = {
      speaker: '',
      content: '',
      event_type: 'dialogue'
    };
    setEditFormData({
      ...editFormData,
      events: [...editFormData.events, newEvent]
    });
  };

  const updateEvent = (eventIndex: number, field: string, value: any) => {
    const updatedEvents = [...editFormData.events];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      [field]: value
    };
    setEditFormData({ ...editFormData, events: updatedEvents });
  };

  const removeEvent = async (eventIndex: number) => {
    const eventToRemove = editFormData.events[eventIndex];
    
    try {
      setIsLoading(true);
      
      // If this is an existing event (has an ID), delete it from the database
      if (eventToRemove.id) {
        await narrativeService.deleteEvent(eventToRemove.id);
        showSyncStatus(`事件已删除: ${eventToRemove.content}`, 'success');
      }
      
      // Remove from local state
      const updatedEvents = editFormData.events.filter((_, index) => index !== eventIndex);
      setEditFormData({ ...editFormData, events: updatedEvents });
      
      // Also update the parent component immediately if this was a real event
      if (eventToRemove.id && editingNode && selectedNodeId) {
        const updatedNode: StoryNode = {
          ...editingNode,
          data: {
            ...editingNode.data,
            events: (editingNode.data.events || []).filter(
              event => event.id !== eventToRemove.id
            )
          }
        };
        
        if (onNodeUpdate) {
          onNodeUpdate(selectedNodeId, updatedNode);
        }
        
        // Update local editing state as well
        setEditingNode(updatedNode);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showSyncStatus(`删除事件失败: ${errorMessage}`, 'error');
      if (onApiError) {
        onApiError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
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
                {truncateText(node.data.scene, 15)}
              </text>
            </g>
          );
        })}
        
        {/* Arrow marker for connections */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>
      </svg>

      {/* Edit Modal */}
      {editingNode && (
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseEdit}
        >
          <div
            style={{
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '20px',
              width: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: '0', marginBottom: '20px', color: '#333' }}>
              编辑节点 - {editingNode.id}
              {isLoading && <span style={{ marginLeft: '10px', color: '#666' }}>同步中...</span>}
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Scene:</label>
              <textarea
                value={editFormData.scene}
                onChange={(e) => setEditFormData({ ...editFormData, scene: e.target.value })}
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
                placeholder="Scene description..."
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold' }}>Events:</label>
                <button
                  onClick={addEvent}
                  disabled={isLoading}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  + Add Event
                </button>
              </div>

              {editFormData.events.map((event, index) => (
                <div key={event.id || index} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={event.speaker}
                      onChange={(e) => updateEvent(index, 'speaker', e.target.value)}
                      placeholder="Speaker..."
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        marginRight: '10px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    />
                    <input
                      type="text"
                      value={event.content}
                      onChange={(e) => updateEvent(index, 'content', e.target.value)}
                      placeholder="Content..."
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        marginRight: '10px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    />
                    <select
                      value={event.event_type}
                      onChange={(e) => updateEvent(index, 'event_type', e.target.value)}
                      disabled={isLoading}
                      style={{
                        padding: '6px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        marginRight: '10px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    >
                      <option value="dialogue">Dialogue</option>
                      <option value="action">Action</option>
                      <option value="thought">Thought</option>
                      <option value="description">Description</option>
                    </select>
                    <button
                      onClick={() => removeEvent(index)}
                      disabled={isLoading}
                      style={{
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold' }}>Actions:</label>
                <button
                  onClick={addAction}
                  disabled={isLoading}
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  + Add Action
                </button>
              </div>

              {editFormData.actions.map((action, index) => (
                <div key={action.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={action.description}
                      onChange={(e) => updateAction(index, 'description', e.target.value)}
                      placeholder="Action description..."
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        marginRight: '10px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    />
                    <label style={{ marginRight: '10px', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={action.is_key_action}
                        onChange={(e) => updateAction(index, 'is_key_action', e.target.checked)}
                        disabled={isLoading}
                        style={{ marginRight: '5px' }}
                      />
                      Key Action
                    </label>
                    <button
                      onClick={() => removeAction(index)}
                      disabled={isLoading}
                      style={{
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleCloseEdit}
                disabled={isLoading}
                style={{
                  background: '#ccc',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Saving & Syncing...' : 'Save & Sync to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Message */}
      {syncStatus && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: syncStatus.type === 'success' ? '#4CAF50' : syncStatus.type === 'error' ? '#F44336' : '#2196F3',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            zIndex: 1001,
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {syncStatus.message}
        </div>
      )}
    </div>
  );
};

export default StoryTreeGraph; 