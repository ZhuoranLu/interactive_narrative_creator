import { useState, useCallback } from 'react';

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

export const useNarrative = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const API_BASE_URL = 'http://localhost:8000';

  const callNarrativeAPI = useCallback(async (payload: NarrativePayload): Promise<NarrativeResponse | null> => {
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
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    callNarrativeAPI,
    loading,
    error,
  };
}; 