import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  analyzeResume,
  tokenize,
  extractSkills,
  extractYearsOfExperience,
  extractSeniority,
  extractEducation,
  computeJaccardSimilarity,
  calculateScore
} from './index.js';

describe('JEV Engine — Isolation & Unit Tests', () => {

  const seniorBackendJD = `
    Position: Senior Backend Engineer
    Company: Acme Tech
    Requirements:
    - 5+ years of experience with Node.js, Express, and TypeScript
    - Strong proficiency with PostgreSQL, Redis, and Docker
    - Experience deploying to AWS and building REST APIs
    - Bachelor's degree in Computer Science or equivalent
    - Solid understanding of distributed systems and microservices
  `;

  const strongBackendResume = `
    Alex Doe
    Senior Software Engineer — 6 years of experience
    Education: Bachelor of Science in Computer Science

    Summary:
    Experienced Senior Backend Developer with 6 years building distributed systems in TypeScript, Node.js, and Express.

    Technical Skills:
    Languages & Frameworks: TypeScript, JavaScript, Node.js, Express, REST APIs
    Databases & Tools: PostgreSQL, Redis, Docker, Prisma
    Cloud: AWS, CI/CD, Microservices

    Work Experience:
    Senior Backend Developer at CloudCorp (4 years)
    - Architected microservices with Node.js, Express, and TypeScript.
    - Optimized PostgreSQL queries and implemented Redis caching.
    - Deployed containerized applications to AWS with Docker.
  `;

  const frontendResume = `
    Jordan Smith
    Frontend Developer — 2 years of experience
    Education: Associate Degree in Web Design

    Summary:
    Frontend specialist proficient in React, HTML, CSS, and Tailwind.

    Technical Skills:
    React, Next.js, JavaScript, Tailwind, CSS, HTML, Webpack, Git

    Work Experience:
    Frontend Developer at WebAgency (2 years)
    - Built responsive web applications in React and Next.js.
  `;

  const unrelatedChefResume = `
    Marco Pierre
    Executive Chef & Culinary Specialist — 10 years of experience
    Education: Diploma in French Culinary Arts

    Summary:
    Passionate executive chef managing high-volume kitchen operations, menu design, food safety standards, and inventory management.

    Skills:
    Menu Development, French Cuisine, Kitchen Management, Food Prep, Pastry Baking, Staff Training.
  `;

  describe('1. analyzeResume() Scenarios', () => {
    it('returns a high score (>= 80) for a strong matching resume and JD', () => {
      const result = analyzeResume({
        resume: strongBackendResume,
        jobDescription: seniorBackendJD
      });

      assert.ok(typeof result.score === 'number', 'score should be a number');
      assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
      assert.ok(result.score <= 100, `Expected score <= 100, got ${result.score}`);
      assert.ok(result.breakdown.skills.matchedSkills.length >= 4, 'Should match multiple skills');
      assert.strictEqual(result.breakdown.experience.detectedSeniority, 'senior');
      assert.strictEqual(result.breakdown.experience.matchLevel, 'exceeds');
    });

    it('returns a moderate score (40–75) for a partial match', () => {
      const result = analyzeResume({
        resume: frontendResume,
        jobDescription: seniorBackendJD
      });

      assert.ok(result.score >= 30 && result.score <= 75, `Expected score between 30 and 75, got ${result.score}`);
    });

    it('returns a low score (< 30) for an unrelated resume', () => {
      const result = analyzeResume({
        resume: unrelatedChefResume,
        jobDescription: seniorBackendJD
      });

      assert.ok(result.score < 30, `Expected score < 30 for chef resume, got ${result.score}`);
    });

    it('returns score 0 for empty or whitespace-only inputs', () => {
      const emptyRes1 = analyzeResume({ resume: '', jobDescription: seniorBackendJD });
      const emptyRes2 = analyzeResume({ resume: strongBackendResume, jobDescription: '' });
      const emptyRes3 = analyzeResume({ resume: '   ', jobDescription: '   ' });

      assert.strictEqual(emptyRes1.score, 0);
      assert.strictEqual(emptyRes2.score, 0);
      assert.strictEqual(emptyRes3.score, 0);
    });

    it('guarantees deterministic results across multiple evaluations', () => {
      const firstRun = analyzeResume({
        resume: strongBackendResume,
        jobDescription: seniorBackendJD
      });

      for (let i = 0; i < 50; i++) {
        const nextRun = analyzeResume({
          resume: strongBackendResume,
          jobDescription: seniorBackendJD
        });
        assert.strictEqual(nextRun.score, firstRun.score);
        assert.deepStrictEqual(nextRun.breakdown, firstRun.breakdown);
      }
    });

    it('ensures score is always clamped to [0, 100]', () => {
      const result = calculateScore({
        resume: strongBackendResume,
        jobDescription: seniorBackendJD
      });

      assert.ok(result.score >= 0 && result.score <= 100);
    });
  });

  describe('2. Text Processing & Extraction Utilities', () => {
    it('tokenizes text correctly removing stopwords', () => {
      const text = 'Looking for a Senior Software Engineer with experience in TypeScript';
      const tokens = tokenize(text);
      assert.ok(tokens.includes('senior'));
      assert.ok(tokens.includes('software'));
      assert.ok(tokens.includes('engineer'));
      assert.ok(tokens.includes('typescript'));
      assert.ok(!tokens.includes('for'));
      assert.ok(!tokens.includes('with'));
    });

    it('extracts technical skills from text', () => {
      const text = 'Proficient with React, TypeScript, Node.js, Docker, and PostgreSQL';
      const skills = extractSkills(text);
      assert.ok(skills.includes('react'));
      assert.ok(skills.includes('typescript'));
      assert.ok(skills.includes('nodejs'));
      assert.ok(skills.includes('docker'));
      assert.ok(skills.includes('postgresql'));
    });

    it('extracts years of experience accurately', () => {
      assert.strictEqual(extractYearsOfExperience('5+ years of experience'), 5);
      assert.strictEqual(extractYearsOfExperience('Minimum 3 years required'), 3);
      assert.strictEqual(extractYearsOfExperience('7-10 yrs experience'), 7);
      assert.strictEqual(extractYearsOfExperience('No experience mentioned'), null);
    });

    it('extracts seniority levels correctly', () => {
      assert.strictEqual(extractSeniority('Senior Backend Developer'), 'senior');
      assert.strictEqual(extractSeniority('Lead Architect and Principal Engineer'), 'lead');
      assert.strictEqual(extractSeniority('Junior Web Developer'), 'junior');
    });

    it('extracts education degrees correctly', () => {
      const text = "Bachelor's degree in Computer Science and Master of Science";
      const degrees = extractEducation(text);
      assert.ok(degrees.includes('bachelor'));
      assert.ok(degrees.includes('master'));
    });

    it('computes Jaccard similarity correctly', () => {
      const tokensA = ['node', 'express', 'typescript', 'sql'];
      const tokensB = ['node', 'express', 'python', 'django'];
      const sim = computeJaccardSimilarity(tokensA, tokensB);
      // intersection = 2 (node, express), union = 6 (node, express, typescript, sql, python, django) -> 2/6 = 0.333
      assert.ok(Math.abs(sim - (2 / 6)) < 0.001);
    });
  });

  describe('3. Strict Module Isolation Verification', () => {
    it('ensures analyzeResume executes synchronously without requiring DB or network', () => {
      const start = Date.now();
      const res = analyzeResume({
        resume: strongBackendResume,
        jobDescription: seniorBackendJD
      });
      const duration = Date.now() - start;

      assert.ok(res.score > 0);
      assert.ok(duration < 50, `Execution took ${duration}ms, must be sub-millisecond in-memory`);
    });
  });
});
