import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const createJobDescriptionSchema = z.object({
  title: z.string().trim().min(1, 'Job title is required'),
  company: z.string().trim().optional(),
  description: z.string().trim().min(1, 'Job description is required'),
});

export const createAnalysisSchema = z.object({
  resumeId: z.string().trim().min(1, 'Resume ID is required'),
  jobDescriptionId: z.string().trim().min(1, 'Job description ID is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobDescriptionInput = z.infer<typeof createJobDescriptionSchema>;
export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;
