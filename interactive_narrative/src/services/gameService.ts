// Game Service for React Frontend
// Handles game data, asset management, and AI generation

const API_BASE_URL = 'http://localhost:8000/api';

export interface GameData {
  game_info: {
    title: string;
    description: string;
    version: string;
    style: string;
  };
  assets: {
    characters: Record<string, any>;
    backgrounds: Record<string, any>;
    audio: Record<string, any>;
  };
  game_scenes: Array<{
    scene_id: string;
    scene_title: string;
    background_image: string;
    content_sequence: Array<{
      type: 'dialogue' | 'narration';
      speaker: string;
      text: string;
      character_image?: string;
    }>;
    player_choices: Array<{
      choice_id: string;
      choice_text: string;
      choice_type: 'continue' | 'stay';
      target_scene_id?: string;
      immediate_response?: string;
    }>;
  }>;
}

export interface GameAsset {
  name: string;
  info: {
    user_uploaded?: boolean;
    image_path?: string;
    placeholder_image?: string;
    prompt_for_ai?: string;
    generation_status?: string;
    uploaded_by?: string;
    uploaded_at?: string;
  };
  exists: boolean;
}

export interface AIGenerationRequest {
  asset_type: 'character' | 'background' | 'audio';
  prompt: string;
  style?: string;
}

export interface AIGenerationResponse {
  message: string;
  asset_id: string;
  asset_path: string;
  prompt: string;
  style: string;
  status: 'generating' | 'completed' | 'failed';
  estimated_completion: string;
}

class GameService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private getUploadAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getGameData(): Promise<GameData> {
    const response = await fetch(`${API_BASE_URL}/game/data`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch game data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getGameConfig(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/game/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch game config: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getAITasks(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/game/ai-tasks`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI tasks: ${response.statusText}`);
    }
    
    return response.json();
  }

  async listAssets(assetType: 'character' | 'background' | 'audio'): Promise<{assets: GameAsset[]}> {
    const response = await fetch(`${API_BASE_URL}/game/assets/${assetType}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list ${assetType} assets: ${response.statusText}`);
    }
    
    return response.json();
  }

  async uploadAsset(
    assetType: 'character' | 'background' | 'audio',
    assetName: string,
    file: File
  ): Promise<{message: string; asset_path: string; asset_name: string}> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    formData.append('asset_name', assetName);

    const response = await fetch(`${API_BASE_URL}/game/assets/upload`, {
      method: 'POST',
      headers: this.getUploadAuthHeaders(),
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }
    
    return response.json();
  }

  async generateAIAsset(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const response = await fetch(`${API_BASE_URL}/game/assets/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate AI asset: ${response.statusText}`);
    }
    
    return response.json();
  }

  async regenerateGameData(): Promise<{message: string; output: string}> {
    const response = await fetch(`${API_BASE_URL}/game/regenerate`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to regenerate game data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getPreviewUrls(): Promise<{preview_url: string; enhanced_preview_url: string}> {
    const response = await fetch(`${API_BASE_URL}/game/preview`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get preview URLs: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Utility methods for asset management
  getAssetUrl(assetPath: string): string {
    if (assetPath.startsWith('/game-assets/')) {
      return `http://localhost:8000${assetPath}`;
    }
    return assetPath;
  }

  isUserUploadedAsset(asset: GameAsset): boolean {
    return asset.info.user_uploaded === true;
  }

  isAIGeneratedAsset(asset: GameAsset): boolean {
    return asset.info.generation_status !== undefined;
  }

  isPlaceholderAsset(asset: GameAsset): boolean {
    return asset.info.placeholder_image !== undefined && !this.isUserUploadedAsset(asset);
  }

  getAssetStatusBadge(asset: GameAsset): {
    text: string;
    color: 'green' | 'blue' | 'gray' | 'yellow' | 'red';
  } {
    if (this.isUserUploadedAsset(asset)) {
      return { text: 'User Upload', color: 'green' };
    }
    
    if (this.isAIGeneratedAsset(asset)) {
      const status = asset.info.generation_status;
      switch (status) {
        case 'completed':
          return { text: 'AI Generated', color: 'blue' };
        case 'generating':
          return { text: 'Generating...', color: 'yellow' };
        case 'failed':
          return { text: 'Generation Failed', color: 'red' };
        default:
          return { text: 'AI Ready', color: 'blue' };
      }
    }
    
    return { text: 'Placeholder', color: 'gray' };
  }
}

export const gameService = new GameService(); 