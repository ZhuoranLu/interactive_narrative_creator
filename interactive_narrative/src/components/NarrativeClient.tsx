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
    <div style={{ 
      padding: '24px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      background: 'var(--card-bg)',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: '1px solid var(--border-light)'
    }}>
      <h2 style={{ 
        color: 'var(--text-primary)', 
        marginBottom: '24px',
        fontWeight: '700',
        background: 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-purple) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Interactive Narrative Creator
      </h2>
      
      <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <button 
          onClick={() => handleBootstrapStory('若诸葛亮没死，他会如何改变三国的历史')} 
          disabled={loading}
          style={{
            background: loading ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(104, 211, 145, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(104, 211, 145, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(104, 211, 145, 0.3)';
            }
          }}
        >
          Bootstrap Story
        </button>
        <button 
          onClick={() => handleContinueStory(null, null, {})} 
          disabled={loading}
          style={{
            background: loading ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-blue-hover) 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 179, 237, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(99, 179, 237, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(99, 179, 237, 0.3)';
            }
          }}
        >
          Continue Story
        </button>
        <button 
          onClick={() => handleApplyAction(null, 'test_action', {})} 
          disabled={loading}
          style={{
            background: loading ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-purple) 0%, var(--macaron-purple-hover) 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(183, 148, 246, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(183, 148, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(183, 148, 246, 0.3)';
            }
          }}
        >
          Apply Action
        </button>
        <button 
          onClick={() => handleRegenerateContent(null, 'scene', 'make it more dramatic')} 
          disabled={loading}
          style={{
            background: loading ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-orange) 0%, var(--macaron-orange-hover) 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(246, 173, 85, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(246, 173, 85, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(246, 173, 85, 0.3)';
            }
          }}
        >
          Regenerate Scene
        </button>
        <button 
          onClick={loadDefaultStoryExample}
          disabled={loadingStory}
          style={{
            background: loadingStory ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '12px',
            cursor: loadingStory ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: loadingStory ? 'none' : '0 4px 12px rgba(104, 211, 145, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loadingStory) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(104, 211, 145, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loadingStory) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(104, 211, 145, 0.3)';
            }
          }}
        >
          {loadingStory ? 'Loading...' : 'Load Default Example'}
        </button>
        <button 
          onClick={() => setShowModal(true)}
          disabled={loadingStory}
          style={{
            background: loadingStory ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-blue-hover) 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '12px',
            cursor: loadingStory ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: loadingStory ? 'none' : '0 4px 12px rgba(99, 179, 237, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loadingStory) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(99, 179, 237, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loadingStory) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(99, 179, 237, 0.3)';
            }
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
              background: loadingStory ? 'var(--border-medium)' : 'linear-gradient(135deg, var(--macaron-red) 0%, var(--macaron-red-hover) 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: loadingStory ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: loadingStory ? 'none' : '0 4px 12px rgba(245, 101, 101, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title="回滚到上一个编辑状态"
            onMouseEnter={(e) => {
              if (!loadingStory) {
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(245, 101, 101, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loadingStory) {
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(245, 101, 101, 0.3)';
              }
            }}
          >
            🔄 撤销上一步
          </button>
        )}
      </div>

      {/* Story Tree Visualization */}
      {storyTree && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Story Tree Visualization</h3>
          
          {/* Help info for rollback */}
          {currentProjectId && (
            <div style={{ 
              background: 'linear-gradient(135deg, var(--macaron-blue-hover) 0%, rgba(144, 205, 244, 0.1) 100%)', 
              border: '1px solid var(--macaron-blue)', 
              borderRadius: '12px', 
              padding: '16px', 
              marginBottom: '20px',
              fontSize: '14px',
              color: 'var(--text-primary)'
            }}>
              <strong style={{ color: 'var(--macaron-blue)' }}>💡 编辑历史功能：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
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

      <div style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        border: '1px solid var(--border-light)', 
        borderRadius: '16px',
        background: 'var(--card-bg)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ 
          color: 'var(--text-primary)', 
          fontWeight: '600', 
          marginBottom: '16px' 
        }}>
          Create Your Story
        </h3>
        <textarea 
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your story idea or prompt..."
          style={{ 
            width: '100%', 
            height: '100px', 
            padding: '16px', 
            borderRadius: '12px', 
            border: '2px solid var(--border-light)',
            resize: 'vertical',
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            (e.target as HTMLElement).style.borderColor = 'var(--macaron-blue)';
            (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99, 179, 237, 0.1)';
          }}
          onBlur={(e) => {
            (e.target as HTMLElement).style.borderColor = 'var(--border-light)';
            (e.target as HTMLElement).style.boxShadow = 'none';
          }}
        />
        <button 
          onClick={() => handleBootstrapStory(userInput)}
          disabled={loading || !userInput.trim()}
          style={{ 
            marginTop: '16px', 
            padding: '12px 24px', 
            background: (loading || !userInput.trim()) 
              ? 'var(--border-medium)' 
              : 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-blue-hover) 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px',
            cursor: (loading || !userInput.trim()) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: (loading || !userInput.trim()) 
              ? 'none' 
              : '0 4px 12px rgba(99, 179, 237, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading && userInput.trim()) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(99, 179, 237, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && userInput.trim()) {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(99, 179, 237, 0.3)';
            }
          }}
        >
          Start Story
        </button>
      </div>

      {loading && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px',
          background: 'linear-gradient(135deg, var(--macaron-blue-hover) 0%, rgba(144, 205, 244, 0.1) 100%)',
          borderRadius: '12px',
          border: '1px solid var(--macaron-blue)',
          marginBottom: '20px'
        }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid var(--border-light)',
            borderTop: '2px solid var(--macaron-blue)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '12px'
          }}></div>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Loading...</span>
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: 'white', 
          padding: '16px 20px', 
          border: '1px solid var(--macaron-red)', 
          borderRadius: '12px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, var(--macaron-red) 0%, var(--macaron-red-hover) 100%)',
          boxShadow: '0 4px 12px rgba(245, 101, 101, 0.3)',
          fontWeight: '500'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {response && (
        <div style={{ 
          padding: '20px', 
          border: '1px solid var(--border-light)', 
          borderRadius: '16px', 
          background: 'var(--card-bg)',
          marginTop: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontWeight: '600', 
            marginBottom: '16px' 
          }}>
            Response:
          </h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap',
            background: 'var(--secondary-bg)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            overflow: 'auto'
          }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ 
        marginTop: '32px', 
        padding: '20px', 
        background: 'var(--secondary-bg)', 
        borderRadius: '16px',
        border: '1px solid var(--border-light)'
      }}>
        <h4 style={{ 
          color: 'var(--text-primary)', 
          fontWeight: '600', 
          marginBottom: '12px' 
        }}>
          API Usage:
        </h4>
        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: '12px',
          lineHeight: '1.6' 
        }}>
          Use <code style={{ 
            background: 'var(--card-bg)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            border: '1px solid var(--border-light)',
            color: 'var(--macaron-purple)',
            fontWeight: '600'
          }}>callNarrativeAPI(payload)</code> with structured payload:
        </p>
        <pre style={{ 
          fontSize: '12px',
          background: 'var(--card-bg)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          overflow: 'auto'
        }}>
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