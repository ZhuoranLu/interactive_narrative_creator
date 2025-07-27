import { useState } from 'react';
import StoryTreeGraph from './StoryTreeGraph';
import StoryExampleModal from './StoryExampleModal';
import { Project, authService } from '../services/authService';

interface NarrativePayload {
  request_type: string;
  context: any;
  current_node?: any;
  user_input?: string;
  metadata?: any;
}

interface NarrativeResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

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

const NarrativeClient = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<NarrativeResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [storyTree, setStoryTree] = useState<StoryTree | null>(null);
  const [loadingStory, setLoadingStory] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const API_BASE_URL = 'http://localhost:8000';

  const callNarrativeAPI = async (payload: NarrativePayload): Promise<NarrativeResponse | null> => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/narrative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const result: NarrativeResponse = await res.json();
      setResponse(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Transform the loaded JSON data to match StoryTree interface
  const transformStoryData = (jsonData: any): StoryTree => {
    const transformedNodes: Record<string, StoryNode> = {};
    
    // Transform nodes
    Object.entries(jsonData.nodes).forEach(([nodeId, nodeData]: [string, any]) => {
      transformedNodes[nodeId] = {
        id: nodeId,
        level: nodeData.level,
        type: nodeData.type,
        parent_node_id: nodeData.parent_node_id,
        data: {
          scene: nodeData.data.scene,
          outgoing_actions: nodeData.data.outgoing_actions || []
        }
      };
    });

    return {
      nodes: transformedNodes,
      connections: jsonData.connections || [],
      root_node_id: jsonData.root_node_id
    };
  };

  // Load story from public folder
  const loadDefaultStoryExample = async () => {
    setLoadingStory(true);
    setError('');
    
    try {
      const response = await fetch('/story_tree_example.json');
      if (!response.ok) {
        throw new Error(`Failed to load story: ${response.status}`);
      }
      
      const jsonData = await response.json();
      const transformedStory = transformStoryData(jsonData);
      setStoryTree(transformedStory);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load story';
      setError(errorMessage);
    } finally {
      setLoadingStory(false);
    }
  };

  // Handle selecting a project from modal
  const handleSelectProject = async (project: Project) => {
    setLoadingStory(true);
    setError('');
    
    try {
      // Load the project's story tree from the backend
      const response = await authService.loadProjectStoryTree(project.id);
      
      if (response.success && response.data) {
        const transformedStory = transformStoryData(response.data);
        setStoryTree(transformedStory);
        setCurrentProjectId(project.id);
        console.log('Successfully loaded project:', project.title);
      } else {
        throw new Error('Failed to load project data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
    } finally {
      setLoadingStory(false);
    }
  };

  // Handle real-time node updates from StoryTreeGraph
  const handleNodeUpdate = (nodeId: string, updatedNode: any) => {
    if (!storyTree) return;
    
    setStoryTree(prevStoryTree => {
      if (!prevStoryTree) return null;
      
      return {
        ...prevStoryTree,
        nodes: {
          ...prevStoryTree.nodes,
          [nodeId]: updatedNode
        }
      };
    });
    
    console.log(`Node ${nodeId} updated in real-time`);
  };

  // Handle API errors from StoryTreeGraph
  const handleApiError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('StoryTreeGraph API Error:', errorMessage);
  };

  // Handle story reload after rollback
  const handleStoryReload = async () => {
    if (!currentProjectId) return;
    
    setLoadingStory(true);
    try {
      const response = await authService.loadProjectStoryTree(currentProjectId);
      if (response.success && response.data) {
        const transformedStory = transformStoryData(response.data);
        setStoryTree(transformedStory);
        console.log('Story reloaded after rollback');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reload story';
      setError(errorMessage);
    } finally {
      setLoadingStory(false);
    }
  };

  // Example usage functions
  const handleBootstrapStory = async (idea: string) => {
    const payload: NarrativePayload = {
      request_type: 'bootstrap_node',
      context: { idea },
      user_input: idea,
    };
    return await callNarrativeAPI(payload);
  };

  const handleContinueStory = async (currentNode: any, selectedAction: any, worldState: any) => {
    const payload: NarrativePayload = {
      request_type: 'generate_next_node',
      context: { world_state: worldState, selected_action: selectedAction },
      current_node: currentNode,
    };
    return await callNarrativeAPI(payload);
  };

  const handleApplyAction = async (currentNode: any, actionId: string, worldState: any) => {
    const payload: NarrativePayload = {
      request_type: 'apply_action',
      context: { action_id: actionId, world_state: worldState },
      current_node: currentNode,
    };
    return await callNarrativeAPI(payload);
  };

  const handleRegenerateContent = async (currentNode: any, partType: string, additionalContext?: string) => {
    const payload: NarrativePayload = {
      request_type: 'regenerate_part',
      context: { part_type: partType, additional_context: additionalContext },
      current_node: currentNode,
    };
    return await callNarrativeAPI(payload);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Interactive Narrative Creator</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => handleBootstrapStory('若诸葛亮没死，他会如何改变三国的历史')} 
          disabled={loading}
        >
          Bootstrap Story
        </button>
        <button 
          onClick={() => handleContinueStory(null, null, {})} 
          disabled={loading}
          style={{ marginLeft: '10px' }}
        >
          Continue Story
        </button>
        <button 
          onClick={() => handleApplyAction(null, 'test_action', {})} 
          disabled={loading}
          style={{ marginLeft: '10px' }}
        >
          Apply Action
        </button>
        <button 
          onClick={() => handleRegenerateContent(null, 'scene', 'make it more dramatic')} 
          disabled={loading}
          style={{ marginLeft: '10px' }}
        >
          Regenerate Scene
        </button>
        <button 
          onClick={loadDefaultStoryExample}
          disabled={loadingStory}
          style={{ 
            marginLeft: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: loadingStory ? 'not-allowed' : 'pointer'
          }}
        >
          {loadingStory ? 'Loading...' : 'Load Default Example'}
        </button>
        <button 
          onClick={() => setShowModal(true)}
          disabled={loadingStory}
          style={{ 
            marginLeft: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: loadingStory ? 'not-allowed' : 'pointer'
          }}
        >
          Load My Stories
        </button>
        
        {/* Quick Rollback Button */}
        {currentProjectId && (
          <button 
            onClick={async () => {
              if (!currentProjectId) return;
              
              try {
                const { narrativeService } = await import('../services/narrativeService');
                const historyData = await narrativeService.getProjectHistory(currentProjectId);
                
                if (historyData.history && historyData.history.length > 1) {
                  const lastSnapshot = historyData.history[1]; // Skip current state
                  const confirmRollback = window.confirm(
                    `🔄 回滚故事到上一个状态？\n\n"${lastSnapshot.operation_description}"\n\n这将撤销最近的更改！`
                  );
                  
                  if (confirmRollback) {
                    await narrativeService.rollbackToSnapshot(currentProjectId, { snapshot_id: lastSnapshot.id });
                    await handleStoryReload();
                    setError(''); // Clear any previous errors
                    console.log('Story rolled back successfully');
                  }
                } else {
                  alert('ℹ️ 没有可回滚的历史状态');
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
                setError(`回滚失败: ${errorMessage}`);
                console.error('Rollback error:', error);
              }
            }}
            disabled={loadingStory}
            style={{ 
              marginLeft: '10px',
              backgroundColor: '#FF6B35',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: loadingStory ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
            title="回滚到上一个编辑状态"
          >
            🔄 撤销上一步
          </button>
        )}
      </div>

      {/* Story Tree Visualization */}
      {storyTree && (
        <div style={{ marginBottom: '30px' }}>
          <h3>Story Tree Visualization</h3>
          
          {/* Help info for rollback */}
          {currentProjectId && (
            <div style={{ 
              background: '#e3f2fd', 
              border: '1px solid #2196f3', 
              borderRadius: '4px', 
              padding: '10px', 
              marginBottom: '15px',
              fontSize: '14px' 
            }}>
              <strong>💡 编辑历史功能：</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li><strong>🔄 撤销上一步</strong> - 快速回滚到上一个编辑状态</li>
                <li><strong>📚 编辑历史</strong> - 查看完整编辑历史，可回滚到任意状态（最多5个历史记录）</li>
                <li><strong>自动保存</strong> - 每次编辑操作前会自动创建历史快照</li>
              </ul>
            </div>
          )}
          
          <StoryTreeGraph 
            storyData={storyTree} 
            onNodeUpdate={handleNodeUpdate}
            onApiError={handleApiError}
            projectId={currentProjectId || undefined}
            onStoryReload={handleStoryReload}
          />
        </div>
      )}

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3>Create Your Story</h3>
        <textarea 
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your story idea or prompt..."
          style={{ 
            width: '100%', 
            height: '80px', 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            resize: 'vertical'
          }}
        />
        <button 
          onClick={() => handleBootstrapStory(userInput)}
          disabled={loading || !userInput.trim()}
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading || !userInput.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Start Story
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}
      
      {response && (
        <div style={{ 
          padding: '15px', 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          backgroundColor: '#f9f9f9',
          marginTop: '20px'
        }}>
          <h3>Response:</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h4>API Usage:</h4>
        <p>Use <code>callNarrativeAPI(payload)</code> with structured payload:</p>
        <pre style={{ fontSize: '12px' }}>
{`{
  request_type: "bootstrap_node" | "generate_next_node" | "apply_action" | "regenerate_part",
  context: { /* specific context for the request */ },
  current_node?: { /* current node data */ },
  user_input?: "user input string",
  metadata?: { /* any additional metadata */ }
}`}
        </pre>
      </div>

      {/* Story Example Modal */}
      <StoryExampleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectExample={handleSelectProject}
      />
    </div>
  );
};

export default NarrativeClient; 