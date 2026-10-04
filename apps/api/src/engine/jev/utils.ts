/**
 * JEV Engine Text Processing & Extraction Utilities
 * Pure string & statistical utilities with zero external dependencies.
 */

// Common English stopwords to filter out during keyword extraction
export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'will', 'must', 'shall', 'may', 'might', 'across', 'within',
  'also', 'including', 'responsible', 'seeking', 'working', 'ability', 'required', 'preferred',
  'looking', 'role', 'team', 'company', 'work', 'job', 'candidate', 'experience', 'year', 'years'
]);

// Curated dictionary of technology skills, frameworks, tools, and practices
export const KNOWN_SKILLS = [
  // Languages
  'typescript', 'javascript', 'python', 'java', 'c++', 'c#', 'golang', 'go', 'rust', 'ruby',
  'php', 'swift', 'kotlin', 'scala', 'r', 'dart', 'html', 'css', 'sass', 'sql', 'bash', 'shell',
  // Frontend
  'react', 'react.js', 'next.js', 'nextjs', 'vue', 'vue.js', 'angular', 'svelte', 'tailwind',
  'tailwindcss', 'redux', 'mobx', 'zustand', 'webpack', 'vite', 'graphql', 'rest', 'restful',
  // Backend & Databases
  'node.js', 'nodejs', 'express', 'express.js', 'nestjs', 'fastapi', 'django', 'flask',
  'spring boot', 'ruby on rails', 'asp.net', '.net', 'postgresql', 'postgres', 'mysql',
  'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite', 'prisma', 'typeorm', 'hibernate',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ci/cd',
  'github actions', 'gitlab ci', 'jenkins', 'ansible', 'linux', 'microservices', 'serverless',
  'kafka', 'rabbitmq', 'sqs', 'sns', 'grpc', 'nginx', 'prometheus', 'grafana',
  // AI / ML / Data
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas',
  'numpy', 'nlp', 'llm', 'data engineering', 'spark', 'hadoop', 'airflow', 'dbt',
  // Concepts & Architecture
  'system design', 'distributed systems', 'agile', 'scrum', 'unit testing', 'integration testing',
  'tdd', 'security', 'oauth', 'jwt', 'mvc', 'clean architecture', 'solid principles'
];

/**
 * Related skill families for partial credit across transferable technologies.
 */
export const RELATED_SKILLS: Record<string, string[]> = {
  typescript: ['javascript', 'nodejs'],
  javascript: ['typescript', 'nodejs', 'react', 'next.js'],
  nodejs: ['javascript', 'typescript', 'express'],
  express: ['nodejs', 'javascript', 'typescript'],
  react: ['javascript', 'typescript', 'next.js', 'html', 'css'],
  'next.js': ['react', 'javascript', 'typescript'],
  postgresql: ['sql', 'mysql', 'sqlite'],
  docker: ['kubernetes', 'ci/cd']
};

/**
 * Normalizes text: converts to lowercase, handles hyphenation/slashes, cleans excessive whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s\.\+#\/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple suffix stemmer to unify common inflections (e.g., developer/development, applications/application).
 */
export function stemToken(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3);
  if (token.endsWith('tion') && token.length > 6) return token.slice(0, -4);
  if (token.endsWith('ment') && token.length > 6) return token.slice(0, -4);
  if (token.endsWith('ies') && token.length > 5) return token.slice(0, -3) + 'y';
  if (token.endsWith('ed') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
  return token;
}

/**
 * Tokenizes text into individual words, removing punctuation and short tokens.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return normalized
    .split(/[\s,;:!?()\[\]{}"]+/)
    .map(token => token.replace(/^[^\w+#]+|[^\w+#]+$/g, ''))
    .filter(token => token.length > 1 && !STOPWORDS.has(token))
    .map(token => stemToken(token));
}

/**
 * Generates n-grams (unigrams, bigrams, trigrams) from token list.
 */
export function generateNgrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Extracts skills matching known dictionary entries from text.
 */
export function extractSkills(text: string): string[] {
  const normalized = ` ${normalizeText(text)} `;
  const matchedSkills = new Set<string>();

  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match skill with word boundary or boundary punctuation
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
    if (regex.test(normalized)) {
      matchedSkills.add(canonicalizeSkill(skill));
    }
  }

  return Array.from(matchedSkills).sort();
}

/**
 * Canonicalizes skill variants to a standard representation.
 */
export function canonicalizeSkill(skill: string): string {
  const s = skill.toLowerCase().trim();
  if (s === 'react.js' || s === 'reactjs') return 'react';
  if (s === 'nextjs') return 'next.js';
  if (s === 'vue.js') return 'vue';
  if (s === 'node.js') return 'nodejs';
  if (s === 'express.js') return 'express';
  if (s === 'postgres') return 'postgresql';
  if (s === 'tailwindcss') return 'tailwind';
  if (s === 'k8s') return 'kubernetes';
  if (s === 'golang') return 'go';
  return s;
}

/**
 * Extracts required years of experience from text.
 * e.g., "5+ years", "3-5 years of experience", "minimum 4 years"
 */
export function extractYearsOfExperience(text: string): number | null {
  const normalized = normalizeText(text);
  const patterns = [
    /(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*(?:years?|yrs?)(?:\s+of\s+experience)?/i,
    /(?:at least|minimum|min|over)\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:relevant|practical|professional|work)?\s*experience/i,
    /(\d+)\+?\s*(?:years?|yrs?)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 0 && num <= 30) {
        return num;
      }
    }
  }
  return null;
}

/**
 * Extracts seniority levels indicated in text.
 */
export const SENIORITY_LEVELS = [
  { level: 'lead', weight: 4, keywords: ['lead', 'tech lead', 'team lead', 'principal', 'staff engineer', 'staff developer', 'staff architect', 'architect'] },
  { level: 'senior', weight: 3, keywords: ['senior', 'sr.', 'sr', 'advanced'] },
  { level: 'mid', weight: 2, keywords: ['mid-level', 'intermediate', 'experienced', 'mid'] },
  { level: 'junior', weight: 1, keywords: ['junior', 'jr.', 'jr', 'entry-level', 'graduate', 'intern', 'associate'] },
];

export function extractSeniority(text: string): string | null {
  const normalized = normalizeText(text);
  for (const group of SENIORITY_LEVELS) {
    for (const kw of group.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized)) {
        return group.level;
      }
    }
  }
  return null;
}

/**
 * Extracts education requirements / degrees mentioned in text.
 */
export const EDUCATION_DEGREES = [
  { name: 'phd', keywords: ['phd', 'ph.d', 'doctorate', 'doctoral'] },
  { name: 'master', keywords: ['master', 'masters', 'master\'s', 'm.s.', 'ms', 'msc', 'mba', 'm.tech'] },
  { name: 'bachelor', keywords: ['bachelor', 'bachelors', 'bachelor\'s', 'b.s.', 'bs', 'bsc', 'b.a.', 'ba', 'b.tech', 'b.e.'] },
  { name: 'associate', keywords: ['associate degree', 'associates', 'associate\'s', 'a.s.', 'a.a.'] }
];

export function extractEducation(text: string): string[] {
  const normalized = normalizeText(text);
  const found = new Set<string>();

  for (const degree of EDUCATION_DEGREES) {
    for (const kw of degree.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized)) {
        found.add(degree.name);
        break;
      }
    }
  }

  return Array.from(found);
}

/**
 * Computes Jaccard token similarity between two token sets.
 */
export function computeJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
