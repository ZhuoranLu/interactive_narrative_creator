"""
API Client for Interactive Narrative Creator
Provides easy access to backend CRUD operations for nodes, events, and actions.
"""

import requests
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import os


@dataclass
class APIResponse:
    """Standardized API response structure"""
    success: bool
    data: Any = None
    error: str = None
    status_code: int = 200


class NarrativeAPIClient:
    """Client for interacting with the Interactive Narrative Creator API"""
    
    def __init__(self, base_url: str = None, auth_token: str = None):
        self.base_url = base_url or os.getenv('API_BASE_URL', 'http://localhost:8000')
        self.auth_token = auth_token or os.getenv('API_AUTH_TOKEN')
        self.session = requests.Session()
        
        if self.auth_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            })
    
    def set_auth_token(self, token: str):
        """Set authentication token for API requests"""
        self.auth_token = token
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> APIResponse:
        """Make HTTP request to API endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                return APIResponse(success=False, error=f"Unsupported method: {method}")
            
            if response.status_code >= 400:
                error_detail = response.json().get('detail', 'Unknown error') if response.text else 'Unknown error'
                return APIResponse(
                    success=False, 
                    error=error_detail,
                    status_code=response.status_code
                )
            
            response_data = response.json() if response.text else None
            return APIResponse(
                success=True,
                data=response_data,
                status_code=response.status_code
            )
            
        except requests.exceptions.RequestException as e:
            return APIResponse(success=False, error=f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            return APIResponse(success=False, error=f"Invalid JSON response: {str(e)}")
    
    # ==================== NODE OPERATIONS ====================
    
    def update_node(self, node_id: str, scene: str = None, node_type: str = None, metadata: Dict = None) -> APIResponse:
        """Update a narrative node"""
        data = {}
        if scene is not None:
            data['scene'] = scene
        if node_type is not None:
            data['node_type'] = node_type
        if metadata is not None:
            data['metadata'] = metadata
        
        return self._make_request('PUT', f'/nodes/{node_id}', data)
    
    def delete_node(self, node_id: str) -> APIResponse:
        """Delete a narrative node"""
        return self._make_request('DELETE', f'/nodes/{node_id}')
    
    # ==================== EVENT OPERATIONS ====================
    
    def create_event(self, node_id: str, content: str, speaker: str = "", 
                    description: str = "", timestamp: int = 0, 
                    event_type: str = "dialogue", metadata: Dict = None) -> APIResponse:
        """Create a new narrative event"""
        data = {
            'node_id': node_id,
            'content': content,
            'speaker': speaker,
            'description': description,
            'timestamp': timestamp,
            'event_type': event_type,
            'metadata': metadata
        }
        return self._make_request('POST', '/events', data)
    
    def update_event(self, event_id: str, content: str = None, speaker: str = None,
                    description: str = None, timestamp: int = None,
                    event_type: str = None, metadata: Dict = None) -> APIResponse:
        """Update a narrative event"""
        data = {}
        if content is not None:
            data['content'] = content
        if speaker is not None:
            data['speaker'] = speaker
        if description is not None:
            data['description'] = description
        if timestamp is not None:
            data['timestamp'] = timestamp
        if event_type is not None:
            data['event_type'] = event_type
        if metadata is not None:
            data['metadata'] = metadata
        
        return self._make_request('PUT', f'/events/{event_id}', data)
    
    def delete_event(self, event_id: str) -> APIResponse:
        """Delete a narrative event"""
        return self._make_request('DELETE', f'/events/{event_id}')
    
    # ==================== ACTION OPERATIONS ====================
    
    def create_action(self, description: str, is_key_action: bool = False,
                     event_id: str = None, metadata: Dict = None) -> APIResponse:
        """Create a new action"""
        data = {
            'description': description,
            'is_key_action': is_key_action,
            'event_id': event_id,
            'metadata': metadata
        }
        return self._make_request('POST', '/actions', data)
    
    def update_action(self, action_id: str, description: str = None,
                     is_key_action: bool = None, metadata: Dict = None) -> APIResponse:
        """Update an action"""
        data = {}
        if description is not None:
            data['description'] = description
        if is_key_action is not None:
            data['is_key_action'] = is_key_action
        if metadata is not None:
            data['metadata'] = metadata
        
        return self._make_request('PUT', f'/actions/{action_id}', data)
    
    def delete_action(self, action_id: str) -> APIResponse:
        """Delete an action"""
        return self._make_request('DELETE', f'/actions/{action_id}')
    
    # ==================== ACTION BINDING OPERATIONS ====================
    
    def create_action_binding(self, action_id: str, source_node_id: str,
                             target_node_id: str = None, target_event_id: str = None) -> APIResponse:
        """Create a new action binding"""
        data = {
            'action_id': action_id,
            'source_node_id': source_node_id,
            'target_node_id': target_node_id,
            'target_event_id': target_event_id
        }
        return self._make_request('POST', '/action-bindings', data)
    
    def update_action_binding(self, binding_id: str, target_node_id: str = None,
                             target_event_id: str = None) -> APIResponse:
        """Update an action binding"""
        data = {}
        if target_node_id is not None:
            data['target_node_id'] = target_node_id
        if target_event_id is not None:
            data['target_event_id'] = target_event_id
        
        return self._make_request('PUT', f'/action-bindings/{binding_id}', data)
    
    def delete_action_binding(self, binding_id: str) -> APIResponse:
        """Delete an action binding"""
        return self._make_request('DELETE', f'/action-bindings/{binding_id}')
    
    # ==================== CONVENIENCE METHODS ====================
    
    def sync_node_to_database(self, node) -> APIResponse:
        """Sync a frontend Node object to the database"""
        return self.update_node(
            node_id=node.id,
            scene=node.scene,
            node_type=node.node_type.value if hasattr(node.node_type, 'value') else node.node_type,
            metadata=node.metadata
        )
    
    def sync_event_to_database(self, event, node_id: str = None) -> APIResponse:
        """Sync a frontend Event object to the database"""
        if hasattr(event, 'id') and event.id:
            # Update existing event
            return self.update_event(
                event_id=event.id,
                content=event.content,
                speaker=event.speaker,
                description=event.description,
                timestamp=event.timestamp,
                event_type=event.event_type,
                metadata=event.metadata
            )
        else:
            # Create new event
            if not node_id:
                raise ValueError("node_id is required for creating new events")
            return self.create_event(
                node_id=node_id,
                content=event.content,
                speaker=event.speaker,
                description=event.description,
                timestamp=event.timestamp,
                event_type=event.event_type,
                metadata=event.metadata
            )
    
    def sync_action_to_database(self, action, event_id: str = None) -> APIResponse:
        """Sync a frontend Action object to the database"""
        if hasattr(action, 'id') and action.id:
            # Update existing action
            return self.update_action(
                action_id=action.id,
                description=action.description,
                is_key_action=action.is_key_action,
                metadata=action.metadata
            )
        else:
            # Create new action
            return self.create_action(
                description=action.description,
                is_key_action=action.is_key_action,
                event_id=event_id,
                metadata=action.metadata
            )


# Global API client instance
api_client = NarrativeAPIClient()


# Convenience functions for direct use
def set_auth_token(token: str):
    """Set authentication token for API requests"""
    api_client.set_auth_token(token)


def update_node_in_database(node_id: str, **kwargs) -> APIResponse:
    """Update a node in the database"""
    return api_client.update_node(node_id, **kwargs)


def create_event_in_database(node_id: str, content: str, **kwargs) -> APIResponse:
    """Create an event in the database"""
    return api_client.create_event(node_id, content, **kwargs)


def update_event_in_database(event_id: str, **kwargs) -> APIResponse:
    """Update an event in the database"""
    return api_client.update_event(event_id, **kwargs)


def delete_event_from_database(event_id: str) -> APIResponse:
    """Delete an event from the database"""
    return api_client.delete_event(event_id)


def create_action_in_database(description: str, **kwargs) -> APIResponse:
    """Create an action in the database"""
    return api_client.create_action(description, **kwargs)


def update_action_in_database(action_id: str, **kwargs) -> APIResponse:
    """Update an action in the database"""
    return api_client.update_action(action_id, **kwargs)


def delete_action_from_database(action_id: str) -> APIResponse:
    """Delete an action from the database"""
    return api_client.delete_action(action_id) 