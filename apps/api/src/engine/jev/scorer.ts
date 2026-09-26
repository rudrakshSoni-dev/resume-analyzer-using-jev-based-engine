/**
 * JEV Engine Scoring System
 * Deterministic multi-dimensional scoring algorithms.
 * Strict Isolation: No external frameworks, databases, or HTTP types allowed.
 */

import {
  AnalyzeResumeInput,
  AnalyzeResumeResult,
  SkillsBreakdown,
  ExperienceBreakdown,
  RelevanceBreakdown,
  EducationBreakdown,
  ScoringBreakdown
} from './types.js';

import {
  tokenize,
  extractSkills,
  extractYearsOfExperience,
  extractSeniority,
  extractEducation,
  computeJaccardSimilarity,
  SENIORITY_LEVELS
} from './utils.js';

const WEIGHT_SKILLS = 0.40;
const WEIGHT_EXPERIENCE = 0.25;
const WEIGHT_RELEVANCE = 0.20;
const WEIGHT_EDUCATION = 0.15;

/**
 * Evaluates skill overlap between Job Description and Resume.
 */
export function scoreSkills(resumeText: string, jdText: string): SkillsBreakdown {
  const jdSkills = extractSkills(jdText);
  const resumeSkills = extractSkills(resumeText);
  const resumeSkillSet = new Set(resumeSkills);

  if (jdSkills.length === 0) {
    // If JD has no predefined skills from dictionary, evaluate top technical tokens
    const jdTokens = tokenize(jdText);
    const resumeTokens = new Set(tokenize(resumeText));

    const matchedTokens: string[] = [];
    const missingTokens: string[] = [];

    for (const token of jdTokens) {
      if (resumeTokens.has(token)) {
        if (!matchedTokens.includes(token)) matchedTokens.push(token);
      } else {
        if (!missingTokens.includes(token)) missingTokens.push(token);
      }
    }

    const total = matchedTokens.length + missingTokens.length;
    const ratio = total > 0 ? matchedTokens.length / total : 0;
    const rawScore = Math.round(ratio * 100);

    return {
      score: Math.min(Math.max(rawScore, 0), 100),
      weight: WEIGHT_SKILLS,
      matchedSkills: matchedTokens.slice(0, 10),
      missingSkills: missingTokens.slice(0, 10),
      totalRequiredSkills: total
    };
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of jdSkills) {
    if (resumeSkillSet.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const matchRatio = matchedSkills.length / jdSkills.length;
  const rawScore = Math.round(matchRatio * 100);

  return {
    score: Math.min(Math.max(rawScore, 0), 100),
    weight: WEIGHT_SKILLS,
    matchedSkills,
    missingSkills,
    totalRequiredSkills: jdSkills.length
  };
}

/**
 * Evaluates years of experience and seniority level.
 */
export function scoreExperience(resumeText: string, jdText: string): ExperienceBreakdown {
  const reqYears = extractYearsOfExperience(jdText);
  const candYears = extractYearsOfExperience(resumeText);
  const reqSeniority = extractSeniority(jdText);
  const candSeniority = extractSeniority(resumeText);

  let yearsScore = 75; // Baseline if neither specifies
  let levelMatch: ExperienceBreakdown['matchLevel'] = 'neutral';

  if (reqYears !== null && candYears !== null) {
    if (candYears >= reqYears) {
      yearsScore = 100;
      levelMatch = candYears > reqYears ? 'exceeds' : 'exact';
    } else if (candYears === reqYears - 1) {
      yearsScore = 80;
      levelMatch = 'partial';
    } else if (candYears >= Math.floor(reqYears / 2)) {
      yearsScore = 55;
      levelMatch = 'partial';
    } else {
      yearsScore = 25;
      levelMatch = 'underqualified';
    }
  } else if (reqYears !== null && candYears === null) {
    // JD specifies years, resume doesn't explicitly state "X years"
    yearsScore = 45;
    levelMatch = 'partial';
  } else if (reqYears === null && candYears !== null) {
    yearsScore = 90;
    levelMatch = 'exceeds';
  }

  // Factor in seniority title matching
  let seniorityScore = 75;
  if (reqSeniority && candSeniority) {
    const reqLevel = SENIORITY_LEVELS.find(l => l.level === reqSeniority);
    const candLevel = SENIORITY_LEVELS.find(l => l.level === candSeniority);

    if (reqLevel && candLevel) {
      if (candLevel.weight >= reqLevel.weight) {
        seniorityScore = 100;
      } else {
        const diff = reqLevel.weight - candLevel.weight;
        seniorityScore = Math.max(30, 100 - diff * 30);
      }
    }
  } else if (reqSeniority && !candSeniority) {
    seniorityScore = 50;
  }

  const combinedScore = Math.round((yearsScore * 0.6) + (seniorityScore * 0.4));

  return {
    score: Math.min(Math.max(combinedScore, 0), 100),
    weight: WEIGHT_EXPERIENCE,
    requiredYears: reqYears,
    extractedYears: candYears,
    requiredSeniority: reqSeniority,
    detectedSeniority: candSeniority,
    matchLevel: levelMatch
  };
}

/**
 * Evaluates semantic relevance and keyword density.
 */
export function scoreRelevance(resumeText: string, jdText: string): RelevanceBreakdown {
  const resumeTokens = tokenize(resumeText);
  const jdTokens = tokenize(jdText);

  if (resumeTokens.length === 0 || jdTokens.length === 0) {
    return {
      score: 0,
      weight: WEIGHT_RELEVANCE,
      tokenOverlapRatio: 0,
      matchedKeywords: []
    };
  }

  const jaccard = computeJaccardSimilarity(resumeTokens, jdTokens);

  // Find top matching keywords
  const resumeTokenSet = new Set(resumeTokens);
  const matchedTokens = new Set<string>();
  for (const token of jdTokens) {
    if (resumeTokenSet.has(token)) {
      matchedTokens.add(token);
    }
  }

  // Jaccard for text typically ranges from 0.05 to 0.40 in domain-matching text
  // Scale dynamically to 0-100 curve
  const scaledScore = Math.min(Math.round((jaccard / 0.35) * 100), 100);

  return {
    score: scaledScore,
    weight: WEIGHT_RELEVANCE,
    tokenOverlapRatio: Math.round(jaccard * 100) / 100,
    matchedKeywords: Array.from(matchedTokens).slice(0, 15)
  };
}

/**
 * Evaluates educational degrees and academic background.
 */
export function scoreEducation(resumeText: string, jdText: string): EducationBreakdown {
  const reqDegrees = extractEducation(jdText);
  const candDegrees = extractEducation(resumeText);

  const degreeRank: Record<string, number> = {
    phd: 4,
    master: 3,
    bachelor: 2,
    associate: 1
  };

  let score = 75; // Baseline default if JD has no degree requirement
  let matchedDegrees: string[] = [];

  if (reqDegrees.length > 0) {
    const highestReq = Math.max(...reqDegrees.map(d => degreeRank[d] || 0));
    const highestCand = candDegrees.length > 0 ? Math.max(...candDegrees.map(d => degreeRank[d] || 0)) : 0;

    matchedDegrees = candDegrees.filter(d => reqDegrees.includes(d));

    if (highestCand >= highestReq && highestCand > 0) {
      score = 100;
    } else if (highestCand > 0 && highestCand < highestReq) {
      score = 65;
    } else {
      // Required degree but candidate has none found
      score = 30;
    }
  } else if (candDegrees.length > 0) {
    // No specific requirement but candidate holds higher education
    score = 90;
    matchedDegrees = candDegrees;
  }

  return {
    score: Math.min(Math.max(score, 0), 100),
    weight: WEIGHT_EDUCATION,
    requiredDegree: reqDegrees.length > 0 ? reqDegrees[0] : null,
    detectedDegrees: candDegrees,
    matchedDegrees
  };
}

/**
 * Computes composite resume score (0–100) based on weighted multi-dimensional evaluation.
 */
export function calculateScore(input: AnalyzeResumeInput): AnalyzeResumeResult {
  const { resume, jobDescription } = input;

  // Handle empty or blank inputs
  if (!resume || !jobDescription || !resume.trim() || !jobDescription.trim()) {
    const emptyBreakdown: ScoringBreakdown = {
      skills: { score: 0, weight: WEIGHT_SKILLS, matchedSkills: [], missingSkills: [], totalRequiredSkills: 0 },
      experience: { score: 0, weight: WEIGHT_EXPERIENCE, requiredYears: null, extractedYears: null, requiredSeniority: null, detectedSeniority: null, matchLevel: 'neutral' },
      relevance: { score: 0, weight: WEIGHT_RELEVANCE, tokenOverlapRatio: 0, matchedKeywords: [] },
      education: { score: 0, weight: WEIGHT_EDUCATION, requiredDegree: null, detectedDegrees: [], matchedDegrees: [] }
    };
    return {
      score: 0,
      breakdown: emptyBreakdown
    };
  }

  const skills = scoreSkills(resume, jobDescription);
  const experience = scoreExperience(resume, jobDescription);
  const relevance = scoreRelevance(resume, jobDescription);
  const education = scoreEducation(resume, jobDescription);

  const weightedTotal =
    (skills.score * WEIGHT_SKILLS) +
    (experience.score * WEIGHT_EXPERIENCE) +
    (relevance.score * WEIGHT_RELEVANCE) +
    (education.score * WEIGHT_EDUCATION);

  const finalScore = Math.min(Math.max(Math.round(weightedTotal), 0), 100);

  return {
    score: finalScore,
    breakdown: {
      skills,
      experience,
      relevance,
      education
    }
  };
}
