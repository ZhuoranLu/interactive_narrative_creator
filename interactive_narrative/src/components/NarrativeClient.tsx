import { useState } from 'react';

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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Interactive Narrative Client</h2>
      
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
    </div>
  );
};

export default NarrativeClient; 