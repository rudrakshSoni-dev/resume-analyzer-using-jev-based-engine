/**
 * JEV Engine Types
 *
 * Hard constraint: This file must NOT import Express, Prisma, HTTP types, auth, cookies, or frontend libraries.
 */

export interface AnalyzeResumeInput {
  resume: string;
  jobDescription: string;
}

export interface SkillMatchDetails {
  score: number;
  matched: string[];
  missing: string[];
  totalExpected: number;
}

export interface KeywordRelevanceDetails {
  score: number;
  commonKeywords: string[];
  similarityIndex: number;
}

export interface ExperienceMatchDetails {
  score: number;
  requiredYears: number | null;
  candidateYears: number | null;
  seniorityMatch: boolean;
  requiredSeniority: string | null;
  candidateSeniority: string | null;
}

export interface EducationMatchDetails {
  score: number;
  requiredLevel: string | null;
  candidateLevel: string | null;
  meetsRequirement: boolean;
}

export interface StructuralCompletenessDetails {
  score: number;
  sectionsFound: string[];
  missingSections: string[];
}

export interface ScoreBreakdown {
  skillsMatch: SkillMatchDetails;
  keywordRelevance: KeywordRelevanceDetails;
  experienceMatch: ExperienceMatchDetails;
  educationMatch: EducationMatchDetails;
  structuralCompleteness: StructuralCompletenessDetails;
}

export interface AnalyzeResumeOutput {
  score: number;
  breakdown?: ScoreBreakdown;
}

export interface ExtractedSkills {
  technicalSkills: string[];
  softSkills: string[];
  allSkills: string[];
}

export interface ExtractedExperience {
  years: number | null;
  seniorityLevels: string[];
  highestSeniority: string | null;
}

export interface ExtractedEducation {
  highestDegree: string | null;
  degreesFound: string[];
  fieldsOfStudy: string[];
}

export interface ExtractedDocumentData {
  cleanText: string;
  tokens: string[];
  ngrams: string[];
  skills: ExtractedSkills;
  experience: ExtractedExperience;
  education: ExtractedEducation;
  sections: string[];
}
