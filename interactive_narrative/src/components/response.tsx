import { useState } from 'react';

interface ApiResponse {
  message: string;
}

const Response = () => {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const API_BASE_URL = 'http://localhost:8000';

  const fetchFromAPI = async (endpoint: string, data?: any) => {
    setLoading(true);
    setError('');
    
    try {
      const config: RequestInit = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (data) {
        config.body = JSON.stringify(data);
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const result: ApiResponse = await res.json();
      setResponse(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStory = () => {
    fetchFromAPI('/generate_story', { prompt: 'Generate a new story' });
  };

  const handleContinueStory = () => {
    fetchFromAPI('/continue_story', { story: response });
  };

  const handleGeneratePlot = () => {
    fetchFromAPI('/generate_plot', { theme: 'adventure' });
  };

  const handleTestConnection = () => {
    fetchFromAPI('/');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Interactive Narrative API</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleTestConnection} disabled={loading}>
          Test Connection
        </button>
        <button onClick={handleGenerateStory} disabled={loading} style={{ marginLeft: '10px' }}>
          Generate Story
        </button>
        <button onClick={handleContinueStory} disabled={loading} style={{ marginLeft: '10px' }}>
          Continue Story
        </button>
        <button onClick={handleGeneratePlot} disabled={loading} style={{ marginLeft: '10px' }}>
          Generate Plot
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
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default Response;
