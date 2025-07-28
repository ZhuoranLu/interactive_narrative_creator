import { useState } from 'react';
import StoryTreeGraph, { StoryNode, StoryTree } from './StoryTreeGraph';
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
          events: nodeData.data.events || [],
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
    try {
      // Get the default example project
      const projects = await authService.getUserProjects();
      if (projects && projects.length > 0) {
        const defaultProject = projects[0];
        // Set the current project ID
        setCurrentProjectId(defaultProject.id);
        
        const response = await authService.loadProjectStoryTree(defaultProject.id);
        if (response.success && response.data) {
          const transformedStory = transformStoryData(response.data);
          setStoryTree(transformedStory);
          console.log('Default story loaded:', defaultProject.id);
          console.log('Story tree:', transformedStory);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load default story';
      setError(errorMessage);
      setCurrentProjectId(null);
    } finally {
      setLoadingStory(false);
    }
  };

  // Handle selecting a project from modal
  const handleSelectProject = async (project: Project) => {
    setLoadingStory(true);
    setError('');
    
    try {
      // Set the current project ID immediately
      setCurrentProjectId(project.id);
      console.log('Current project ID set to:', project.id, 'Current project ID:', currentProjectId);

      // Load the story tree using the selected project's ID
      const response = await authService.loadProjectStoryTree(project.id);
      
      if (response.success && response.data) {
        const transformedStory = transformStoryData(response.data);
        setStoryTree(transformedStory);
        
        console.log('Successfully loaded project:', {
          projectId: project.id,
          title: project.title,
          storyTree: transformedStory
        });
      } else {
        throw new Error('Failed to load project data');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      setError(errorMessage);
      
      // Reset state on failure
      setStoryTree(null);
      setCurrentProjectId(null);
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
    try {
      // First create a new project
      const newProject = await authService.createProject({
        title: idea.substring(0, 50) + (idea.length > 50 ? '...' : ''),
        description: idea
      });
      
      // Create the initial node with the new project ID
      const projectId = newProject.id;
      const payload: NarrativePayload = {
        request_type: 'bootstrap_node',
        context: { 
          idea,
          project_id: projectId
        },
        user_input: idea,
        metadata: { project_id: projectId }
      };
      
      const result = await callNarrativeAPI(payload);
      
      if (result?.success && result.data) {
        // Create initial story tree
        const initialNode: StoryNode = {
          id: result.data.node.id || 'root',
          level: 0,
          type: 'scene',
          data: {
            scene: result.data.node.scene,
            events: result.data.node.events || [],
            outgoing_actions: result.data.node.outgoing_actions || []
          }
        };
        
        const newStoryTree = {
          nodes: { [initialNode.id]: initialNode },
          connections: [],
          root_node_id: initialNode.id
        };
        
        // Update the project with the initial node
        await authService.updateProject(projectId, {
          start_node_id: initialNode.id,
          story_tree: newStoryTree
        });
        
        // Set both story tree and project ID after everything is ready
        setStoryTree(newStoryTree);
        setCurrentProjectId(projectId);
        
        console.log('New story created:', {
          project_id: projectId,
          node_id: initialNode.id,
          story_tree: newStoryTree
        });
        
        return result;
      }
      return result;
    } catch (error) {
      console.error('Failed to create story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create story';
      setError(errorMessage);
      setCurrentProjectId(null);
      return null;
    }
  };

  const handleContinueStory = async (currentNode: any, selectedAction: any, worldState: any, projectIdFromChild: any) => {
    const projectId = projectIdFromChild || currentProjectId;
    console.log("currently handling continue story with projectId:", projectId);
    if (!projectId) {
      console.error('No project ID available');
      handleApiError('No project ID available');
      return null;
    }

    const payload = {
      request_type: "generate_next_node",
      context: { 
        world_state: worldState, 
        selected_action: selectedAction,
        project_id: projectId
      },
      current_node: currentNode,
      metadata: { project_id: projectId }
    };
    console.log("payload:", payload);

    try {

        const response = await callNarrativeAPI(payload);

        console.log("response:", response);

        if (response && response.success && response.data) {
            const newNode = response.data.node;
            const newWorldState = response.data.world_state;

            // Format the new node to match StoryNode interface
            const formattedNode: StoryNode = {
                id: newNode.id,
                level: currentNode.level + 1,
                type: 'scene',
                parent_node_id: currentNode.id,
                data: {
                    scene: newNode.scene,
                    events: newNode.events,
                    outgoing_actions: newNode.outgoing_actions
                }
            };

            // Create new connection
            const newConnection = {
                from_node_id: currentNode.id,
                to_node_id: formattedNode.id,
                action_id: selectedAction?.id || '',
                action_description: selectedAction?.description || 'Continue'
            };

            // Update the story tree state
            setStoryTree(prevTree => {
                if (!prevTree) {
                    // If no tree exists, create a new one
                    return {
                        nodes: {
                            [currentNode.id]: currentNode,
                            [formattedNode.id]: formattedNode
                        },
                        connections: [newConnection],
                        root_node_id: currentNode.id
                    };
                }

                // Add new node and connection to existing tree
                return {
                    ...prevTree,
                    nodes: {
                        ...prevTree.nodes,
                        [formattedNode.id]: formattedNode
                    },
                    connections: [...prevTree.connections, newConnection]
                };
            });

            // Save the new node to the project
            await authService.saveProjectNode(projectId, formattedNode);
            
            // Update the project's story tree
            const updatedTree = await authService.loadProjectStoryTree(projectId);
            if (updatedTree.success && updatedTree.data) {
                const transformedStory = transformStoryData(updatedTree.data);
                setStoryTree(transformedStory);
            }

            // Log for debugging
            console.log('Story update:', {
                project_id: projectId,
                new_node: formattedNode,
                story_tree: updatedTree
            });

            return formattedNode;
        } else {
            console.error('Failed to generate next node:', response?.error || 'Unknown error');
            handleApiError(response?.error || 'Failed to generate next node');
            return null;
        }
    } catch (error: unknown) {
        console.error('Error in handleContinueStory:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        handleApiError(errorMessage);
        return null;
    }
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

      {/* Action Buttons */}
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
          onClick={() => handleContinueStory(null, null, {}, null)} 
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
      </div>

      {/* Input and Controls */}
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
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your story idea..."
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={async () => {
              if (!userInput.trim()) return;
              const result = await handleBootstrapStory(userInput);
              if (result?.success && result.data) {
                // Create initial story tree
                const initialNode: StoryNode = {
                  id: result.data.node.id || 'root',
                  level: 0,
                  type: 'scene',
                  data: {
                    scene: result.data.node.scene,
                    events: result.data.node.events || [],
                    outgoing_actions: result.data.node.outgoing_actions || []
                  }
                };
                
                setStoryTree({
                  nodes: { [initialNode.id]: initialNode },
                  connections: [],
                  root_node_id: initialNode.id
                });
                
                setUserInput('');
              }
            }}
            disabled={loading || !userInput.trim()}
            style={{
              padding: '12px 24px',
              background: loading ? 'var(--border-medium)' : 'var(--macaron-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </div>

      {/* Story Tree Visualization */}
      {storyTree && (
        <div style={{ marginBottom: '30px' }}>
          <StoryTreeGraph
            storyData={storyTree}
            projectId={currentProjectId || undefined}
            onNodeUpdate={(nodeId: string, updatedNode: StoryNode) => {
              setStoryTree((prevTree: StoryTree | null) => {
                if (!prevTree) return null;
                return {
                  ...prevTree,
                  nodes: {
                    ...prevTree.nodes,
                    [nodeId]: updatedNode
                  }
                };
              });
            }}
            onApiError={handleApiError}
            onStoryReload={handleStoryReload}
            onContinueStory={(currentNode, selectedAction, worldState, projectIdFromChild) => handleContinueStory(currentNode, selectedAction, worldState, projectIdFromChild)}
          />
        </div>
      )}

      {/* Loading State */}
      {loadingStory && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          Loading story...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--macaron-red)',
          background: 'var(--macaron-red-light)',
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          Error: {error}
        </div>
      )}

      {/* Example Modal */}
      <StoryExampleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectExample={handleSelectProject}
      />
    </div>
  );
};

export default NarrativeClient; 