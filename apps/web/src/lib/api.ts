import type {
  UserDto,
  ResumeDto,
  JobDescriptionDto,
  AnalysisDetailDto,
  AnalysisListItemDto,
} from '@jev/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, options);
  
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    
    let message = 'An error occurred';
    try {
      const body = await res.json();
      if (body.error && body.error.message) {
        message = body.error.message;
      }
    } catch (e) {
      // Ignored
    }
    
    throw new ApiError(res.status, message);
  }

  // If status is 204 No Content, return empty object (though Express might not send 204)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  login: (data: any) =>
    fetchApi<{ id: string; email: string }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  register: (data: any) =>
    fetchApi<{ id: string; email: string }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  me: () => fetchApi<{ id: string; email: string }>('/auth/me'),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', { method: 'POST' }),

  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return fetchApi<{ resume: ResumeDto }>('/resumes', {
      method: 'POST',
      body: formData,
    });
  },

  listResumes: () => fetchApi<{ resumes: ResumeDto[] }>('/resumes'),

  createJob: (data: { title: string; company?: string; description: string }) =>
    fetchApi<{ job: JobDescriptionDto }>('/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  createAnalysis: (data: { resumeId: string; jobDescriptionId: string }) =>
    fetchApi<{ id: string; score: number; analysis: any }>('/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  listAnalyses: () => fetchApi<{ analyses: AnalysisListItemDto[] }>('/analysis'),

  getAnalysis: (id: string) =>
    fetchApi<{ analysis: AnalysisDetailDto }>(`/analysis/${id}`),
};
