// src/utils/polyfills.ts
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
  };
}
if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = class ImageData {
    width;
    height;
    data;
    constructor(width, height) {
      this.width = width || 0;
      this.height = height || 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class Path2D {
    addPath() {
    }
    closePath() {
    }
    moveTo() {
    }
    lineTo() {
    }
    bezierCurveTo() {
    }
    quadraticCurveTo() {
    }
    arc() {
    }
    arcTo() {
    }
    ellipse() {
    }
    rect() {
    }
  };
}

// src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// src/routes/auth.routes.ts
import { Router } from "express";

// src/controllers/auth.controller.ts
import jwt from "jsonwebtoken";

// src/services/auth.service.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
var prisma = new PrismaClient();
var HASH_ROUNDS = parseInt(process.env.PASSWORD_HASH_ROUNDS || "10", 10);
var safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
};
var authService = {
  /**
   * Register a new user with email and password
   * @returns User object WITHOUT passwordHash
   */
  async register(email, password) {
    const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash
      },
      select: safeUserSelect
    });
    return user;
  },
  /**
   * Login with email and password
   * @returns User object WITHOUT passwordHash if credentials valid, null otherwise
   */
  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      return null;
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  },
  /**
   * Get user by ID for token validation
   * @returns User object WITHOUT passwordHash
   */
  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect
    });
    return user;
  }
};

// src/utils/validation.ts
import { z } from "zod";
var registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});
var loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});
var createJobDescriptionSchema = z.object({
  title: z.string().trim().min(1, "Job title is required"),
  company: z.string().trim().optional(),
  description: z.string().trim().min(1, "Job description is required")
});
var createAnalysisSchema = z.object({
  resumeId: z.string().trim().min(1, "Resume ID is required"),
  jobDescriptionId: z.string().trim().min(1, "Job description ID is required")
});

// src/controllers/auth.controller.ts
import { ZodError } from "zod";
var getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET environment variable is missing in server configuration");
    error.statusCode = 500;
    throw error;
  }
  return secret;
};
var getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "7d";
async function register(req, res, next) {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const user = await authService.register(email, password);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { message: error.errors[0].message }
      });
      return;
    }
    if (error.code === "P2002") {
      res.status(409).json({
        error: { message: "Email already registered" }
      });
      return;
    }
    next(error);
  }
}
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authService.login(email, password);
    if (!user) {
      res.status(401).json({
        error: { message: "Invalid email or password" }
      });
      return;
    }
    const secret = getJwtSecret();
    const signOptions = {
      expiresIn: getJwtExpiresIn()
    };
    const token = jwt.sign(
      { userId: user.id },
      secret,
      signOptions
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days in milliseconds
    });
    res.status(200).json({
      id: user.id,
      email: user.email
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { message: error.errors[0].message }
      });
      return;
    }
    next(error);
  }
}
async function me(req, res) {
  res.status(200).json(req.user);
}
async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.status(200).json({
    message: "Logged out successfully"
  });
}

// src/middleware/auth.middleware.ts
import jwt2 from "jsonwebtoken";
var getJwtSecret2 = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET environment variable is missing in server configuration");
    error.statusCode = 500;
    throw error;
  }
  return secret;
};
async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const secret = getJwtSecret2();
    let decoded;
    try {
      decoded = jwt2.verify(token, secret);
    } catch (error) {
      res.status(401).json({
        error: { message: "Invalid or expired token" }
      });
      return;
    }
    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        error: { message: "User no longer exists" }
      });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email
    };
    next();
  } catch (error) {
    next(error);
  }
}

// src/routes/auth.routes.ts
var router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);
var auth_routes_default = router;

// src/routes/resume.routes.ts
import { Router as Router2 } from "express";

// src/services/resume.service.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";

// src/utils/pdf.ts
async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length < 4 || buffer.toString("ascii", 0, 4) !== "%PDF") {
    const error = new Error("Invalid PDF file format: missing %PDF header");
    error.statusCode = 400;
    throw error;
  }
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    const cleanedText = data.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\0/g, "").trim();
    if (!cleanedText || cleanedText.length === 0) {
      const error = new Error("PDF contains no extractable text");
      error.statusCode = 400;
      throw error;
    }
    return cleanedText;
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    const error = new Error(`Failed to parse PDF: ${err.message || "Invalid or corrupted file"}`);
    error.statusCode = 400;
    throw error;
  } finally {
    await parser.destroy();
  }
}

// src/services/resume.service.ts
var prisma2 = new PrismaClient2();
var resumeService = {
  /**
   * Upload and process a PDF resume for an authenticated user.
   * Extracts text and saves metadata & rawText in database.
   */
  async createResume(userId, filename, buffer, fileSize) {
    const rawText = await extractTextFromPdf(buffer);
    const resume = await prisma2.resume.create({
      data: {
        userId,
        filename,
        rawText,
        fileSize
      }
    });
    return resume;
  },
  /**
   * Get all resumes belonging to the authenticated user.
   */
  async getUserResumes(userId) {
    const resumes = await prisma2.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        filename: true,
        rawText: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return resumes;
  },
  /**
   * Get single resume by ID with strict ownership validation.
   * Throws 404 if resume does not exist or does not belong to the user.
   */
  async getResumeById(userId, resumeId) {
    const resume = await prisma2.resume.findFirst({
      where: {
        id: resumeId,
        userId
      }
    });
    if (!resume) {
      const error = new Error("Resume not found");
      error.statusCode = 404;
      throw error;
    }
    return resume;
  },
  /**
   * Delete a resume by ID ensuring user ownership.
   * Throws 404 if resume does not exist or does not belong to the user.
   */
  async deleteResume(userId, resumeId) {
    const existing = await prisma2.resume.findFirst({
      where: {
        id: resumeId,
        userId
      }
    });
    if (!existing) {
      const error = new Error("Resume not found");
      error.statusCode = 404;
      throw error;
    }
    await prisma2.resume.delete({
      where: { id: resumeId }
    });
    return { success: true };
  }
};

// src/controllers/resume.controller.ts
async function uploadResumeHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({
        error: { message: 'No file uploaded. Provide a PDF with field name "resume"' }
      });
      return;
    }
    const { originalname, buffer, size } = req.file;
    const resume = await resumeService.createResume(req.user.id, originalname, buffer, size);
    res.status(201).json({ resume });
  } catch (error) {
    next(error);
  }
}
async function listResumesHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const resumes = await resumeService.getUserResumes(req.user.id);
    res.status(200).json({ resumes });
  } catch (error) {
    next(error);
  }
}
async function getResumeByIdHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const resume = await resumeService.getResumeById(req.user.id, req.params.id);
    res.status(200).json({ resume });
  } catch (error) {
    next(error);
  }
}
async function deleteResumeHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    await resumeService.deleteResume(req.user.id, req.params.id);
    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// src/middleware/upload.middleware.ts
import multer from "multer";
import path from "path";
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var storage = multer.memoryStorage();
var fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === "application/pdf" && ext === ".pdf") {
    cb(null, true);
  } else {
    const error = new Error("Only PDF files are allowed (.pdf)");
    error.statusCode = 400;
    cb(error);
  }
};
var upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});
var uploadResume = (req, res, next) => {
  const singleUpload = upload.single("resume");
  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: { message: "File size exceeds maximum limit of 5MB" }
          });
        }
        return res.status(400).json({
          error: { message: `Upload error: ${err.message}` }
        });
      }
      return res.status(err.statusCode || 400).json({
        error: { message: err.message || "Invalid file upload" }
      });
    }
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'No file uploaded. Please provide a file with field name "resume"' }
      });
    }
    next();
  });
};

// src/routes/resume.routes.ts
var router2 = Router2();
router2.use(authMiddleware);
router2.post("/", uploadResume, uploadResumeHandler);
router2.get("/", listResumesHandler);
router2.get("/:id", getResumeByIdHandler);
router2.delete("/:id", deleteResumeHandler);
var resume_routes_default = router2;

// src/routes/job.routes.ts
import { Router as Router3 } from "express";

// src/services/job.service.ts
import { PrismaClient as PrismaClient3 } from "@prisma/client";
var prisma3 = new PrismaClient3();
var jobService = {
  /**
   * Create a job description for the authenticated user.
   */
  async createJob(userId, data) {
    const job = await prisma3.jobDescription.create({
      data: {
        userId,
        title: data.title,
        company: data.company || null,
        description: data.description
      }
    });
    return job;
  },
  /**
   * Get all job descriptions belonging to the authenticated user.
   */
  async getUserJobs(userId) {
    const jobs = await prisma3.jobDescription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return jobs;
  },
  /**
   * Get a single job description by ID with strict ownership validation.
   * Throws 404 if not found or belongs to another user.
   */
  async getJobById(userId, jobId) {
    const job = await prisma3.jobDescription.findFirst({
      where: {
        id: jobId,
        userId
      }
    });
    if (!job) {
      const error = new Error("Job description not found");
      error.statusCode = 404;
      throw error;
    }
    return job;
  },
  /**
   * Delete a job description by ID ensuring user ownership.
   * Throws 404 if not found or belongs to another user.
   */
  async deleteJob(userId, jobId) {
    const existing = await prisma3.jobDescription.findFirst({
      where: {
        id: jobId,
        userId
      }
    });
    if (!existing) {
      const error = new Error("Job description not found");
      error.statusCode = 404;
      throw error;
    }
    await prisma3.jobDescription.delete({
      where: { id: jobId }
    });
    return { success: true };
  }
};

// src/controllers/job.controller.ts
import { ZodError as ZodError2 } from "zod";
async function createJobHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const validatedData = createJobDescriptionSchema.parse(req.body);
    const job = await jobService.createJob(req.user.id, validatedData);
    res.status(201).json({ job });
  } catch (error) {
    if (error instanceof ZodError2) {
      res.status(400).json({
        error: { message: error.errors[0].message }
      });
      return;
    }
    next(error);
  }
}
async function listJobsHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const jobs = await jobService.getUserJobs(req.user.id);
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
}
async function getJobByIdHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const job = await jobService.getJobById(req.user.id, req.params.id);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
}
async function deleteJobHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    await jobService.deleteJob(req.user.id, req.params.id);
    res.status(200).json({ message: "Job description deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// src/routes/job.routes.ts
var router3 = Router3();
router3.use(authMiddleware);
router3.post("/", createJobHandler);
router3.get("/", listJobsHandler);
router3.get("/:id", getJobByIdHandler);
router3.delete("/:id", deleteJobHandler);
var job_routes_default = router3;

// src/routes/analysis.routes.ts
import { Router as Router4 } from "express";

// src/services/analysis.service.ts
import { PrismaClient as PrismaClient4 } from "@prisma/client";

// src/engine/jev/utils.ts
var STOPWORDS = /* @__PURE__ */ new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "aren",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "will",
  "must",
  "shall",
  "may",
  "might",
  "across",
  "within",
  "also",
  "including",
  "responsible",
  "seeking",
  "working",
  "ability",
  "required",
  "preferred",
  "looking",
  "role",
  "team",
  "company",
  "work",
  "job",
  "candidate",
  "experience",
  "year",
  "years"
]);
var KNOWN_SKILLS = [
  // Languages
  "typescript",
  "javascript",
  "python",
  "java",
  "c++",
  "c#",
  "golang",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "r",
  "dart",
  "html",
  "css",
  "sass",
  "sql",
  "bash",
  "shell",
  // Frontend
  "react",
  "react.js",
  "next.js",
  "nextjs",
  "vue",
  "vue.js",
  "angular",
  "svelte",
  "tailwind",
  "tailwindcss",
  "redux",
  "mobx",
  "zustand",
  "webpack",
  "vite",
  "graphql",
  "rest",
  "restful",
  // Backend & Databases
  "node.js",
  "nodejs",
  "express",
  "express.js",
  "nestjs",
  "fastapi",
  "django",
  "flask",
  "spring boot",
  "ruby on rails",
  "asp.net",
  ".net",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "elasticsearch",
  "dynamodb",
  "sqlite",
  "prisma",
  "typeorm",
  "hibernate",
  // Cloud & DevOps
  "aws",
  "azure",
  "gcp",
  "google cloud",
  "docker",
  "kubernetes",
  "k8s",
  "terraform",
  "ci/cd",
  "github actions",
  "gitlab ci",
  "jenkins",
  "ansible",
  "linux",
  "microservices",
  "serverless",
  "kafka",
  "rabbitmq",
  "sqs",
  "sns",
  "grpc",
  "nginx",
  "prometheus",
  "grafana",
  // AI / ML / Data
  "machine learning",
  "deep learning",
  "pytorch",
  "tensorflow",
  "scikit-learn",
  "pandas",
  "numpy",
  "nlp",
  "llm",
  "data engineering",
  "spark",
  "hadoop",
  "airflow",
  "dbt",
  // Concepts & Architecture
  "system design",
  "distributed systems",
  "agile",
  "scrum",
  "unit testing",
  "integration testing",
  "tdd",
  "security",
  "oauth",
  "jwt",
  "mvc",
  "clean architecture",
  "solid principles"
];
var KNOWN_SKILL_SET = new Set(KNOWN_SKILLS);
var RELATED_SKILLS = {
  typescript: ["javascript", "nodejs"],
  javascript: ["typescript", "nodejs", "react", "next.js"],
  nodejs: ["javascript", "typescript", "express"],
  express: ["nodejs", "javascript", "typescript"],
  react: ["javascript", "typescript", "next.js", "html", "css"],
  "next.js": ["react", "javascript", "typescript"],
  postgresql: ["sql", "mysql", "sqlite"],
  docker: ["kubernetes", "ci/cd"]
};
function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/[\r\n\t]+/g, " ").replace(/[^\w\s\.\+#\/-]/g, " ").replace(/\s+/g, " ").trim();
}
function stemToken(token) {
  if (token.length <= 4 || /[^a-z]/.test(token) || KNOWN_SKILL_SET.has(token)) return token;
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("tion") && token.length > 6) return token.slice(0, -4);
  if (token.endsWith("ment") && token.length > 6) return token.slice(0, -4);
  if (token.endsWith("ies") && token.length > 5) return token.slice(0, -3) + "y";
  if (token.endsWith("ed") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
  return token;
}
function tokenize(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(/[\s,;:!?()\[\]{}"]+/).map((token) => token.replace(/^[^\w+#]+|[^\w+#]+$/g, "")).filter((token) => token.length > 1 && !STOPWORDS.has(token)).map((token) => stemToken(token));
}
function extractSkills(text) {
  const normalized = ` ${normalizeText(text)} `;
  const matchedSkills = /* @__PURE__ */ new Set();
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, "i");
    if (regex.test(normalized)) {
      matchedSkills.add(canonicalizeSkill(skill));
    }
  }
  return Array.from(matchedSkills).sort();
}
function canonicalizeSkill(skill) {
  const s = skill.toLowerCase().trim();
  if (s === "react.js" || s === "reactjs") return "react";
  if (s === "nextjs") return "next.js";
  if (s === "vue.js") return "vue";
  if (s === "node.js") return "nodejs";
  if (s === "express.js") return "express";
  if (s === "postgres") return "postgresql";
  if (s === "tailwindcss") return "tailwind";
  if (s === "k8s") return "kubernetes";
  if (s === "golang") return "go";
  return s;
}
function extractYearsOfExperience(text) {
  const normalized = normalizeText(text);
  const patterns = [
    /(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*(?:years?|yrs?)(?:\s+of\s+experience)?/i,
    /(?:at least|minimum|min|over)\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:relevant|practical|professional|work)?\s*experience/i,
    /(\d+)\+?\s*(?:years?|yrs?)/i
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
var SENIORITY_LEVELS = [
  { level: "lead", weight: 4, keywords: ["lead", "tech lead", "team lead", "principal", "staff engineer", "staff developer", "staff architect", "architect"] },
  { level: "senior", weight: 3, keywords: ["senior", "sr.", "sr", "advanced"] },
  { level: "mid", weight: 2, keywords: ["mid-level", "intermediate", "experienced", "mid"] },
  { level: "junior", weight: 1, keywords: ["junior", "jr.", "jr", "entry-level", "graduate", "intern", "associate"] }
];
function extractSeniority(text) {
  const normalized = normalizeText(text);
  for (const group of SENIORITY_LEVELS) {
    for (const kw of group.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalized)) {
        return group.level;
      }
    }
  }
  return null;
}
var EDUCATION_DEGREES = [
  { name: "phd", keywords: ["phd", "ph.d", "doctorate", "doctoral"] },
  { name: "master", keywords: ["master", "masters", "master's", "m.s.", "ms", "msc", "mba", "m.tech"] },
  { name: "bachelor", keywords: ["bachelor", "bachelors", "bachelor's", "b.s.", "bs", "bsc", "b.a.", "ba", "b.tech", "b.e."] },
  { name: "associate", keywords: ["associate degree", "associates", "associate's", "a.s.", "a.a."] }
];
function extractEducation(text) {
  const normalized = normalizeText(text);
  const found = /* @__PURE__ */ new Set();
  for (const degree of EDUCATION_DEGREES) {
    for (const kw of degree.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalized)) {
        found.add(degree.name);
        break;
      }
    }
  }
  return Array.from(found);
}
function computeJaccardSimilarity(tokensA, tokensB) {
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

// src/engine/jev/scorer.ts
var WEIGHT_SKILLS = 0.4;
var WEIGHT_EXPERIENCE = 0.25;
var WEIGHT_RELEVANCE = 0.2;
var WEIGHT_EDUCATION = 0.15;
function scoreSkills(resumeText, jdText) {
  const jdSkills = extractSkills(jdText);
  const resumeSkills = extractSkills(resumeText);
  const resumeSkillSet = new Set(resumeSkills);
  if (jdSkills.length === 0) {
    const jdTokens = tokenize(jdText);
    const resumeTokens = new Set(tokenize(resumeText));
    const matchedTokens = [];
    const missingTokens = [];
    for (const token of jdTokens) {
      if (resumeTokens.has(token)) {
        if (!matchedTokens.includes(token)) matchedTokens.push(token);
      } else {
        if (!missingTokens.includes(token)) missingTokens.push(token);
      }
    }
    const total = matchedTokens.length + missingTokens.length;
    const ratio = total > 0 ? matchedTokens.length / total : 0;
    const rawScore2 = Math.round(ratio * 100);
    return {
      score: Math.min(Math.max(rawScore2, 0), 100),
      weight: WEIGHT_SKILLS,
      matchedSkills: matchedTokens.slice(0, 10),
      missingSkills: missingTokens.slice(0, 10),
      totalRequiredSkills: total
    };
  }
  const matchedSkills = [];
  const missingSkills = [];
  let relatedBonus = 0;
  for (const skill of jdSkills) {
    if (resumeSkillSet.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
      const related = RELATED_SKILLS[skill] || [];
      if (related.some((r) => resumeSkillSet.has(r))) {
        relatedBonus += 0.5;
      }
    }
  }
  const effectiveMatches = matchedSkills.length + relatedBonus;
  const matchRatio = Math.min(effectiveMatches / jdSkills.length, 1);
  const rawScore = Math.round(matchRatio * 100);
  return {
    score: Math.min(Math.max(rawScore, 0), 100),
    weight: WEIGHT_SKILLS,
    matchedSkills,
    missingSkills,
    totalRequiredSkills: jdSkills.length
  };
}
function scoreExperience(resumeText, jdText, hasDomainOverlap = true) {
  const reqYears = extractYearsOfExperience(jdText);
  const candYears = extractYearsOfExperience(resumeText);
  const reqSeniority = extractSeniority(jdText);
  const candSeniority = extractSeniority(resumeText);
  let yearsScore = 75;
  let levelMatch = "neutral";
  if (!hasDomainOverlap) {
    yearsScore = 20;
    levelMatch = "underqualified";
  } else if (reqYears !== null && candYears !== null) {
    if (candYears >= reqYears) {
      yearsScore = 100;
      levelMatch = candYears > reqYears ? "exceeds" : "exact";
    } else if (candYears === reqYears - 1) {
      yearsScore = 80;
      levelMatch = "partial";
    } else if (candYears >= Math.floor(reqYears / 2)) {
      yearsScore = 55;
      levelMatch = "partial";
    } else {
      yearsScore = 25;
      levelMatch = "underqualified";
    }
  } else if (reqYears !== null && candYears === null) {
    yearsScore = 45;
    levelMatch = "partial";
  } else if (reqYears === null && candYears !== null) {
    yearsScore = 90;
    levelMatch = "exceeds";
  }
  let seniorityScore = 75;
  if (!hasDomainOverlap) {
    seniorityScore = 15;
  } else if (reqSeniority && candSeniority) {
    const reqLevel = SENIORITY_LEVELS.find((l) => l.level === reqSeniority);
    const candLevel = SENIORITY_LEVELS.find((l) => l.level === candSeniority);
    if (reqLevel && candLevel) {
      if (candLevel.weight >= reqLevel.weight) {
        seniorityScore = 100;
      } else {
        const diff = reqLevel.weight - candLevel.weight;
        seniorityScore = Math.max(30, 100 - diff * 30);
      }
    }
  } else if (reqSeniority && !candSeniority) {
    seniorityScore = 40;
  }
  const combinedScore = Math.round(yearsScore * 0.6 + seniorityScore * 0.4);
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
function scoreRelevance(resumeText, jdText) {
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
  const resumeTokenSet = new Set(resumeTokens);
  const matchedTokens = /* @__PURE__ */ new Set();
  for (const token of jdTokens) {
    if (resumeTokenSet.has(token)) {
      matchedTokens.add(token);
    }
  }
  const scaledScore = Math.min(Math.round(jaccard / 0.18 * 100), 100);
  return {
    score: scaledScore,
    weight: WEIGHT_RELEVANCE,
    tokenOverlapRatio: Math.round(jaccard * 100) / 100,
    matchedKeywords: Array.from(matchedTokens).slice(0, 15)
  };
}
function scoreEducation(resumeText, jdText) {
  const reqDegrees = extractEducation(jdText);
  const candDegrees = extractEducation(resumeText);
  const degreeRank = {
    phd: 4,
    master: 3,
    bachelor: 2,
    associate: 1
  };
  let score = 75;
  let matchedDegrees = [];
  if (reqDegrees.length > 0) {
    const highestReq = Math.max(...reqDegrees.map((d) => degreeRank[d] || 0));
    const highestCand = candDegrees.length > 0 ? Math.max(...candDegrees.map((d) => degreeRank[d] || 0)) : 0;
    matchedDegrees = candDegrees.filter((d) => reqDegrees.includes(d));
    if (highestCand >= highestReq && highestCand > 0) {
      score = 100;
    } else if (highestCand > 0 && highestCand < highestReq) {
      score = 65;
    } else {
      score = 10;
    }
  } else if (candDegrees.length > 0) {
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
function calculateScore(input) {
  const { resume, jobDescription } = input;
  if (!resume || !jobDescription || !resume.trim() || !jobDescription.trim()) {
    const emptyBreakdown = {
      skills: { score: 0, weight: WEIGHT_SKILLS, matchedSkills: [], missingSkills: [], totalRequiredSkills: 0 },
      experience: { score: 0, weight: WEIGHT_EXPERIENCE, requiredYears: null, extractedYears: null, requiredSeniority: null, detectedSeniority: null, matchLevel: "neutral" },
      relevance: { score: 0, weight: WEIGHT_RELEVANCE, tokenOverlapRatio: 0, matchedKeywords: [] },
      education: { score: 0, weight: WEIGHT_EDUCATION, requiredDegree: null, detectedDegrees: [], matchedDegrees: [] }
    };
    return {
      score: 0,
      breakdown: emptyBreakdown
    };
  }
  const skills = scoreSkills(resume, jobDescription);
  const hasDomainOverlap = skills.matchedSkills.length > 0 || skills.score > 0;
  const experience = scoreExperience(resume, jobDescription, hasDomainOverlap);
  const relevance = scoreRelevance(resume, jobDescription);
  const education = scoreEducation(resume, jobDescription);
  const weightedTotal = skills.score * WEIGHT_SKILLS + experience.score * WEIGHT_EXPERIENCE + relevance.score * WEIGHT_RELEVANCE + education.score * WEIGHT_EDUCATION;
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

// src/engine/jev/index.ts
function analyzeResume(input) {
  return calculateScore(input);
}

// src/services/analysis.service.ts
var prisma4 = new PrismaClient4();
var analysisService = {
  /**
   * Orchestrates resume analysis:
   * 1. Validates resume belongs to authenticated user
   * 2. Validates job description belongs to authenticated user
   * 3. Extracts text and calls JEV engine analyzeResume()
   * 4. Stores analysis record in PostgreSQL via Prisma
   */
  async createAnalysis(userId, data) {
    const resume = await prisma4.resume.findFirst({
      where: {
        id: data.resumeId,
        userId
      }
    });
    if (!resume) {
      const error = new Error("Resume not found");
      error.statusCode = 404;
      throw error;
    }
    const job = await prisma4.jobDescription.findFirst({
      where: {
        id: data.jobDescriptionId,
        userId
      }
    });
    if (!job) {
      const error = new Error("Job description not found");
      error.statusCode = 404;
      throw error;
    }
    const analysisResult = analyzeResume({
      resume: resume.rawText,
      jobDescription: job.description
    });
    const analysis = await prisma4.analysis.create({
      data: {
        userId,
        resumeId: resume.id,
        jobDescriptionId: job.id,
        score: analysisResult.score
      },
      include: {
        resume: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            createdAt: true
          }
        },
        jobDescription: {
          select: {
            id: true,
            title: true,
            company: true,
            createdAt: true
          }
        }
      }
    });
    return {
      ...analysis,
      breakdown: analysisResult.breakdown
    };
  },
  /**
   * Retrieve list of past analyses for the authenticated user
   */
  async getUserAnalyses(userId) {
    const analyses = await prisma4.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        resume: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            createdAt: true
          }
        },
        jobDescription: {
          select: {
            id: true,
            title: true,
            company: true,
            createdAt: true
          }
        }
      }
    });
    return analyses;
  },
  /**
   * Retrieve a single analysis by ID with strict ownership validation
   */
  async getAnalysisById(userId, analysisId) {
    const analysis = await prisma4.analysis.findFirst({
      where: {
        id: analysisId,
        userId
      },
      include: {
        resume: true,
        jobDescription: true
      }
    });
    if (!analysis) {
      const error = new Error("Analysis not found");
      error.statusCode = 404;
      throw error;
    }
    const scoringResult = analyzeResume({
      resume: analysis.resume.rawText,
      jobDescription: analysis.jobDescription.description
    });
    return {
      ...analysis,
      breakdown: scoringResult.breakdown
    };
  },
  /**
   * Delete an analysis by ID ensuring user ownership
   */
  async deleteAnalysis(userId, analysisId) {
    const existing = await prisma4.analysis.findFirst({
      where: {
        id: analysisId,
        userId
      }
    });
    if (!existing) {
      const error = new Error("Analysis not found");
      error.statusCode = 404;
      throw error;
    }
    await prisma4.analysis.delete({
      where: { id: analysisId }
    });
    return { success: true };
  }
};

// src/controllers/analysis.controller.ts
import { ZodError as ZodError3 } from "zod";
async function createAnalysisHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const validatedData = createAnalysisSchema.parse(req.body);
    const analysis = await analysisService.createAnalysis(req.user.id, validatedData);
    res.status(201).json({
      id: analysis.id,
      score: analysis.score,
      analysis
    });
  } catch (error) {
    if (error instanceof ZodError3) {
      res.status(400).json({
        error: { message: error.errors[0].message }
      });
      return;
    }
    next(error);
  }
}
async function listAnalysesHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const analyses = await analysisService.getUserAnalyses(req.user.id);
    res.status(200).json({ analyses });
  } catch (error) {
    next(error);
  }
}
async function getAnalysisByIdHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    const analysis = await analysisService.getAnalysisById(req.user.id, req.params.id);
    res.status(200).json({ analysis });
  } catch (error) {
    next(error);
  }
}
async function deleteAnalysisHandler(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: "Authentication required" }
      });
      return;
    }
    await analysisService.deleteAnalysis(req.user.id, req.params.id);
    res.status(200).json({ message: "Analysis deleted successfully" });
  } catch (error) {
    next(error);
  }
}

// src/routes/analysis.routes.ts
var router4 = Router4();
router4.use(authMiddleware);
router4.post("/", createAnalysisHandler);
router4.get("/", listAnalysesHandler);
router4.get("/:id", getAnalysisByIdHandler);
router4.delete("/:id", deleteAnalysisHandler);
var analysis_routes_default = router4;

// src/index.ts
dotenv.config();
var app = express();
var PORT = process.env.PORT || 3002;
app.disable("x-powered-by");
var configuredOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim().replace(/\/+$/, "")) : [];
var allowedOrigins = Array.from(
  /* @__PURE__ */ new Set([
    "https://resume-analyzer-using-jev-based-eng-delta.vercel.app",
    ...configuredOrigins,
    ...process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []
  ])
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/index.js") || req.url.startsWith("/api/index")) {
    const matched = req.headers["x-matched-path"] || req.originalUrl;
    if (matched && !matched.startsWith("/api/index")) {
      req.url = matched;
    }
  }
  next();
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "JEV Resume Analyzer API" });
});
app.use("/api/auth", auth_routes_default);
app.use("/api/resumes", resume_routes_default);
app.use("/api/jobs", job_routes_default);
app.use("/api/analysis", analysis_routes_default);
app.use((req, res) => {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.path}` }
  });
});
app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: { message: "Invalid JSON payload" }
    });
  }
  let statusCode = 500;
  if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (typeof err.status === "number" && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  }
  let message;
  if (statusCode >= 400 && statusCode < 500) {
    message = err.message || "Client error";
  } else {
    console.error("Unhandled internal error:", err);
    message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Internal server error";
  }
  if (message.includes("postgres://") || message.includes("postgresql://")) {
    message = "Internal server error";
  }
  if (process.env.DATABASE_URL && message.includes(process.env.DATABASE_URL)) {
    message = "Internal server error";
  }
  if (process.env.JWT_SECRET && message.includes(process.env.JWT_SECRET)) {
    message = "Internal server error";
  }
  res.status(statusCode).json({
    error: { message }
  });
});
var index_default = app;
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}
export {
  app,
  index_default as default
};
