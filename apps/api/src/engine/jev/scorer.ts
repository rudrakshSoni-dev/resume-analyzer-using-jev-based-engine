/**
 * JEV Engine Scorer
 *
 * Implements deterministic scoring across 5 core dimensions:
 * 1. Skills Match (40%)
 * 2. Keyword & Vocabulary Relevance (25%)
 * 3. Experience & Seniority Match (20%)
 * 4. Education & Credentials (10%)
 * 5. Structural Completeness (5%)
 *
 * Hard constraint: This file must NOT import Express, Prisma, HTTP types, auth, cookies, or frontend libraries.
 */

import {
  AnalyzeResumeInput,
  AnalyzeResumeOutput,
  EducationMatchDetails,
  ExperienceMatchDetails,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedSkills,
  KeywordRelevanceDetails,
  ScoreBreakdown,
  SkillMatchDetails,
  StructuralCompletenessDetails,
} from './types.js';

import {
  DEGREE_RANK,
  extractInformativeKeywords,
  parseDocument,
  SENIORITY_RANK,
} from './utils.js';

/**
 * Evaluates skill coverage between the resume and job description.
 */
export function calculateSkillsMatch(
  resumeSkills: ExtractedSkills,
  jdSkills: ExtractedSkills
): SkillMatchDetails {
  const jdTech = jdSkills.technicalSkills;
  const resumeTechSet = new Set(resumeSkills.technicalSkills);

  const matchedTech: string[] = [];
  const missingTech: string[] = [];

  for (const skill of jdTech) {
    if (resumeTechSet.has(skill)) {
      matchedTech.push(skill);
    } else {
      missingTech.push(skill);
    }
  }

  // Soft skills comparison
  const jdSoft = jdSkills.softSkills;
  const resumeSoftSet = new Set(resumeSkills.softSkills);
  const matchedSoft: string[] = [];
  const missingSoft: string[] = [];

  for (const skill of jdSoft) {
    if (resumeSoftSet.has(skill)) {
      matchedSoft.push(skill);
    } else {
      missingSoft.push(skill);
    }
  }

  const allMatched = [...matchedTech, ...matchedSoft];
  const allMissing = [...missingTech, ...missingSoft];
  const totalExpected = jdTech.length + jdSoft.length;

  let score = 0;

  if (totalExpected === 0) {
    // If JD doesn't explicitly name known dictionary skills,
    // evaluate based on resume's demonstrated technical skill breadth
    const count = resumeSkills.allSkills.length;
    score = count >= 5 ? 85 : count >= 3 ? 70 : count >= 1 ? 55 : 40;
  } else {
    // Weighted: technical skills count for 80% of skills score, soft skills count for 20%
    const techWeight = jdTech.length > 0 ? (matchedTech.length / jdTech.length) : 1;
    const softWeight = jdSoft.length > 0 ? (matchedSoft.length / jdSoft.length) : 1;

    let weightedRatio: number;
    if (jdTech.length > 0 && jdSoft.length > 0) {
      weightedRatio = 0.8 * techWeight + 0.2 * softWeight;
    } else if (jdTech.length > 0) {
      weightedRatio = techWeight;
    } else {
      weightedRatio = softWeight;
    }

    score = Math.round(weightedRatio * 100);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matched: allMatched,
    missing: allMissing,
    totalExpected,
  };
}

/**
 * Computes vocabulary & keyword relevance (TF overlap / Jaccard similarity on non-stopwords).
 */
export function calculateKeywordRelevance(
  resumeTokens: string[],
  jdTokens: string[]
): KeywordRelevanceDetails {
  const resumeKeywords = extractInformativeKeywords(resumeTokens);
  const jdKeywords = extractInformativeKeywords(jdTokens);

  if (jdKeywords.length === 0 || resumeKeywords.length === 0) {
    return {
      score: 0,
      commonKeywords: [],
      similarityIndex: 0,
    };
  }

  const resumeFreq = new Map<string, number>();
  for (const w of resumeKeywords) {
    resumeFreq.set(w, (resumeFreq.get(w) || 0) + 1);
  }

  const jdFreq = new Map<string, number>();
  for (const w of jdKeywords) {
    jdFreq.set(w, (jdFreq.get(w) || 0) + 1);
  }

  const commonKeywords: string[] = [];
  let dotProduct = 0;
  let jdMagnitudeSq = 0;
  let resumeMagnitudeSq = 0;

  // Cosine similarity on informative keyword vectors
  for (const [word, jdCount] of jdFreq.entries()) {
    jdMagnitudeSq += jdCount * jdCount;
    const resCount = resumeFreq.get(word) || 0;
    if (resCount > 0) {
      dotProduct += jdCount * resCount;
      commonKeywords.push(word);
    }
  }

  for (const [, resCount] of resumeFreq.entries()) {
    resumeMagnitudeSq += resCount * resCount;
  }

  const denominator = Math.sqrt(jdMagnitudeSq) * Math.sqrt(resumeMagnitudeSq);
  const cosineSim = denominator > 0 ? (dotProduct / denominator) : 0;

  // Keyword coverage ratio in JD
  const jdUniqueCount = jdFreq.size;
  const matchedUniqueCount = commonKeywords.length;
  const coverageRatio = jdUniqueCount > 0 ? (matchedUniqueCount / jdUniqueCount) : 0;

  // Combined keyword score: 50% vector similarity + 50% keyword coverage
  const combinedMetric = 0.5 * cosineSim + 0.5 * coverageRatio;
  const score = Math.round(Math.min(100, combinedMetric * 130)); // 1.3 scaling factor for natural ATS threshold

  return {
    score: Math.max(0, Math.min(100, score)),
    commonKeywords: commonKeywords.slice(0, 30),
    similarityIndex: Math.round(cosineSim * 100) / 100,
  };
}

/**
 * Computes experience duration and seniority alignment.
 */
export function calculateExperienceMatch(
  resumeExp: ExtractedExperience,
  jdExp: ExtractedExperience
): ExperienceMatchDetails {
  const reqYears = jdExp.years;
  const candYears = resumeExp.years;
  const reqSeniority = jdExp.highestSeniority;
  const candSeniority = resumeExp.highestSeniority;

  let yearsScore = 100;

  if (reqYears !== null && reqYears > 0) {
    if (candYears === null || candYears === 0) {
      yearsScore = 30; // Candidate experience could not be reliably extracted from text
    } else if (candYears >= reqYears) {
      yearsScore = 100;
    } else if (candYears >= reqYears * 0.8) {
      yearsScore = 85;
    } else if (candYears >= reqYears * 0.5) {
      yearsScore = 65;
    } else {
      yearsScore = Math.max(20, Math.round((candYears / reqYears) * 60));
    }
  } else {
    // If JD doesn't state explicit years required, give score based on candidate having experience
    yearsScore = candYears !== null && candYears > 0 ? 90 : 75;
  }

  // Seniority alignment
  let seniorityScore = 100;
  let seniorityMatch = true;

  if (reqSeniority) {
    const reqRank = SENIORITY_RANK[reqSeniority] ?? 2;
    const candRank = candSeniority ? (SENIORITY_RANK[candSeniority] ?? 1) : (candYears && candYears >= 5 ? 3 : 1);

    if (candRank >= reqRank) {
      seniorityScore = 100;
      seniorityMatch = true;
    } else if (candRank === reqRank - 1) {
      seniorityScore = 75;
      seniorityMatch = false;
    } else {
      seniorityScore = 50;
      seniorityMatch = false;
    }
  }

  const finalScore = Math.round(0.7 * yearsScore + 0.3 * seniorityScore);

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    requiredYears: reqYears,
    candidateYears: candYears,
    seniorityMatch,
    requiredSeniority: reqSeniority,
    candidateSeniority: candSeniority,
  };
}

/**
 * Computes educational degree and credential alignment.
 */
export function calculateEducationMatch(
  resumeEdu: ExtractedEducation,
  jdEdu: ExtractedEducation
): EducationMatchDetails {
  const reqDegree = jdEdu.highestDegree;
  const candDegree = resumeEdu.highestDegree;

  if (!reqDegree) {
    // JD has no strict degree requirements
    const score = candDegree ? 95 : 80;
    return {
      score,
      requiredLevel: null,
      candidateLevel: candDegree,
      meetsRequirement: true,
    };
  }

  const reqRank = DEGREE_RANK[reqDegree] ?? 2;
  const candRank = candDegree ? (DEGREE_RANK[candDegree] ?? 0) : 0;

  let score = 0;
  let meetsRequirement = false;

  if (candRank >= reqRank) {
    score = 100;
    meetsRequirement = true;
  } else if (candRank === reqRank - 1) {
    score = 75;
    meetsRequirement = false;
  } else if (candRank > 0) {
    score = 50;
    meetsRequirement = false;
  } else {
    score = 30;
    meetsRequirement = false;
  }

  return {
    score,
    requiredLevel: reqDegree,
    candidateLevel: candDegree,
    meetsRequirement,
  };
}

/**
 * Checks presence of standard structural resume sections.
 */
export function calculateStructuralCompleteness(
  sectionsFound: string[]
): StructuralCompletenessDetails {
  const expectedSections = ['experience', 'skills', 'education', 'projects', 'summary'];
  const foundSet = new Set(sectionsFound);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const s of expectedSections) {
    if (foundSet.has(s)) {
      matched.push(s);
    } else {
      missing.push(s);
    }
  }

  // Experience, Skills, and Education are core (80%), Projects and Summary are bonus (20%)
  const hasCoreExp = foundSet.has('experience') ? 30 : 0;
  const hasCoreSkills = foundSet.has('skills') ? 30 : 0;
  const hasCoreEdu = foundSet.has('education') ? 20 : 0;
  const hasProjects = foundSet.has('projects') ? 10 : 0;
  const hasSummary = foundSet.has('summary') ? 10 : 0;

  const score = hasCoreExp + hasCoreSkills + hasCoreEdu + hasProjects + hasSummary;

  return {
    score: Math.max(0, Math.min(100, score)),
    sectionsFound: matched,
    missingSections: missing,
  };
}

/**
 * Main Pure Scoring Function
 *
 * Analyzes resume against job description and computes a 0–100 score.
 */
export function analyzeResume(input: AnalyzeResumeInput): AnalyzeResumeOutput {
  const { resume, jobDescription } = input;

  // Handle empty or whitespace inputs gracefully
  if (!resume || !jobDescription || resume.trim().length === 0 || jobDescription.trim().length === 0) {
    return {
      score: 0,
      breakdown: {
        skillsMatch: { score: 0, matched: [], missing: [], totalExpected: 0 },
        keywordRelevance: { score: 0, commonKeywords: [], similarityIndex: 0 },
        experienceMatch: {
          score: 0,
          requiredYears: null,
          candidateYears: null,
          seniorityMatch: false,
          requiredSeniority: null,
          candidateSeniority: null,
        },
        educationMatch: {
          score: 0,
          requiredLevel: null,
          candidateLevel: null,
          meetsRequirement: false,
        },
        structuralCompleteness: {
          score: 0,
          sectionsFound: [],
          missingSections: ['experience', 'skills', 'education', 'projects', 'summary'],
        },
      },
    };
  }

  // Parse structured data from both documents
  const resumeData = parseDocument(resume);
  const jdData = parseDocument(jobDescription);

  // Calculate scores for each dimension
  const skillsMatch = calculateSkillsMatch(resumeData.skills, jdData.skills);
  const keywordRelevance = calculateKeywordRelevance(resumeData.tokens, jdData.tokens);
  const experienceMatch = calculateExperienceMatch(resumeData.experience, jdData.experience);
  const educationMatch = calculateEducationMatch(resumeData.education, jdData.education);
  const structuralCompleteness = calculateStructuralCompleteness(resumeData.sections);

  // Compute composite score using the weighted formula:
  // 40% Skills + 25% Keywords + 20% Experience + 10% Education + 5% Structure
  const compositeScore =
    0.40 * skillsMatch.score +
    0.25 * keywordRelevance.score +
    0.20 * experienceMatch.score +
    0.10 * educationMatch.score +
    0.05 * structuralCompleteness.score;

  // Strictly clamp to [0, 100] and round to integer
  const finalScore = Math.max(0, Math.min(100, Math.round(compositeScore)));

  const breakdown: ScoreBreakdown = {
    skillsMatch,
    keywordRelevance,
    experienceMatch,
    educationMatch,
    structuralCompleteness,
  };

  return {
    score: finalScore,
    breakdown,
  };
}
