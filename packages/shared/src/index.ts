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

export interface AnalyzeResumeInput {
  resume: string;
  jobDescription: string;
}

export interface AnalyzeResumeOutput {
  score: number;
}

export interface CreateAnalysisInput {
  resumeId: string;
  jobDescriptionId: string;
}

export interface AnalysisDto {
  id: string;
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisSummaryDto {
  id: string;
  resumeId: string;
  jobDescriptionId: string;
  score: number;
  createdAt: string;
}

export interface AnalysisListItemDto extends AnalysisDto {
  resume: ResumeSummaryDto;
  jobDescription: JobDescriptionSummaryDto;
}

export interface SkillsBreakdownDto {
  score: number;
  weight: number;
  matchedSkills: string[];
  missingSkills: string[];
  totalRequiredSkills: number;
}

export interface ExperienceBreakdownDto {
  score: number;
  weight: number;
  requiredYears: number | null;
  extractedYears: number | null;
  requiredSeniority: string | null;
  detectedSeniority: string | null;
  matchLevel: 'exact' | 'exceeds' | 'partial' | 'underqualified' | 'neutral';
}

export interface RelevanceBreakdownDto {
  score: number;
  weight: number;
  tokenOverlapRatio: number;
  matchedKeywords: string[];
}

export interface EducationBreakdownDto {
  score: number;
  weight: number;
  requiredDegree: string | null;
  detectedDegrees: string[];
  matchedDegrees: string[];
}

export interface ScoringBreakdownDto {
  skills: SkillsBreakdownDto;
  experience: ExperienceBreakdownDto;
  relevance: RelevanceBreakdownDto;
  education: EducationBreakdownDto;
}

export interface AnalysisDetailDto extends AnalysisDto {
  resume: ResumeDto;
  jobDescription: JobDescriptionDto;
  breakdown: ScoringBreakdownDto;
}
