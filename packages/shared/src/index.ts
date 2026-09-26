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

export interface JobDescriptionDto {
  id: string;
  userId: string;
  title: string;
  company?: string | null;
  description: string;
  createdAt: string;
}

export interface JobDescriptionSummaryDto {
  id: string;
  title: string;
  company?: string | null;
  createdAt: string;
}

export interface CreateJobDescriptionInput {
  title: string;
  company?: string;
  description: string;
}
