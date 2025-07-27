export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
  is_premium: boolean;
  token_balance: number;
  created_at: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

interface ApiError {
  detail: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  world_setting: string;
  characters: string[];
  style: string;
  start_node_id?: string;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = 'http://localhost:8000';

class AuthService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('access_token');
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.makeRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Store token
      this.token = response.access_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<User> {
    try {
      const response = await this.makeRequest<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.makeRequest<User>('/auth/me');
      localStorage.setItem('user', JSON.stringify(response));
      return response;
    } catch (error) {
      console.error('Failed to get current user:', error);
      this.logout(); // Clear invalid token
      throw error;
    }
  }

  async getTokenBalance(): Promise<{ user_id: string; token_balance: number }> {
    try {
      return await this.makeRequest<{ user_id: string; token_balance: number }>('/auth/token-balance');
    } catch (error) {
      console.error('Failed to get token balance:', error);
      throw error;
    }
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        return null;
      }
    }
    return null;
  }

  async getUserProjects(): Promise<Project[]> {
    try {
      const response = await this.makeRequest<Project[]>('/user/projects');
      return response;
    } catch (error) {
      console.error('Failed to get user projects:', error);
      throw error;
    }
  }

  async loadProjectStoryTree(projectId: string): Promise<any> {
    try {
      const response = await this.makeRequest<any>(`/user/projects/${projectId}/story-tree`);
      return response;
    } catch (error) {
      console.error('Failed to load project story tree:', error);
      throw error;
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

// Export a singleton instance
export const authService = new AuthService();
export type { LoginRequest, LoginResponse, RegisterRequest }; 