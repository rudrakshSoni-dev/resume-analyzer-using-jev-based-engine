import { PrismaClient } from '@prisma/client';
import { CreateJobDescriptionInput } from '../utils/validation.js';

const prisma = new PrismaClient();

export const jobService = {
  /**
   * Create a job description for the authenticated user.
   */
  async createJob(userId: string, data: CreateJobDescriptionInput) {
    const job = await prisma.jobDescription.create({
      data: {
        userId,
        title: data.title,
        company: data.company || null,
        description: data.description,
      },
    });

    return job;
  },

  /**
   * Get all job descriptions belonging to the authenticated user.
   */
  async getUserJobs(userId: string) {
    const jobs = await prisma.jobDescription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return jobs;
  },

  /**
   * Get a single job description by ID with strict ownership validation.
   * Throws 404 if not found or belongs to another user.
   */
  async getJobById(userId: string, jobId: string) {
    const job = await prisma.jobDescription.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      const error: any = new Error('Job description not found');
      error.statusCode = 404;
      throw error;
    }

    return job;
  },

  /**
   * Delete a job description by ID ensuring user ownership.
   * Throws 404 if not found or belongs to another user.
   */
  async deleteJob(userId: string, jobId: string) {
    const existing = await prisma.jobDescription.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!existing) {
      const error: any = new Error('Job description not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.jobDescription.delete({
      where: { id: jobId },
    });

    return { success: true };
  },
};
