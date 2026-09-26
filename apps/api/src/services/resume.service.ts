import { PrismaClient } from '@prisma/client';
import { extractTextFromPdf } from '../utils/pdf.js';

const prisma = new PrismaClient();

export const resumeService = {
  /**
   * Upload and process a PDF resume for an authenticated user.
   * Extracts text and saves metadata & rawText in database.
   */
  async createResume(userId: string, filename: string, buffer: Buffer, fileSize: number) {
    const rawText = await extractTextFromPdf(buffer);

    const resume = await prisma.resume.create({
      data: {
        userId,
        filename,
        rawText,
        fileSize,
      },
    });

    return resume;
  },

  /**
   * Get all resumes belonging to the authenticated user.
   */
  async getUserResumes(userId: string) {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        filename: true,
        rawText: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return resumes;
  },

  /**
   * Get single resume by ID with strict ownership validation.
   * Throws 404 if resume does not exist or does not belong to the user.
   */
  async getResumeById(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
    });

    if (!resume) {
      const error: any = new Error('Resume not found');
      error.statusCode = 404;
      throw error;
    }

    return resume;
  },

  /**
   * Delete a resume by ID ensuring user ownership.
   * Throws 404 if resume does not exist or does not belong to the user.
   */
  async deleteResume(userId: string, resumeId: string) {
    // First verify ownership
    const existing = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
    });

    if (!existing) {
      const error: any = new Error('Resume not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.resume.delete({
      where: { id: resumeId },
    });

    return { success: true };
  },
};
