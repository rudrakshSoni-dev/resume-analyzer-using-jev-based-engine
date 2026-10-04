import { PrismaClient } from '@prisma/client';
import { CreateAnalysisInput } from '../utils/validation.js';
import { analyzeResume } from '../engine/jev/index.js';

const prisma = new PrismaClient();

export const analysisService = {
  /**
   * Orchestrates resume analysis:
   * 1. Validates resume belongs to authenticated user
   * 2. Validates job description belongs to authenticated user
   * 3. Extracts text and calls JEV engine analyzeResume()
   * 4. Stores analysis record in PostgreSQL via Prisma
   */
  async createAnalysis(userId: string, data: CreateAnalysisInput) {
    // 1. Verify resume ownership
    const resume = await prisma.resume.findFirst({
      where: {
        id: data.resumeId,
        userId,
      },
    });

    if (!resume) {
      const error: any = new Error('Resume not found');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify job description ownership
    const job = await prisma.jobDescription.findFirst({
      where: {
        id: data.jobDescriptionId,
        userId,
      },
    });

    if (!job) {
      const error: any = new Error('Job description not found');
      error.statusCode = 404;
      throw error;
    }

    // 3. Execute pure JEV scoring engine
    const analysisResult = analyzeResume({
      resume: resume.rawText,
      jobDescription: job.description,
    });

    // 4. Store Analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        resumeId: resume.id,
        jobDescriptionId: job.id,
        score: analysisResult.score,
      },
      include: {
        resume: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            createdAt: true,
          },
        },
        jobDescription: {
          select: {
            id: true,
            title: true,
            company: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      ...analysis,
      breakdown: analysisResult.breakdown,
    };
  },

  /**
   * Retrieve list of past analyses for the authenticated user
   */
  async getUserAnalyses(userId: string) {
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            createdAt: true,
          },
        },
        jobDescription: {
          select: {
            id: true,
            title: true,
            company: true,
            createdAt: true,
          },
        },
      },
    });

    return analyses;
  },

  /**
   * Retrieve a single analysis by ID with strict ownership validation
   */
  async getAnalysisById(userId: string, analysisId: string) {
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        resume: true,
        jobDescription: true,
      },
    });

    if (!analysis) {
      const error: any = new Error('Analysis not found');
      error.statusCode = 404;
      throw error;
    }

    // Calculate dynamic breakdown for single analysis result view
    const scoringResult = analyzeResume({
      resume: analysis.resume.rawText,
      jobDescription: analysis.jobDescription.description,
    });

    return {
      ...analysis,
      breakdown: scoringResult.breakdown,
    };
  },

  /**
   * Delete an analysis by ID ensuring user ownership
   */
  async deleteAnalysis(userId: string, analysisId: string) {
    const existing = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
    });

    if (!existing) {
      const error: any = new Error('Analysis not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.analysis.delete({
      where: { id: analysisId },
    });

    return { success: true };
  },
};
