/**
 * JEV Engine Entrypoint
 * Framework-free, isolated resume scoring module.
 * Contract: analyzeResume({ resume, jobDescription }) -> { score, breakdown }
 */

import { AnalyzeResumeInput, AnalyzeResumeResult } from './types.js';
import { calculateScore } from './scorer.js';

export * from './types.js';
export * from './utils.js';
export * from './scorer.js';

/**
 * Pure scoring function that analyzes a resume against a job description.
 * Zero framework, database, or HTTP dependencies.
 */
export function analyzeResume(input: AnalyzeResumeInput): AnalyzeResumeResult {
  return calculateScore(input);
}
