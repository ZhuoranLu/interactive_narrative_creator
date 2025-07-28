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
  
  // Add state to track if a drag operation just ended
  const [justEndedDrag, setJustEndedDrag] = useState(false);
  
  // Add state to track initial mouse position for drag detection
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const DRAG_THRESHOLD = 5; // Minimum distance to consider it a drag
  
  // Add state for zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Zoom constants
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.2;
  const BASE_VIEWBOX = { x: 0, y: 0, width: 1200, height: 800 };

  // Add state for zoom controls visibility
  const [showZoomControls, setShowZoomControls] = useState(false);

  // Add throttling for wheel zoom
  const [lastWheelTime, setLastWheelTime] = useState(0);
  const WHEEL_THROTTLE = 100; // Minimum time between wheel events in ms

  // Update viewBox when zoom level changes
  React.useEffect(() => {
    const newWidth = BASE_VIEWBOX.width / zoomLevel;
    const newHeight = BASE_VIEWBOX.height / zoomLevel;
    const newX = BASE_VIEWBOX.x + panOffset.x + (BASE_VIEWBOX.width - newWidth) / 2;
    const newY = BASE_VIEWBOX.y + panOffset.y + (BASE_VIEWBOX.height - newHeight) / 2;
    
    setViewBox({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });
  }, [zoomLevel, panOffset]);

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Fit all nodes in view
  const handleFitToView = () => {
    if (Object.keys(nodePositions).length === 0) return;
    
    const positions = Object.values(nodePositions);
    const minX = Math.min(...positions.map(p => p.x)) - 50;
    const maxX = Math.max(...positions.map(p => p.x)) + 200;
    const minY = Math.min(...positions.map(p => p.y)) - 50;
    const maxY = Math.max(...positions.map(p => p.y)) + 100;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const scaleX = BASE_VIEWBOX.width / contentWidth;
    const scaleY = BASE_VIEWBOX.height / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, MAX_ZOOM) * 0.9; // 90% to add some padding
    
    setZoomLevel(newZoom);
    setPanOffset({
      x: minX - (BASE_VIEWBOX.width / newZoom - contentWidth) / 2,
      y: minY - (BASE_VIEWBOX.height / newZoom - contentHeight) / 2
    });
  };

  // Handle mouse wheel zoom
  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    
    // Throttle wheel events to prevent excessive rapid zooming
    const currentTime = Date.now();
    if (currentTime - lastWheelTime < WHEEL_THROTTLE) {
      return;
    }
    setLastWheelTime(currentTime);
    
    const delta = -event.deltaY;
    const zoomDirection = delta > 0 ? 1 : -1;
    
    // Reduce sensitivity by using smaller step and adding damping
    const wheelSensitivity = 0.1; // Reduced from 0.5 to 0.1
    const dampingFactor = 0.8; // Add damping to make it smoother
    const adjustedStep = ZOOM_STEP * wheelSensitivity * dampingFactor;
    
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel + (zoomDirection * adjustedStep)));
    
    if (newZoom !== zoomLevel) {
      setZoomLevel(newZoom);
    }
  };

  // Add keyboard shortcuts for zoom
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle zoom shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            handleZoomIn();
            break;
          case '-':
            event.preventDefault();
            handleZoomOut();
            break;
          case '0':
            event.preventDefault();
            handleZoomReset();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoomLevel]);
  
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
    
    const svgRect = (event.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
    
    // Record initial mouse position for drag detection
    setDragStartPosition({ x: event.clientX, y: event.clientY });
    
    // Convert screen coordinates to SVG coordinates
    const screenX = event.clientX - svgRect.left;
    const screenY = event.clientY - svgRect.top;
    const svgX = (screenX / svgRect.width) * viewBox.width + viewBox.x;
    const svgY = (screenY / svgRect.height) * viewBox.height + viewBox.y;
    
    const nodePos = getNodePosition(nodeId);
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: svgX - nodePos.x,
      y: svgY - nodePos.y
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
    
    // Convert screen coordinates to SVG coordinates
    const screenX = event.clientX - svgRect.left;
    const screenY = event.clientY - svgRect.top;
    const svgX = (screenX / svgRect.width) * viewBox.width + viewBox.x;
    const svgY = (screenY / svgRect.height) * viewBox.height + viewBox.y;
    
    let newX = svgX - dragOffset.x;
    let newY = svgY - dragOffset.y;
    
    // Apply grid snapping if close enough
    const snappedX = snapToGrid(newX);
    const snappedY = snapToGrid(newY);
    
    // Use snapped position if within threshold (adjusted for zoom)
    const snapThreshold = SNAP_THRESHOLD / zoomLevel;
    if (Math.abs(newX - snappedX) < snapThreshold) {
      newX = snappedX;
    }
    if (Math.abs(newY - snappedY) < snapThreshold) {
      newY = snappedY;
    }
    
    // Constrain to viewBox bounds with some padding
    const constrainedX = Math.max(viewBox.x + 50, Math.min(viewBox.x + viewBox.width - 200, newX));
    const constrainedY = Math.max(viewBox.y + 30, Math.min(viewBox.y + viewBox.height - 100, newY));
    
    setNodePositions(prev => ({
      ...prev,
      [draggedNodeId]: { x: constrainedX, y: constrainedY }
    }));
    
    setLastMousePosition({ x: event.clientX, y: event.clientY });
  };

  // Handle mouse up (end dragging)
  const handleMouseUp = () => {
    if (isDragging) {
      // Calculate distance moved to determine if it was actually a drag
      const deltaX = lastMousePosition.x - dragStartPosition.x;
      const deltaY = lastMousePosition.y - dragStartPosition.y;
      const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      setIsDragging(false);
      setDraggedNodeId(null);
      setDragOffset({ x: 0, y: 0 });
      
      // Only set justEndedDrag flag if we actually moved the mouse significantly
      if (distanceMoved > DRAG_THRESHOLD) {
        setJustEndedDrag(true);
        
        // Clear the flag after a short delay to allow click detection
        setTimeout(() => {
          setJustEndedDrag(false);
        }, 100);
      }
      
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
      setShowZoomControls(false);
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
    // Don't open edit dialog if we just finished dragging
    if (justEndedDrag) {
      return;
    }
    
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

      {/* Zoom Controls - Top Left Corner */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 100
        }}
      >
        {/* Main Magnifying Glass Button */}
        <button
          style={{
            background: showZoomControls 
              ? 'linear-gradient(135deg, #9AE6B4 0%, #68D391 100%)' 
              : 'linear-gradient(135deg, #90CDF4 0%, #63B3ED 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            cursor: 'pointer',
            fontSize: '24px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: showZoomControls 
              ? '0 6px 20px rgba(104, 211, 145, 0.4)' 
              : '0 6px 20px rgba(99, 179, 237, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
            position: 'relative'
          }}
          title={showZoomControls ? "关闭缩放控件" : "打开缩放控件"}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1.05)';
            (e.target as HTMLElement).style.boxShadow = showZoomControls 
              ? '0 8px 24px rgba(104, 211, 145, 0.5)' 
              : '0 8px 24px rgba(99, 179, 237, 0.5)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
            (e.target as HTMLElement).style.boxShadow = showZoomControls 
              ? '0 6px 20px rgba(104, 211, 145, 0.4)' 
              : '0 6px 20px rgba(99, 179, 237, 0.4)';
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowZoomControls(!showZoomControls);
          }}
        >
          🔍
          {/* Zoom Level Badge */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#2D3748',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '12px',
              minWidth: '24px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.8)'
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </div>
        </button>

        {/* Expandable Zoom Controls Panel */}
        {showZoomControls && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transformOrigin: 'top',
              minWidth: '72px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zoom In Button */}
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              style={{
                background: zoomLevel >= MAX_ZOOM 
                  ? 'var(--border-medium)' 
                  : 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-blue-hover) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                cursor: zoomLevel >= MAX_ZOOM ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: zoomLevel >= MAX_ZOOM 
                  ? 'none' 
                  : '0 4px 12px rgba(99, 179, 237, 0.3)',
                transition: 'all 0.2s ease'
              }}
              title="放大 (Zoom In)"
              onMouseEnter={(e) => {
                if (zoomLevel < MAX_ZOOM) {
                  (e.target as HTMLElement).style.transform = 'scale(1.05)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(99, 179, 237, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (zoomLevel < MAX_ZOOM) {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(99, 179, 237, 0.3)';
                }
              }}
            >
              +
            </button>
            
            {/* Zoom Out Button */}
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              style={{
                background: zoomLevel <= MIN_ZOOM 
                  ? 'var(--border-medium)' 
                  : 'linear-gradient(135deg, var(--macaron-orange) 0%, var(--macaron-orange-hover) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                cursor: zoomLevel <= MIN_ZOOM ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: zoomLevel <= MIN_ZOOM 
                  ? 'none' 
                  : '0 4px 12px rgba(246, 173, 85, 0.3)',
                transition: 'all 0.2s ease'
              }}
              title="缩小 (Zoom Out)"
              onMouseEnter={(e) => {
                if (zoomLevel > MIN_ZOOM) {
                  (e.target as HTMLElement).style.transform = 'scale(1.05)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(246, 173, 85, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (zoomLevel > MIN_ZOOM) {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(246, 173, 85, 0.3)';
                }
              }}
            >
              −
            </button>
            
            {/* Reset Zoom Button */}
            <button
              onClick={handleZoomReset}
              style={{
                background: 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                width: '48px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(104, 211, 145, 0.3)',
                transition: 'all 0.2s ease'
              }}
              title="重置缩放 (Reset Zoom)"
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1.05)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(104, 211, 145, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'scale(1)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(104, 211, 145, 0.3)';
              }}
            >
              1:1
            </button>
            
            {/* Fit to View Button */}
            <button
              onClick={handleFitToView}
              disabled={Object.keys(nodePositions).length === 0}
              style={{
                background: Object.keys(nodePositions).length === 0 
                  ? 'var(--border-medium)' 
                  : 'linear-gradient(135deg, var(--macaron-purple) 0%, var(--macaron-purple-hover) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '8px',
                cursor: Object.keys(nodePositions).length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                width: '48px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: Object.keys(nodePositions).length === 0 
                  ? 'none' 
                  : '0 4px 12px rgba(183, 148, 246, 0.3)',
                transition: 'all 0.2s ease'
              }}
              title="适应视图 (Fit to View)"
              onMouseEnter={(e) => {
                if (Object.keys(nodePositions).length > 0) {
                  (e.target as HTMLElement).style.transform = 'scale(1.05)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(183, 148, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (Object.keys(nodePositions).length > 0) {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(183, 148, 246, 0.3)';
                }
              }}
            >
              📐
            </button>
          </div>
        )}
      </div>

      <svg 
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
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
        onWheel={handleWheel}
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
              onClick={() => !isDragging && !justEndedDrag && handleNodeClick(nodeId)}
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
            
            /* Zoom-related styles */
            .zoom-controls {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(10px);
              border: 1px solid var(--border-light);
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            
            .zoom-button {
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              user-select: none;
            }
            
            .zoom-button:hover:not(:disabled) {
              transform: scale(1.05);
            }
            
            .zoom-button:active:not(:disabled) {
              transform: scale(0.95);
            }
            
            /* Smooth zoom transitions */
            svg {
              transition: none; /* Disable transitions during wheel zoom for performance */
            }
            
            /* Cursor styles for different zoom levels */
            .zoom-cursor-in {
              cursor: zoom-in;
            }
            
            .zoom-cursor-out {
              cursor: zoom-out;
            }
            
            /* Zoom controls slide-down animation */
            @keyframes slideDown {
              0% {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            
            /* Magnifying glass button animations */
            .zoom-magnify-button {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .zoom-magnify-button:hover {
              transform: scale(1.05);
            }
            
            .zoom-magnify-button:active {
              transform: scale(0.95);
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
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={handleCloseEdit}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: 'min(800px, 95vw)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-light)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px 24px 16px 24px',
                borderBottom: '1px solid var(--border-light)',
                background: 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-blue-hover) 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '16px 16px 0 0'
              }}
            >
              <div>
                <h3 style={{ 
                  margin: '0', 
                  fontSize: '20px', 
                  fontWeight: '700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  ✏️ 编辑节点
                </h3>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: '14px', 
                  opacity: 0.9,
                  fontWeight: '500'
                }}>
                  {editingNode.id}
                  {isLoading && <span style={{ marginLeft: '10px' }}>⏳ 同步中...</span>}
                </p>
              </div>
              <button
                onClick={handleCloseEdit}
                disabled={isLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.5 : 1
                }}
                title="关闭编辑器"
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.3)';
                    (e.target as HTMLElement).style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.2)';
                    (e.target as HTMLElement).style.transform = 'scale(1)';
                  }
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              {/* Scene Section */}
              <div>
                <label style={{ 
                  fontWeight: '700', 
                  display: 'block', 
                  marginBottom: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '16px'
                }}>
                  🎭 场景描述
                </label>
                <textarea
                  value={editFormData.scene}
                  onChange={(e) => setEditFormData({ ...editFormData, scene: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    border: '2px solid var(--border-light)',
                    borderRadius: '12px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    background: 'var(--secondary-bg)',
                    color: 'var(--text-primary)',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  placeholder="请输入场景描述..."
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'var(--macaron-blue)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
                  }}
                />
              </div>

              {/* Events Section */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <label style={{ 
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}>
                    🎪 事件列表 ({editFormData.events.length})
                  </label>
                  <button
                    onClick={addEvent}
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: isLoading ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(104, 211, 145, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                        (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(104, 211, 145, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        (e.target as HTMLElement).style.transform = 'translateY(0)';
                        (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(104, 211, 145, 0.3)';
                      }
                    }}
                  >
                    + 添加事件
                  </button>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  padding: editFormData.events.length > 3 ? '8px' : '0',
                  border: editFormData.events.length > 3 ? '1px solid var(--border-light)' : 'none',
                  borderRadius: editFormData.events.length > 3 ? '8px' : '0',
                  background: editFormData.events.length > 3 ? 'var(--secondary-bg)' : 'transparent'
                }}>
                  {editFormData.events.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      暂无事件，点击"添加事件"开始创建...
                    </div>
                  ) : (
                    editFormData.events.map((event, index) => (
                      <div 
                        key={event.id || index} 
                        style={{ 
                          padding: '16px', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: '12px',
                          background: 'var(--card-bg)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          gap: '12px', 
                          marginBottom: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <input
                            type="text"
                            value={event.speaker}
                            onChange={(e) => updateEvent(index, 'speaker', e.target.value)}
                            placeholder="发言人..."
                            disabled={isLoading}
                            style={{
                              flex: '1 1 150px',
                              minWidth: '150px',
                              padding: '8px 12px',
                              border: '1px solid var(--border-light)',
                              borderRadius: '8px',
                              background: 'var(--secondary-bg)',
                              color: 'var(--text-primary)',
                              fontSize: '14px',
                              opacity: isLoading ? 0.6 : 1,
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLElement).style.borderColor = 'var(--macaron-blue)';
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
                            }}
                          />
                          <select
                            value={event.event_type}
                            onChange={(e) => updateEvent(index, 'event_type', e.target.value)}
                            disabled={isLoading}
                            style={{
                              flex: '0 0 auto',
                              padding: '8px 12px',
                              border: '1px solid var(--border-light)',
                              borderRadius: '8px',
                              background: 'var(--secondary-bg)',
                              color: 'var(--text-primary)',
                              fontSize: '14px',
                              opacity: isLoading ? 0.6 : 1,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="dialogue">💬 对话</option>
                            <option value="action">⚡ 动作</option>
                            <option value="thought">💭 思考</option>
                            <option value="description">📝 描述</option>
                          </select>
                          <button
                            onClick={() => removeEvent(index)}
                            disabled={isLoading}
                            style={{
                              background: 'linear-gradient(135deg, var(--macaron-red) 0%, #F56565 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              opacity: isLoading ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                              flex: '0 0 auto'
                            }}
                            title="删除事件"
                            onMouseEnter={(e) => {
                              if (!isLoading) {
                                (e.target as HTMLElement).style.transform = 'scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isLoading) {
                                (e.target as HTMLElement).style.transform = 'scale(1)';
                              }
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                        <textarea
                          value={event.content}
                          onChange={(e) => updateEvent(index, 'content', e.target.value)}
                          placeholder="事件内容..."
                          disabled={isLoading}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            background: 'var(--secondary-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            opacity: isLoading ? 0.6 : 1,
                            transition: 'border-color 0.2s ease',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            (e.target as HTMLElement).style.borderColor = 'var(--macaron-blue)';
                          }}
                          onBlur={(e) => {
                            (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <label style={{ 
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    fontSize: '16px'
                  }}>
                    ⚡ 动作选项 ({editFormData.actions.length})
                  </label>
                  <button
                    onClick={addAction}
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-blue-hover) 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: isLoading ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(99, 179, 237, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                        (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(99, 179, 237, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        (e.target as HTMLElement).style.transform = 'translateY(0)';
                        (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(99, 179, 237, 0.3)';
                      }
                    }}
                  >
                    + 添加动作
                  </button>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  padding: editFormData.actions.length > 2 ? '8px' : '0',
                  border: editFormData.actions.length > 2 ? '1px solid var(--border-light)' : 'none',
                  borderRadius: editFormData.actions.length > 2 ? '8px' : '0',
                  background: editFormData.actions.length > 2 ? 'var(--secondary-bg)' : 'transparent'
                }}>
                  {editFormData.actions.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      暂无动作选项，点击"添加动作"开始创建...
                    </div>
                  ) : (
                    editFormData.actions.map((action, index) => (
                      <div 
                        key={action.id} 
                        style={{ 
                          padding: '16px', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: '12px',
                          background: 'var(--card-bg)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          gap: '12px', 
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}>
                          <input
                            type="text"
                            value={action.description}
                            onChange={(e) => updateAction(index, 'description', e.target.value)}
                            placeholder="动作描述..."
                            disabled={isLoading}
                            style={{
                              flex: '1 1 200px',
                              minWidth: '200px',
                              padding: '8px 12px',
                              border: '1px solid var(--border-light)',
                              borderRadius: '8px',
                              background: 'var(--secondary-bg)',
                              color: 'var(--text-primary)',
                              fontSize: '14px',
                              opacity: isLoading ? 0.6 : 1,
                              transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLElement).style.borderColor = 'var(--macaron-blue)';
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
                            }}
                          />
                          <label style={{ 
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-secondary)',
                            fontWeight: '500',
                            cursor: 'pointer',
                            flex: '0 0 auto'
                          }}>
                            <input
                              type="checkbox"
                              checked={action.is_key_action}
                              onChange={(e) => updateAction(index, 'is_key_action', e.target.checked)}
                              disabled={isLoading}
                              style={{ 
                                width: '16px',
                                height: '16px',
                                accentColor: 'var(--macaron-blue)'
                              }}
                            />
                            🔑 关键动作
                          </label>
                          <button
                            onClick={() => removeAction(index)}
                            disabled={isLoading}
                            style={{
                              background: 'linear-gradient(135deg, var(--macaron-red) 0%, #F56565 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              opacity: isLoading ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                              flex: '0 0 auto'
                            }}
                            title="删除动作"
                            onMouseEnter={(e) => {
                              if (!isLoading) {
                                (e.target as HTMLElement).style.transform = 'scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isLoading) {
                                (e.target as HTMLElement).style.transform = 'scale(1)';
                              }
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-light)',
                background: 'var(--secondary-bg)',
                borderRadius: '0 0 16px 16px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <button
                onClick={handleCloseEdit}
                disabled={isLoading}
                style={{
                  background: 'var(--border-medium)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  flex: '0 0 auto'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    (e.target as HTMLElement).style.background = 'var(--border-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    (e.target as HTMLElement).style.background = 'var(--border-medium)';
                  }
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                style={{
                  background: isLoading 
                    ? 'var(--border-medium)' 
                    : 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: isLoading ? 0.8 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading ? 'none' : '0 2px 8px rgba(104, 211, 145, 0.3)',
                  flex: '0 0 auto'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(104, 211, 145, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    (e.target as HTMLElement).style.transform = 'translateY(0)';
                    (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(104, 211, 145, 0.3)';
                  }
                }}
              >
                {isLoading ? '⏳ 保存并同步中...' : '💾 保存并同步到数据库'}
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