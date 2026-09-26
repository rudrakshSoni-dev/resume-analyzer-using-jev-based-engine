// shared types between api and web

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
  };
}

export interface HealthCheckResponse {
  status: 'ok';
}

export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeDto {
  id: string;
  userId: string;
  filename: string;
  rawText: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeSummaryDto {
  id: string;
  filename: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

