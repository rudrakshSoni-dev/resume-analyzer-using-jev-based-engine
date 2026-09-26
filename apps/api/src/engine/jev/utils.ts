/**
 * JEV Engine Utilities
 *
 * Pure, deterministic text processing, tokenization, and entity extraction.
 * Hard constraint: This file must NOT import Express, Prisma, HTTP types, auth, cookies, or frontend libraries.
 */

import {
  ExtractedDocumentData,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedSkills,
} from './types.js';

// Common English stopwords to filter out from keyword relevance matching
export const STOP_WORDS = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'll', 'm', 'ma',
  'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'now', 'o', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  're', 's', 'same', 'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 've', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would', 'y', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'role', 'job', 'work', 'working', 'responsibilities',
  'qualifications', 'requirements', 'candidate', 'company', 'team', 'ability', 'able', 'etc',
  'including', 'well', 'using', 'used', 'use', 'experience', 'knowledge', 'years', 'looking',
  'ideal', 'strong', 'demonstrated', 'plus', 'preferred', 'required', 'good', 'excellent'
]);

// Curated Technical and Domain Skills Dictionary (canonical -> regex pattern / aliases)
export const TECHNICAL_SKILLS_MAP: Record<string, string[]> = {
  // Programming Languages
  'javascript': ['javascript', 'js', 'es6', 'es2015', 'ecmascript'],
  'typescript': ['typescript', 'ts'],
  'python': ['python', 'py'],
  'java': ['java'],
  'c++': ['c++', 'cpp'],
  'c#': ['c#', 'csharp', 'c sharp'],
  'golang': ['golang', 'go lang', '\\bgo\\b'],
  'rust': ['rust'],
  'ruby': ['ruby', 'ruby on rails', 'rails'],
  'php': ['php', 'laravel', 'symfony'],
  'swift': ['swift'],
  'kotlin': ['kotlin'],
  'scala': ['scala'],
  'r': ['\\br\\b', 'r-lang', 'rlang'],
  'sql': ['sql', 't-sql', 'pl/sql', 'plsql'],
  'html': ['html', 'html5'],
  'css': ['css', 'css3', 'scss', 'sass', 'less'],
  'bash': ['bash', 'shell script', 'shell scripting', 'zsh', 'powershell'],

  // Frontend Frameworks & Libraries
  'react': ['react', 'react.js', 'reactjs'],
  'next.js': ['next.js', 'nextjs', 'next js'],
  'vue.js': ['vue', 'vue.js', 'vuejs'],
  'angular': ['angular', 'angular.js', 'angularjs', 'angular 2+'],
  'svelte': ['svelte', 'sveltekit'],
  'tailwind css': ['tailwind', 'tailwindcss', 'tailwind css'],
  'bootstrap': ['bootstrap'],
  'redux': ['redux', 'redux toolkit', 'rtk'],
  'graphql': ['graphql', 'apollo graphql', 'relay'],
  'webpack': ['webpack'],
  'vite': ['vite', 'vitejs'],

  // Backend Frameworks & Runtimes
  'node.js': ['node', 'node.js', 'nodejs'],
  'express': ['express', 'express.js', 'expressjs'],
  'nestjs': ['nestjs', 'nest.js', 'nest js'],
  'fastapi': ['fastapi', 'fast api'],
  'django': ['django', 'django rest framework', 'drf'],
  'flask': ['flask'],
  'spring boot': ['spring boot', 'spring framework', 'spring'],
  'asp.net': ['asp.net', '.net core', '.net', 'dotnet', 'entity framework'],

  // Databases & Storage
  'postgresql': ['postgresql', 'postgres', 'psql'],
  'mysql': ['mysql'],
  'mongodb': ['mongodb', 'mongo'],
  'redis': ['redis'],
  'elasticsearch': ['elasticsearch', 'elastic search', 'opensearch'],
  'dynamodb': ['dynamodb'],
  'cassandra': ['cassandra'],
  'sqlite': ['sqlite'],
  'prisma': ['prisma', 'prisma orm'],
  'typeorm': ['typeorm'],
  'mongoose': ['mongoose'],

  // Cloud & DevOps & Infrastructure
  'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'ecs', 'eks', 'rds', 'cloudformation'],
  'azure': ['azure', 'microsoft azure', 'azure devops'],
  'gcp': ['gcp', 'google cloud', 'google cloud platform', 'bigquery'],
  'docker': ['docker', 'docker compose', 'docker-compose', 'containerization', 'containers'],
  'kubernetes': ['kubernetes', 'k8s', 'helm'],
  'terraform': ['terraform'],
  'ansible': ['ansible'],
  'ci/cd': ['ci/cd', 'ci / cd', 'continuous integration', 'continuous deployment', 'github actions', 'gitlab ci', 'jenkins', 'circleci', 'argo cd'],
  'git': ['git', 'github', 'gitlab', 'bitbucket', 'version control'],
  'linux': ['linux', 'ubuntu', 'debian', 'centos', 'redhat'],
  'nginx': ['nginx'],

  // Architecture & Concepts
  'microservices': ['microservices', 'microservice architecture', 'distributed systems'],
  'rest api': ['rest', 'restful', 'rest api', 'rest apis', 'restful api', 'api design'],
  'grpc': ['grpc', 'protobuf'],
  'websocket': ['websocket', 'websockets', 'socket.io'],
  'kafka': ['kafka', 'apache kafka'],
  'rabbitmq': ['rabbitmq'],
  'event-driven': ['event driven', 'event-driven architecture', 'pub/sub', 'sqs', 'sns'],
  'system design': ['system design', 'high availability', 'scalability', 'fault tolerance', 'load balancing'],
  'object-oriented programming': ['oop', 'object oriented programming', 'object-oriented design'],
  'data structures & algorithms': ['data structures', 'algorithms', 'dsa'],

  // Testing & Quality
  'unit testing': ['unit testing', 'unit tests', 'jest', 'mocha', 'chai', 'vitest', 'pytest', 'junit'],
  'end-to-end testing': ['e2e', 'end-to-end testing', 'cypress', 'playwright', 'selenium'],
  'tdd': ['tdd', 'test driven development'],

  // AI & Data & Machine Learning
  'machine learning': ['machine learning', 'ml', 'deep learning', 'neural networks'],
  'ai': ['ai', 'artificial intelligence', 'llm', 'large language models', 'generative ai'],
  'pytorch': ['pytorch'],
  'tensorflow': ['tensorflow', 'keras'],
  'scikit-learn': ['scikit-learn', 'sklearn'],
  'pandas': ['pandas'],
  'numpy': ['numpy'],

  // Security & Best Practices
  'oauth': ['oauth', 'oauth2', 'jwt', 'authentication', 'authorization', 'single sign-on', 'sso'],
  'web security': ['cors', 'csrf', 'xss', 'owasp', 'penetration testing', 'encryption'],
};

export const SOFT_SKILLS_MAP: Record<string, string[]> = {
  'problem solving': ['problem solving', 'analytical skills', 'critical thinking'],
  'communication': ['communication', 'written communication', 'verbal communication', 'presentation skills'],
  'leadership': ['leadership', 'mentoring', 'mentorship', 'team lead', 'coaching'],
  'collaboration': ['collaboration', 'cross-functional', 'teamwork', 'team player'],
  'agile / scrum': ['agile', 'scrum', 'kanban', 'sprint planning', 'jira'],
  'time management': ['time management', 'prioritization', 'multitasking', 'deadline-driven'],
  'adaptability': ['adaptability', 'fast learner', 'self-starter', 'initiative'],
};

// Education degree rank mapping for comparison
export const DEGREE_RANK: Record<string, number> = {
  'phd': 4,
  'doctorate': 4,
  'master': 3,
  'ms': 3,
  'm.s.': 3,
  'mba': 3,
  'bachelor': 2,
  'bs': 2,
  'b.s.': 2,
  'btech': 2,
  'b.tech': 2,
  'ba': 2,
  'b.a.': 2,
  'associate': 1,
  'high school': 0,
};

// Seniority level rank mapping
export const SENIORITY_RANK: Record<string, number> = {
  'intern': 0,
  'junior': 1,
  'entry': 1,
  'associate': 1,
  'mid': 2,
  'intermediate': 2,
  'senior': 3,
  'sr': 3,
  'lead': 4,
  'staff': 5,
  'principal': 6,
  'architect': 6,
  'director': 7,
  'vp': 8,
  'head': 7,
};

/**
 * Normalizes text while preserving critical technical markers (like C++, C#, .NET, Node.js)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .trim();
}

/**
 * Tokenizes text into word tokens, preserving technology names
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  // Match special tech tokens or alphanumeric sequences
  const normalized = normalizeText(text);
  const matches = normalized.match(/[a-z0-9+#.-]+/g) || [];

  return matches
    .map((t) => t.replace(/^[.,]+|[.,]+$/g, '')) // trim trailing or leading dots/commas
    .filter((t) => t.length > 0);
}

/**
 * Generates unigrams, bigrams, and trigrams from tokens
 */
export function generateNgrams(tokens: string[], maxN = 3): string[] {
  const ngrams: string[] = [];
  const len = tokens.length;

  for (let i = 0; i < len; i++) {
    // 1-gram
    ngrams.push(tokens[i]);

    // 2-gram
    if (maxN >= 2 && i + 1 < len) {
      ngrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }

    // 3-gram
    if (maxN >= 3 && i + 2 < len) {
      ngrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
    }
  }

  return ngrams;
}

/**
 * Extracts technical and soft skills from raw text and ngrams
 */
export function extractSkills(text: string): ExtractedSkills {
  const normalized = normalizeText(text);
  const technicalSkills = new Set<string>();
  const softSkills = new Set<string>();

  // Helper to check regex pattern in text with word boundary considerations
  const matchesPattern = (alias: string): boolean => {
    // If alias contains regex special tokens already (e.g. \bgo\b), use directly
    if (alias.startsWith('\\b') || alias.endsWith('\\b')) {
      try {
        const re = new RegExp(alias, 'i');
        return re.test(normalized);
      } catch {
        return false;
      }
    }

    // Escape special characters for regex
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, 'i');
    return re.test(normalized);
  };

  // Check Technical Skills
  for (const [canonical, aliases] of Object.entries(TECHNICAL_SKILLS_MAP)) {
    for (const alias of aliases) {
      if (matchesPattern(alias)) {
        technicalSkills.add(canonical);
        break;
      }
    }
  }

  // Check Soft Skills
  for (const [canonical, aliases] of Object.entries(SOFT_SKILLS_MAP)) {
    for (const alias of aliases) {
      if (matchesPattern(alias)) {
        softSkills.add(canonical);
        break;
      }
    }
  }

  const techList = Array.from(technicalSkills).sort();
  const softList = Array.from(softSkills).sort();

  return {
    technicalSkills: techList,
    softSkills: softList,
    allSkills: [...techList, ...softList],
  };
}

/**
 * Extracts years of experience and seniority mentions from text
 */
export function extractExperience(text: string): ExtractedExperience {
  const normalized = normalizeText(text);
  const yearsFound: number[] = [];

  // Match patterns like: "5+ years", "3-5 years", "4 years of experience", "minimum 5 years"
  const expRegexes = [
    /(\d+)\s*(?:\+|-|\s+to\s+\d+)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?/g,
    /experience\s*(?:of|:)?\s*(\d+)\s*(?:\+|-|\s+to\s+\d+)?\s*(?:years?|yrs?)/g,
    /(?:minimum|at least|over)\s*(\d+)\s*(?:years?|yrs?)/g,
  ];

  for (const re of expRegexes) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 40) {
        yearsFound.push(num);
      }
    }
  }

  // Date range estimation for resume work history (e.g., 2018 - 2023, 2019 - Present)
  const currentYear = new Date().getFullYear();
  const dateRangeRegex = /\b(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(20\d{2}|19\d{2}|present|current)\b/g;
  let dateMatch: RegExpExecArray | null;
  let totalSpanYears = 0;
  let earliestYear = currentYear;
  let hasValidDateRange = false;

  while ((dateMatch = dateRangeRegex.exec(normalized)) !== null) {
    const startYear = parseInt(dateMatch[1], 10);
    const endStr = dateMatch[2].toLowerCase();
    const endYear = (endStr === 'present' || endStr === 'current') ? currentYear : parseInt(endStr, 10);

    if (startYear <= endYear && startYear >= 1970 && endYear <= currentYear + 1) {
      hasValidDateRange = true;
      if (startYear < earliestYear) earliestYear = startYear;
      totalSpanYears += Math.max(1, endYear - startYear);
    }
  }

  let calculatedYears: number | null = null;
  if (yearsFound.length > 0) {
    // If explicit years are stated, take the max reasonable mention
    calculatedYears = Math.max(...yearsFound);
  } else if (hasValidDateRange && earliestYear < currentYear) {
    // Fall back to estimated span from employment date ranges
    calculatedYears = Math.min(currentYear - earliestYear, totalSpanYears);
  }

  // Seniority detection
  const detectedSeniority = new Set<string>();
  for (const [level] of Object.entries(SENIORITY_RANK)) {
    const escaped = level.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(normalized)) {
      detectedSeniority.add(level);
    }
  }

  const seniorityList = Array.from(detectedSeniority);
  let highestSeniority: string | null = null;
  let maxRank = -1;

  for (const level of seniorityList) {
    const rank = SENIORITY_RANK[level] ?? -1;
    if (rank > maxRank) {
      maxRank = rank;
      highestSeniority = level;
    }
  }

  return {
    years: calculatedYears,
    seniorityLevels: seniorityList,
    highestSeniority,
  };
}

/**
 * Extracts educational degrees from text
 */
export function extractEducation(text: string): ExtractedEducation {
  const normalized = normalizeText(text);
  const degreesFound = new Set<string>();

  const degreePatterns: Array<{ name: string; pattern: RegExp }> = [
    { name: 'phd', pattern: /\b(ph\.?d\.?|doctorate|doctor of philosophy)\b/i },
    { name: 'master', pattern: /\b(master'?s?|m\.?s\.?|m\.?sc\.?|m\.?tech|mba)\b/i },
    { name: 'bachelor', pattern: /\b(bachelor'?s?|b\.?s\.?|b\.?sc\.?|b\.?tech|b\.?e\.?|b\.?a\.?)\b/i },
    { name: 'associate', pattern: /\b(associate'?s?|a\.?s\.?|a\.?a\.?)\b/i },
    { name: 'high school', pattern: /\b(high school|ged|diploma)\b/i },
  ];

  for (const { name, pattern } of degreePatterns) {
    if (pattern.test(normalized)) {
      degreesFound.add(name);
    }
  }

  // Fields of study
  const fields = ['computer science', 'software engineering', 'information technology', 'data science', 'electrical engineering', 'mathematics', 'physics', 'statistics'];
  const fieldsFound: string[] = [];

  for (const f of fields) {
    if (normalized.includes(f)) {
      fieldsFound.push(f);
    }
  }

  let highestDegree: string | null = null;
  let maxRank = -1;

  for (const deg of degreesFound) {
    const rank = DEGREE_RANK[deg] ?? -1;
    if (rank > maxRank) {
      maxRank = rank;
      highestDegree = deg;
    }
  }

  return {
    highestDegree,
    degreesFound: Array.from(degreesFound),
    fieldsOfStudy: fieldsFound,
  };
}

/**
 * Detects common resume structural sections
 */
export function extractSections(text: string): string[] {
  const normalized = normalizeText(text);
  const sectionsFound: string[] = [];

  const sectionPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'experience', regex: /\b(experience|work experience|employment history|work history|professional experience)\b/i },
    { name: 'skills', regex: /\b(skills|technical skills|technologies|core competencies|skills & abilities|tech stack)\b/i },
    { name: 'education', regex: /\b(education|academic background|qualifications|academic history)\b/i },
    { name: 'projects', regex: /\b(projects|key projects|personal projects|selected projects|open source)\b/i },
    { name: 'summary', regex: /\b(summary|professional summary|profile|about me|executive summary|objective)\b/i },
    { name: 'certifications', regex: /\b(certifications|certificates|licenses|accreditation)\b/i },
  ];

  for (const { name, regex } of sectionPatterns) {
    if (regex.test(normalized)) {
      sectionsFound.push(name);
    }
  }

  return sectionsFound;
}

/**
 * Filters tokens to retain only informative domain keywords
 */
export function extractInformativeKeywords(tokens: string[]): string[] {
  return tokens.filter((t) => {
    if (t.length < 2) return false;
    if (STOP_WORDS.has(t)) return false;
    if (/^\d+$/.test(t)) return false; // filter pure numbers
    return true;
  });
}

/**
 * Parses all structured data from a document text in a single pass
 */
export function parseDocument(text: string): ExtractedDocumentData {
  const cleanText = normalizeText(text);
  const tokens = tokenize(cleanText);
  const ngrams = generateNgrams(tokens, 3);
  const skills = extractSkills(cleanText);
  const experience = extractExperience(cleanText);
  const education = extractEducation(cleanText);
  const sections = extractSections(cleanText);

  return {
    cleanText,
    tokens,
    ngrams,
    skills,
    experience,
    education,
    sections,
  };
}
