/**
 * JEV Engine Types
 * Pure TypeScript interfaces for resume analysis scoring.
 * Strict Isolation: No external frameworks, databases, or HTTP types allowed.
 */

export interface AnalyzeResumeInput {
  resume: string;
  jobDescription: string;
}

export interface SkillsBreakdown {
  score: number; // 0–100
  weight: number; // e.g., 0.40
  matchedSkills: string[];
  missingSkills: string[];
  totalRequiredSkills: number;
}

export interface ExperienceBreakdown {
  score: number; // 0–100
  weight: number; // e.g., 0.25
  requiredYears: number | null;
  extractedYears: number | null;
  requiredSeniority: string | null;
  detectedSeniority: string | null;
  matchLevel: 'exact' | 'exceeds' | 'partial' | 'underqualified' | 'neutral';
}

export interface RelevanceBreakdown {
  score: number; // 0–100
  weight: number; // e.g., 0.20
  tokenOverlapRatio: number;
  matchedKeywords: string[];
}

export interface EducationBreakdown {
  score: number; // 0–100
  weight: number; // e.g., 0.15
  requiredDegree: string | null;
  detectedDegrees: string[];
  matchedDegrees: string[];
}

export interface ScoringBreakdown {
  skills: SkillsBreakdown;
  experience: ExperienceBreakdown;
  relevance: RelevanceBreakdown;
  education: EducationBreakdown;
}

export interface AnalyzeResumeResult {
  score: number; // 0–100 (integer)
  breakdown: ScoringBreakdown;
}
