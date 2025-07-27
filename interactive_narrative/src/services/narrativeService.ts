/**
 * Narrative Service for React Frontend
 * 
 * This service handles HTTP requests to FastAPI backend endpoints
 * for CRUD operations on nodes, events, and actions.
 */

const API_BASE_URL = 'http://localhost:8000';

// Types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface NodeUpdateData {
  scene?: string;
  node_type?: string;
  metadata?: Record<string, any>;
}

interface EventCreateData {
  node_id: string;
  content: string;
  speaker?: string;
  description?: string;
  timestamp?: number;
  event_type?: string;
  metadata?: Record<string, any>;
}

interface EventUpdateData {
  content?: string;
  speaker?: string;
  description?: string;
  timestamp?: number;
  event_type?: string;
  metadata?: Record<string, any>;
}

interface ActionCreateData {
  description: string;
  is_key_action?: boolean;
  event_id?: string;
  metadata?: Record<string, any>;
}

interface ActionUpdateData {
  description?: string;
  is_key_action?: boolean;
  metadata?: Record<string, any>;
}

interface ActionBindingCreateData {
  action_id: string;
  source_node_id: string;
  target_node_id?: string;
  target_event_id?: string;
}

interface ActionBindingUpdateData {
  target_node_id?: string;
  target_event_id?: string;
}

interface HistoryEntry {
  id: string;
  operation_type: string;
  operation_description: string;
  affected_node_id?: string;
  created_at: string;
}

interface ProjectHistory {
  history: HistoryEntry[];
  total_count: number;
}

interface CreateSnapshotData {
  operation_type: string;
  operation_description: string;
  affected_node_id?: string;
}

interface RollbackData {
  snapshot_id: string;
}

class NarrativeService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ==================== STORY HISTORY OPERATIONS ====================

  async getProjectHistory(projectId: string): Promise<ProjectHistory> {
    return this.makeRequest(`/projects/${projectId}/history`);
  }

  async createSnapshot(projectId: string, snapshotData: CreateSnapshotData): Promise<any> {
    return this.makeRequest(`/projects/${projectId}/history/snapshot`, {
      method: 'POST',
      body: JSON.stringify(snapshotData)
    });
  }

  async rollbackToSnapshot(projectId: string, rollbackData: RollbackData): Promise<any> {
    return this.makeRequest(`/projects/${projectId}/history/rollback`, {
      method: 'POST',
      body: JSON.stringify(rollbackData)
    });
  }

  async deleteSnapshot(projectId: string, snapshotId: string): Promise<any> {
    return this.makeRequest(`/projects/${projectId}/history/${snapshotId}`, {
      method: 'DELETE'
    });
  }

  // ==================== NODE OPERATIONS ====================

  async updateNode(nodeId: string, updateData: NodeUpdateData): Promise<any> {
    return this.makeRequest(`/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteNode(nodeId: string): Promise<{ message: string }> {
    return this.makeRequest(`/nodes/${nodeId}`, {
      method: 'DELETE'
    });
  }

  // ==================== EVENT OPERATIONS ====================

  async createEvent(eventData: EventCreateData): Promise<any> {
    return this.makeRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  async updateEvent(eventId: string, updateData: EventUpdateData): Promise<any> {
    return this.makeRequest(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteEvent(eventId: string): Promise<{ message: string }> {
    return this.makeRequest(`/events/${eventId}`, {
      method: 'DELETE'
    });
  }

  // ==================== ACTION OPERATIONS ====================

  async createAction(actionData: ActionCreateData): Promise<any> {
    return this.makeRequest('/actions', {
      method: 'POST',
      body: JSON.stringify(actionData)
    });
  }

  async updateAction(actionId: string, updateData: ActionUpdateData): Promise<any> {
    return this.makeRequest(`/actions/${actionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteAction(actionId: string): Promise<{ message: string }> {
    return this.makeRequest(`/actions/${actionId}`, {
      method: 'DELETE'
    });
  }

  // ==================== ACTION BINDING OPERATIONS ====================

  async createActionBinding(bindingData: ActionBindingCreateData): Promise<any> {
    return this.makeRequest('/action-bindings', {
      method: 'POST',
      body: JSON.stringify(bindingData)
    });
  }

  async updateActionBinding(bindingId: string, updateData: ActionBindingUpdateData): Promise<any> {
    return this.makeRequest(`/action-bindings/${bindingId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteActionBinding(bindingId: string): Promise<{ message: string }> {
    return this.makeRequest(`/action-bindings/${bindingId}`, {
      method: 'DELETE'
    });
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Update node scene text
   */
  async updateNodeScene(nodeId: string, newScene: string): Promise<any> {
    return this.updateNode(nodeId, { scene: newScene });
  }

  /**
   * Add a dialogue event to a node
   */
  async addDialogueEvent(nodeId: string, speaker: string, content: string): Promise<any> {
    return this.createEvent({
      node_id: nodeId,
      content,
      speaker,
      event_type: 'dialogue'
    });
  }

  /**
   * Add a new action to a node
   */
  async addActionToNode(nodeId: string, description: string, isKeyAction: boolean = false): Promise<any> {
    // First create the action
    const action = await this.createAction({
      description,
      is_key_action: isKeyAction
    });

    // Then create the action binding
    await this.createActionBinding({
      action_id: action.id,
      source_node_id: nodeId
    });

    return action;
  }

  /**
   * Update action description
   */
  async updateActionDescription(actionId: string, newDescription: string): Promise<any> {
    return this.updateAction(actionId, { description: newDescription });
  }

  /**
   * Batch update multiple elements of a node
   */
  async batchUpdateNode(nodeId: string, updates: {
    scene?: string;
    events?: { id: string, updates: EventUpdateData }[];
    actions?: { id: string, updates: ActionUpdateData }[];
  }): Promise<{ results: any[] }> {
    const results = [];

    // Update node scene if provided
    if (updates.scene) {
      try {
        const nodeResult = await this.updateNodeScene(nodeId, updates.scene);
        results.push({ type: 'node', success: true, data: nodeResult });
      } catch (error) {
        results.push({ type: 'node', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Update events if provided
    if (updates.events) {
      for (const eventUpdate of updates.events) {
        try {
          const eventResult = await this.updateEvent(eventUpdate.id, eventUpdate.updates);
          results.push({ type: 'event', id: eventUpdate.id, success: true, data: eventResult });
        } catch (error) {
          results.push({ type: 'event', id: eventUpdate.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    // Update actions if provided
    if (updates.actions) {
      for (const actionUpdate of updates.actions) {
        try {
          const actionResult = await this.updateAction(actionUpdate.id, actionUpdate.updates);
          results.push({ type: 'action', id: actionUpdate.id, success: true, data: actionResult });
        } catch (error) {
          results.push({ type: 'action', id: actionUpdate.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    return { results };
  }
}

// Export singleton instance
export const narrativeService = new NarrativeService();
export default narrativeService;

// Export types for use in components
export type {
  NodeUpdateData,
  EventCreateData,
  EventUpdateData,
  ActionCreateData,
  ActionUpdateData,
  ActionBindingCreateData,
  ActionBindingUpdateData,
  HistoryEntry,
  ProjectHistory,
  CreateSnapshotData,
  RollbackData
}; 