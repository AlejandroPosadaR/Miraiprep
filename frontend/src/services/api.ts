const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_BASE_URL = (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/^http/, 'ws');

export { API_BASE_URL, WS_BASE_URL };

export interface AuthResponse {
  token: string;
  userId?: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  title: string;
  interviewType: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  seq: number;
  role: 'USER' | 'INTERVIEWER';
  messageStatus: string;
  content: string;
  audioUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.method === 'POST' || options.method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string>),
    };
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof data?.message === 'string' ? data.message : 'Request failed';
      throw new Error(msg);
    }
    return data as T;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          userId: data.userId,
          email: data.email,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
        })
      );
    }
    return data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          userId: data.userId,
          email: data.email,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
        })
      );
    }
    return data;
  }

  async getCurrentUser(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/me', { method: 'GET' });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getStoredUser(): { userId?: string; email: string; username: string; firstName: string; lastName: string } | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  async getInterviewSessions(): Promise<InterviewSession[]> {
    return this.request<InterviewSession[]>('/api/v1/interview-sessions', { method: 'GET' });
  }

  async createInterviewSession(params: {
    userId: string;
    title: string;
    interviewType: string;
  }): Promise<InterviewSession> {
    return this.request<InterviewSession>('/api/v1/interview-sessions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async completeSession(sessionId: string): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/api/v1/interview-sessions/${sessionId}/complete`, {
      method: 'PUT',
    });
  }

  async abortSession(sessionId: string): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/api/v1/interview-sessions/${sessionId}/abort`, {
      method: 'PUT',
    });
  }

  async getMessages(
    sessionId: string,
    opts?: { cursorSeq?: number; limit?: number }
  ): Promise<Message[]> {
    const sp = new URLSearchParams();
    if (opts?.cursorSeq != null) sp.set('cursorSeq', String(opts.cursorSeq));
    if (opts?.limit != null) sp.set('limit', String(opts.limit));
    const qs = sp.toString();
    return this.request<Message[]>(
      `/api/v1/sessions/${sessionId}/messages/${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
  }
}

export const api = new ApiService();
