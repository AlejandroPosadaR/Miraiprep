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
  tier?: string;
  messageCount?: number;
  messageLimit?: number;
  remainingMessages?: number;
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
  experienceYears?: number;
  jobDescription?: string;
  evaluationScore?: number;
  evaluationKnowledge?: number;
  evaluationCommunication?: number;
  evaluationProblemSolving?: number;
  evaluationTechnicalDepth?: number;
  evaluationFeedback?: string;
  evaluatedAt?: string;
}

export interface EvaluationResult {
  overallScore: number;
  knowledge: number;
  communication: number;
  problemSolving: number;
  technicalDepth: number;
  feedback: string;
  strengths?: string;
  areasForImprovement?: string;
}

export interface PaginatedSessionsResponse {
  sessions: InterviewSession[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
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

export const SESSION_EXPIRED_EVENT = 'session-expired';

export interface ApiError extends Error {
  code?: string;
  status?: number;
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
      // Handle token expiration - 401 with TOKEN_EXPIRED code
      if (res.status === 401 && (data?.code === 'TOKEN_EXPIRED' || data?.code === 'TOKEN_INVALID')) {
        this.handleSessionExpired(data?.message || 'Your session has expired. Please log in again.');
      }
      
      const msg = typeof data?.message === 'string' ? data.message : 'Request failed';
      const error = new Error(msg) as ApiError;
      error.code = data?.code;
      error.status = res.status;
      throw error;
    }
    return data as T;
  }

  private handleSessionExpired(message: string): void {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Store the message to display on login page
    sessionStorage.setItem('sessionExpiredMessage', message);
    
    // Dispatch custom event for AuthContext to catch
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { message } }));
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
          tier: data.tier,
          messageCount: data.messageCount,
          messageLimit: data.messageLimit,
          remainingMessages: data.remainingMessages,
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
          tier: data.tier,
          messageCount: data.messageCount,
          messageLimit: data.messageLimit,
          remainingMessages: data.remainingMessages,
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

  getStoredUser(): { 
    userId?: string; 
    email: string; 
    username: string; 
    firstName: string; 
    lastName: string;
    tier?: string;
    messageCount?: number;
    messageLimit?: number;
    remainingMessages?: number;
  } | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  async getInterviewSessions(): Promise<InterviewSession[]> {
    return this.request<InterviewSession[]>('/api/v1/interview-sessions', { method: 'GET' });
  }

  async getInterviewSessionsPaginated(options?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedSessionsResponse> {
    const sp = new URLSearchParams();
    if (options?.cursor) sp.set('cursor', options.cursor);
    if (options?.limit != null) sp.set('limit', String(options.limit));
    const qs = sp.toString();
    return this.request<PaginatedSessionsResponse>(
      `/api/v1/interview-sessions/paginated${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    );
  }

  async createInterviewSession(params: {
    userId: string;
    title: string;
    interviewType: string;
    experienceYears?: number;
    jobDescription?: string;
  }): Promise<InterviewSession> {
    return this.request<InterviewSession>('/api/v1/interview-sessions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getInterviewSession(sessionId: string): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/api/v1/interview-sessions/${sessionId}`, {
      method: 'GET',
    });
  }

  async evaluateInterview(sessionId: string): Promise<EvaluationResult> {
    return this.request<EvaluationResult>(`/api/v1/interview-sessions/${sessionId}/evaluate`, {
      method: 'POST',
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

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(formData: FormData): Promise<{ text: string }> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Don't set Content-Type - browser will set it with boundary for FormData
    };
    
    const res = await fetch(`${API_BASE_URL}/api/v1/speech/transcribe`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof data?.message === 'string' ? data.message : 'Transcription failed';
      throw new Error(msg);
    }
    return data as { text: string };
  }

  /**
   * Generate speech audio using OpenAI TTS API
   */
  async textToSpeech(text: string, options?: { 
    voice?: string; 
    speed?: number;
    sequenceNumber?: number;
    messageId?: string;
  }): Promise<{ blob: Blob; sequenceNumber?: number; messageId?: string }> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    
    const res = await fetch(`${API_BASE_URL}/api/v1/speech/synthesize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        voice: options?.voice || 'alloy',
        speed: options?.speed || 1.0,
        sequenceNumber: options?.sequenceNumber,
        messageId: options?.messageId,
      }),
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data?.message === 'string' ? data.message : 'TTS failed';
      throw new Error(msg);
    }
    
    const blob = await res.blob();
    const seqHeader = res.headers.get('X-Audio-Sequence');
    const msgIdHeader = res.headers.get('X-Message-Id');
    
    return {
      blob,
      sequenceNumber: seqHeader ? parseInt(seqHeader, 10) : options?.sequenceNumber,
      messageId: msgIdHeader || options?.messageId,
    };
  }
}

export const api = new ApiService();
