import React, { useState } from 'react';
import { narrativeService } from '../services/narrativeService';
import StoryHistoryPanel from './StoryHistoryPanel';

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
  projectId?: string;  // Add projectId for history functionality
  onNodeUpdate?: (nodeId: string, updatedNode: StoryNode) => void;
  onApiError?: (error: string) => void;
  onStoryReload?: () => void;  // Callback to reload entire story after rollback
}

// Add interface for context menu
interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

const StoryTreeGraph: React.FC<StoryTreeGraphProps> = ({ 
  storyData, 
  projectId,
  onNodeUpdate, 
  onApiError,
  onStoryReload 
}) => {
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
  const [showHistory, setShowHistory] = useState(false);
  
  // Add state for context menu and tooltip
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null
  });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });
  
  // Add state for node hover effect
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Add state for dynamic layout and animations
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [animationPhase, setAnimationPhase] = useState(0);
  
  // Add state for action dot hover
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(null);

  // Add state for drag and drop functionality
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  
  // Grid settings for snap-to-grid functionality
  const GRID_SIZE = 25; // Grid cell size for snapping
  const SNAP_THRESHOLD = 12; // Distance threshold for snapping

  // Snap to grid function
  const snapToGrid = (value: number, gridSize: number = GRID_SIZE, threshold: number = SNAP_THRESHOLD) => {
    const remainder = value % gridSize;
    if (remainder < threshold) {
      return value - remainder;
    } else if (remainder > gridSize - threshold) {
      return value + (gridSize - remainder);
    }
    return value;
  };

  // Initialize node positions when story data changes
  React.useEffect(() => {
    const initialPositions: Record<string, { x: number; y: number }> = {};
    Object.keys(nodes).forEach(nodeId => {
      if (!nodePositions[nodeId]) {
        const defaultPos = getDefaultNodePosition(nodeId);
        initialPositions[nodeId] = defaultPos;
      }
    });
    
    if (Object.keys(initialPositions).length > 0) {
      setNodePositions(prev => ({ ...prev, ...initialPositions }));
    }
  }, [nodes]);

  // Calculate default node positions with better spacing (used for initialization)
  const getDefaultNodePosition = (nodeId: string) => {
    const node = nodes[nodeId];
    const level = node.level;
    
    // Get nodes at the same level
    const nodesAtLevel = Object.values(nodes).filter(n => n.level === level);
    const indexAtLevel = nodesAtLevel.findIndex(n => n.id === nodeId);
    
    // Dynamic spacing based on content and level
    const baseSpacing = 250;
    const levelSpacing = Math.max(300, baseSpacing + (level * 50));
    const verticalSpacing = Math.max(150, 120 + (nodesAtLevel.length > 3 ? 30 : 0));
    
    // Center nodes vertically for better balance
    const totalHeight = (nodesAtLevel.length - 1) * verticalSpacing;
    const startY = (viewBox.height - totalHeight) / 2;
    
    const x = 150 + level * levelSpacing;
    const y = startY + indexAtLevel * verticalSpacing;
    
    return { x, y };
  };

  // Get node position (either custom position or default)
  const getNodePosition = (nodeId: string) => {
    return nodePositions[nodeId] || getDefaultNodePosition(nodeId);
  };

  // Handle mouse down on node (start dragging)
  const handleMouseDown = (nodeId: string, event: React.MouseEvent) => {
    // Don't start drag if right-clicking or if context menu is visible
    if (event.button !== 0 || contextMenu.visible) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const svgRect = (event.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
    
    const nodePos = getNodePosition(nodeId);
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: mouseX - nodePos.x,
      y: mouseY - nodePos.y
    });
    setLastMousePosition({ x: event.clientX, y: event.clientY });
    
    // Add cursor style
    document.body.style.cursor = 'grabbing';
  };

  // Handle mouse move (during dragging)
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !draggedNodeId) return;
    
    event.preventDefault();
    const svgRect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;
    
    let newX = mouseX - dragOffset.x;
    let newY = mouseY - dragOffset.y;
    
    // Apply grid snapping if close enough
    const snappedX = snapToGrid(newX);
    const snappedY = snapToGrid(newY);
    
    // Use snapped position if within threshold
    if (Math.abs(newX - snappedX) < SNAP_THRESHOLD) {
      newX = snappedX;
    }
    if (Math.abs(newY - snappedY) < SNAP_THRESHOLD) {
      newY = snappedY;
    }
    
    // Constrain to viewBox bounds with some padding
    const constrainedX = Math.max(50, Math.min(viewBox.width - 200, newX));
    const constrainedY = Math.max(30, Math.min(viewBox.height - 100, newY));
    
    setNodePositions(prev => ({
      ...prev,
      [draggedNodeId]: { x: constrainedX, y: constrainedY }
    }));
    
    setLastMousePosition({ x: event.clientX, y: event.clientY });
  };

  // Handle mouse up (end dragging)
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedNodeId(null);
      setDragOffset({ x: 0, y: 0 });
      
      // Reset cursor
      document.body.style.cursor = 'default';
    }
  };

  // Add global mouse up listener
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Enhanced truncate function with smart word breaking
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    
    // Try to break at word boundaries
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.6) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  };

  // Add animation cycle effect for connection lines only
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 360);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate curved path for connections
  const getCurvedPath = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => {
    const fromX = fromPos.x + 120;
    const fromY = fromPos.y + 30;
    const toX = toPos.x;
    const toY = toPos.y + 30;
    
    // Calculate control points for smooth curve
    const midX = (fromX + toX) / 2;
    const controlPoint1X = fromX + (midX - fromX) * 0.7;
    const controlPoint2X = toX - (toX - midX) * 0.7;
    
    return `M ${fromX} ${fromY} C ${controlPoint1X} ${fromY}, ${controlPoint2X} ${toY}, ${toX} ${toY}`;
  };

  // Dynamic node sizing based on content
  const getNodeDimensions = (node: StoryNode) => {
    const baseWidth = 120;
    const baseHeight = 60;
    
    // Adjust size based on content length and importance
    const contentLength = node.data.scene.length;
    const hasEvents = (node.data.events?.length || 0) > 0;
    const actionCount = node.data.outgoing_actions.length;
    
    const widthMultiplier = 1 + Math.min(contentLength / 500, 0.3);
    const heightMultiplier = 1 + (hasEvents ? 0.2 : 0) + (actionCount > 2 ? 0.1 : 0);
    
    return {
      width: Math.max(baseWidth, baseWidth * widthMultiplier),
      height: Math.max(baseHeight, baseHeight * heightMultiplier)
    };
  };

  const showSyncStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setSyncStatus({ message, type });
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Hide context menu when clicking anywhere (but not during drag)
  const handleClickOutside = () => {
    if (!isDragging) {
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
      setTooltip({ visible: false, x: 0, y: 0, content: '' });
    }
  };

  // Handle right-click on node
  const handleNodeRightClick = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId: nodeId
    });
  };

  // Context menu actions
  const handleRegenerateScene = async (nodeId: string) => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    setIsLoading(true);
    
    try {
      const node = nodes[nodeId];
      
      // Call the narrative API directly for regeneration
      const payload = {
        request_type: 'regenerate_part',
        context: { 
          part_type: 'scene',
          current_content: node.data.scene 
        },
        current_node: node
      };
      
      const response = await fetch('http://localhost:8000/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const updatedNode = { ...node, data: { ...node.data, scene: result.data.scene } };
        if (onNodeUpdate) {
          onNodeUpdate(nodeId, updatedNode);
        }
        showSyncStatus('✅ 场景已重新生成', 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate scene';
      showSyncStatus(`❌ 重新生成失败: ${errorMessage}`, 'error');
      if (onApiError) {
        onApiError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueStory = async (nodeId: string) => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    setIsLoading(true);
    
    try {
      const node = nodes[nodeId];
      
      // Find an available action to continue with
      let selectedAction = null;
      if (node.data.outgoing_actions.length > 0) {
        selectedAction = node.data.outgoing_actions[0].action;
      }
      
      const payload = {
        request_type: 'generate_next_node',
        context: { 
          selected_action: selectedAction,
          world_state: {} 
        },
        current_node: node
      };
      
      const response = await fetch('http://localhost:8000/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showSyncStatus('✅ 故事已继续，新节点已生成', 'success');
        if (onStoryReload) {
          onStoryReload(); // Reload to show new node
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to continue story';
      showSyncStatus(`❌ 继续故事失败: ${errorMessage}`, 'error');
      if (onApiError) {
        onApiError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateActions = async (nodeId: string) => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    setIsLoading(true);
    
    try {
      const node = nodes[nodeId];
      
      const payload = {
        request_type: 'regenerate_part',
        context: { 
          part_type: 'actions'
        },
        current_node: node
      };
      
      const response = await fetch('http://localhost:8000/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const updatedNode = { 
          ...node, 
          data: { 
            ...node.data, 
            outgoing_actions: result.data.outgoing_actions || node.data.outgoing_actions
          }
        };
        if (onNodeUpdate) {
          onNodeUpdate(nodeId, updatedNode);
        }
        showSyncStatus('✅ 动作选项已重新生成', 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate actions';
      showSyncStatus(`❌ 重新生成动作失败: ${errorMessage}`, 'error');
      if (onApiError) {
        onApiError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createSnapshot = async (operationType: string, operationDescription: string, affectedNodeId?: string) => {
    if (!projectId) return;
    
    try {
      await narrativeService.createSnapshot(projectId, {
        operation_type: operationType,
        operation_description: operationDescription,
        affected_node_id: affectedNodeId
      });
      console.log('Snapshot created:', operationType, operationDescription);
    } catch (error) {
      console.warn('Failed to create snapshot:', error);
      // Don't block the main operation if snapshot fails
    }
  };

  const handleRollback = async (snapshotId: string) => {
    if (onStoryReload) {
      onStoryReload(); // Reload the entire story data
    }
    showSyncStatus('✅ 故事已回滚到历史状态', 'success');
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
      // Create snapshot before making changes
      const operationDescription = `编辑节点: ${editingNode.data.scene.substring(0, 50)}${editingNode.data.scene.length > 50 ? '...' : ''}`;
      await createSnapshot('edit_operation', operationDescription, selectedNodeId);
      
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
      
      // Create snapshot before deletion
      if (actionToRemove.id && !actionToRemove.id.startsWith('action_') && selectedNodeId) {
        await createSnapshot('delete_action', `删除动作: ${actionToRemove.description}`, selectedNodeId);
      }
      
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
      
      // Create snapshot before deletion
      if (eventToRemove.id && selectedNodeId) {
        await createSnapshot('delete_event', `删除事件: ${eventToRemove.content.substring(0, 30)}${eventToRemove.content.length > 30 ? '...' : ''}`, selectedNodeId);
      }
      
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
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        minHeight: '400px',
        height: 'auto',
        maxHeight: '80vh',
        overflow: 'auto', 
        border: '1px solid #E8E8E8',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}
      onClick={handleClickOutside}
    >
      {/* History Controls - Made more prominent */}
      {projectId && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            gap: '12px',
            zIndex: 100
          }}
        >
          {/* Quick Rollback Button */}
          <button
            onClick={async () => {
              if (!projectId) return;
              
              try {
                console.log('Fetching project history...');
                const historyData = await narrativeService.getProjectHistory(projectId);
                console.log('History data:', historyData);
                
                if (historyData.history && historyData.history.length > 1) {
                  const lastSnapshot = historyData.history[1]; // Skip current state
                  console.log('Last snapshot:', lastSnapshot);
                  
                  const confirmRollback = window.confirm(
                    `🔄 快速回滚到上一个状态？\n\n"${lastSnapshot.operation_description}"\n\n这将撤销最近的更改！`
                  );
                  
                  if (confirmRollback) {
                    console.log('Starting rollback to snapshot:', lastSnapshot.id);
                    showSyncStatus('🔄 正在回滚...', 'info');
                    
                    await narrativeService.rollbackToSnapshot(projectId, { snapshot_id: lastSnapshot.id });
                    console.log('Rollback successful, reloading story...');
                    
                    if (onStoryReload) {
                      onStoryReload();
                    }
                    showSyncStatus('✅ 已回滚到上一状态', 'success');
                  }
                } else {
                  console.log('No history available for rollback');
                  showSyncStatus('ℹ️ 没有可回滚的历史状态', 'info');
                }
              } catch (error) {
                console.error('Rollback error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
                showSyncStatus(`❌ 回滚失败: ${errorMessage}`, 'error');
                if (onApiError) {
                  onApiError(`回滚操作失败: ${errorMessage}`);
                }
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #FEB2B2 0%, #F56565 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(245, 101, 101, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title="快速回滚到上一个编辑状态"
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(245, 101, 101, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(245, 101, 101, 0.3)';
            }}
          >
            🔄 撤销
          </button>
          
          {/* History Panel Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: showHistory 
                ? 'linear-gradient(135deg, #9AE6B4 0%, #68D391 100%)' 
                : 'linear-gradient(135deg, #90CDF4 0%, #63B3ED 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: showHistory 
                ? '0 4px 12px rgba(104, 211, 145, 0.3)' 
                : '0 4px 12px rgba(99, 179, 237, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title={showHistory ? "关闭编辑历史面板" : "打开编辑历史面板，查看所有历史状态"}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = showHistory 
                ? '0 6px 16px rgba(104, 211, 145, 0.4)' 
                : '0 6px 16px rgba(99, 179, 237, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = showHistory 
                ? '0 4px 12px rgba(104, 211, 145, 0.3)' 
                : '0 4px 12px rgba(99, 179, 237, 0.3)';
            }}
          >
            {showHistory ? '📚 关闭历史' : '📚 编辑历史'}
          </button>
        </div>
      )}

      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 1200 800" 
        preserveAspectRatio="xMidYMid meet"
        style={{ 
          background: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)',
          minHeight: '400px',
          maxHeight: '600px',
          borderRadius: '12px',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Add background pattern */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1" opacity="0.4"/>
          </pattern>
          
          {/* Enhanced arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="8"
            refX="12"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 12 4, 0 8" fill="#A0AEC0" />
          </marker>
          
          {/* Glow filter for selected nodes */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Pulse animation filter */}
          <filter id="pulse">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Render connections with smooth curves */}
        {connections.map((connection, index) => {
          const fromPos = getNodePosition(connection.from_node_id);
          const toPos = getNodePosition(connection.to_node_id);
          const curvePath = getCurvedPath(fromPos, toPos);
          
          // Calculate midpoint for action dot on curve
          const midX = (fromPos.x + 120 + toPos.x) / 2;
          const midY = (fromPos.y + 30 + toPos.y + 30) / 2;
          
          const isActionHovered = hoveredActionIndex === index;
          
          return (
            <g key={index}>
              {/* Connection path with animation */}
              <path
                d={curvePath}
                stroke="#A0AEC0"
                strokeWidth="3"
                fill="none"
                markerEnd="url(#arrowhead)"
                style={{
                  strokeDasharray: '10,5',
                  strokeDashoffset: animationPhase * 0.5,
                  transition: 'all 0.3s ease-in-out',
                  opacity: 0.7
                }}
              />
              
              {/* Action circle dot with hover scale effect */}
              <circle
                cx={midX}
                cy={midY}
                r={isActionHovered ? "14" : "10"}
                fill={isActionHovered ? "#FBD38D" : "#F6AD55"}
                stroke="#FFFFFF"
                strokeWidth="3"
                style={{ 
                  cursor: 'pointer',
                  filter: isActionHovered 
                    ? 'drop-shadow(0 4px 12px rgba(246, 173, 85, 0.4))' 
                    : 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  setHoveredActionIndex(index);
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY - 30,
                    content: connection.action_description
                  });
                }}
                onMouseLeave={() => {
                  setHoveredActionIndex(null);
                  setTooltip({ visible: false, x: 0, y: 0, content: '' });
                }}
                onMouseMove={(e) => {
                  setTooltip(prev => ({
                    ...prev,
                    x: e.clientX,
                    y: e.clientY - 30
                  }));
                }}
              />
            </g>
          );
        })}
        
        {/* Render nodes with enhanced animations */}
        {Object.entries(nodes).map(([nodeId, node], index) => {
          const pos = getNodePosition(nodeId);
          const dimensions = getNodeDimensions(node);
          const isRoot = node.type === 'root' || node.level === 0;
          const isSelected = selectedNodeId === nodeId;
          const isHovered = hoveredNodeId === nodeId;
          
          // Modern macaron color scheme with low saturation
          let nodeColor = '#F6AD55'; // soft orange
          let nodeColorHover = '#FBD38D'; // lighter orange
          
          if (isRoot) {
            nodeColor = '#68D391'; // soft green
            nodeColorHover = '#9AE6B4'; // lighter green
          } else if (node.level === 1 || node.type === 'child') {
            nodeColor = '#63B3ED'; // soft blue
            nodeColorHover = '#90CDF4'; // lighter blue
          } else if (node.level === 2 || node.type === 'grandchild') {
            nodeColor = '#B794F6'; // soft purple
            nodeColorHover = '#D6BCFA'; // lighter purple
          } else if (node.level >= 3) {
            nodeColor = '#F687B3'; // soft pink
            nodeColorHover = '#FBB6CE'; // lighter pink
          }
          
          // Apply hover effect
          let displayColor = nodeColor;
          if (isHovered && !isSelected) {
            displayColor = nodeColorHover;
          }
          
          // Animation delay based on level and index
          const animationDelay = node.level * 0.2 + index * 0.1;
          
          return (
            <g 
              key={nodeId} 
              style={{ 
                cursor: isDragging && draggedNodeId === nodeId ? 'grabbing' : 'grab',
                transition: isDragging && draggedNodeId === nodeId ? 'none' : 'all 0.2s ease'
              }} 
              onClick={() => !isDragging && handleNodeClick(nodeId)}
              onContextMenu={(e) => {
                if (!isDragging) {
                  handleNodeRightClick(e, nodeId);
                }
              }}
              onMouseEnter={() => !isDragging && setHoveredNodeId(nodeId)}
              onMouseLeave={() => !isDragging && setHoveredNodeId(null)}
              onMouseDown={(e) => handleMouseDown(nodeId, e)}
            >
              {/* Node background with gradient */}
              <rect
                x={pos.x}
                y={pos.y}
                width={dimensions.width}
                height={dimensions.height}
                fill={`url(#nodeGradient-${nodeId})`}
                stroke={isSelected ? '#F56565' : isHovered ? '#4A5568' : '#CBD5E0'}
                strokeWidth={isSelected ? '4' : isHovered ? '3' : '2'}
                rx="12"
                style={{
                  filter: isSelected 
                    ? 'drop-shadow(0 8px 24px rgba(245, 101, 101, 0.3))' 
                    : isHovered 
                    ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.1))' 
                    : 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transformOrigin: `${pos.x + dimensions.width/2}px ${pos.y + dimensions.height/2}px`
                }}
              >
                {/* Entrance animation */}
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="0;1.1;1"
                  dur="0.6s"
                  begin={`${animationDelay}s`}
                  fill="freeze"
                />
              </rect>
              
              {/* Node gradient definition */}
              <defs>
                <linearGradient id={`nodeGradient-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={displayColor} />
                  <stop offset="100%" stopColor={displayColor} stopOpacity="0.8" />
                </linearGradient>
              </defs>
              
              {/* Node type text */}
              <text
                x={pos.x + dimensions.width/2}
                y={pos.y + 20}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {(node.type || 'NODE').toUpperCase()}
              </text>
              
              {/* Level indicator */}
              <text
                x={pos.x + dimensions.width/2}
                y={pos.y + 35}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                style={{
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  opacity: 0.9
                }}
              >
                Level {node.level}
              </text>
              
              {/* Scene preview */}
              <text
                x={pos.x + dimensions.width/2}
                y={pos.y + 50}
                textAnchor="middle"
                fontSize="9"
                fill="white"
                style={{
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  opacity: 0.8
                }}
              >
                {truncateText(node.data.scene, Math.floor(dimensions.width / 8))}
              </text>
              
              {/* Activity indicators */}
              {node.data.events && node.data.events.length > 0 && (
                <circle
                  cx={pos.x + dimensions.width - 15}
                  cy={pos.y + 15}
                  r="5"
                  fill="#68D391"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                >
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                  <title>{`${node.data.events.length} events`}</title>
                </circle>
              )}
              
              {node.data.outgoing_actions.length > 0 && (
                <circle
                  cx={pos.x + dimensions.width - 15}
                  cy={pos.y + dimensions.height - 15}
                  r="5"
                  fill="#F6AD55"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                >
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
                  <title>{`${node.data.outgoing_actions.length} actions`}</title>
                </circle>
              )}
            </g>
          );
        })}
        
        {/* Add CSS animations */}
        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
            }
            
            @keyframes scaleIn {
              0% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.1); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
            
            .action-dot-hover {
              transform: scale(1.4);
              filter: drop-shadow(0 4px 12px rgba(255, 152, 0, 0.6));
            }
            
            .node-entrance {
              animation: scaleIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            
            /* Drag and drop styles */
            svg * {
              user-select: none;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
            }
            
            .node-dragging {
              filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3)) brightness(1.1);
              z-index: 1000;
              cursor: grabbing !important;
            }
            
            .node-drag-preview {
              opacity: 0.8;
              transform-origin: center;
              transition: none !important;
            }
            
            /* Smooth transitions for non-dragging nodes */
            .node-idle {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
          `}
        </style>
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: 'rgba(45, 55, 72, 0.95)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '500',
            zIndex: 2000,
            pointerEvents: 'none',
            maxWidth: '300px',
            wordWrap: 'break-word',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#FFFFFF',
            border: '1px solid #E8E8E8',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 1500,
            padding: '8px 0',
            minWidth: '200px',
            backdropFilter: 'blur(10px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#2D3748',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#F7FAFC';
              (e.target as HTMLElement).style.color = '#1A202C';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#2D3748';
            }}
            onClick={() => contextMenu.nodeId && handleRegenerateScene(contextMenu.nodeId)}
          >
            <span style={{ fontSize: '16px' }}>🎭</span>
            重新生成场景
          </div>
          
          <div
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#2D3748',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#F7FAFC';
              (e.target as HTMLElement).style.color = '#1A202C';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#2D3748';
            }}
            onClick={() => contextMenu.nodeId && handleRegenerateActions(contextMenu.nodeId)}
          >
            <span style={{ fontSize: '16px' }}>⚡</span>
            重新生成动作
          </div>
          
          <div
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#2D3748',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#F7FAFC';
              (e.target as HTMLElement).style.color = '#1A202C';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#2D3748';
            }}
            onClick={() => contextMenu.nodeId && handleContinueStory(contextMenu.nodeId)}
          >
            <span style={{ fontSize: '16px' }}>📖</span>
            继续故事
          </div>
          
          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #E8E8E8' }} />
          
          <div
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#2D3748',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#F7FAFC';
              (e.target as HTMLElement).style.color = '#1A202C';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = '#2D3748';
            }}
            onClick={() => contextMenu.nodeId && handleNodeClick(contextMenu.nodeId)}
          >
            <span style={{ fontSize: '16px' }}>✏️</span>
            编辑节点
          </div>
        </div>
      )}

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
            top: '80px',
            right: '16px',
            background: syncStatus.type === 'success' 
              ? 'linear-gradient(135deg, #9AE6B4 0%, #68D391 100%)' 
              : syncStatus.type === 'error' 
              ? 'linear-gradient(135deg, #FEB2B2 0%, #F56565 100%)' 
              : 'linear-gradient(135deg, #90CDF4 0%, #63B3ED 100%)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: syncStatus.type === 'success' 
              ? '0 4px 20px rgba(104, 211, 145, 0.3)' 
              : syncStatus.type === 'error' 
              ? '0 4px 20px rgba(245, 101, 101, 0.3)' 
              : '0 4px 20px rgba(99, 179, 237, 0.3)',
            zIndex: 1001,
            fontSize: '14px',
            fontWeight: '600',
            maxWidth: '300px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          {syncStatus.message}
        </div>
      )}

      {/* Story History Panel */}
      {projectId && (
        <StoryHistoryPanel
          projectId={projectId}
          isVisible={showHistory}
          onClose={() => setShowHistory(false)}
          onRollback={handleRollback}
          onError={onApiError}
        />
      )}
    </div>
  );
};

export default StoryTreeGraph; 