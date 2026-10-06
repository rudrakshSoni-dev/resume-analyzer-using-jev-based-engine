import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { ZodError } from 'zod';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error: any = new Error('JWT_SECRET environment variable is missing in server configuration');
    error.statusCode = 500;
    throw error;
  }
  return secret;
};

const getJwtExpiresIn = (): string => process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const { email, password } = registerSchema.parse(req.body);

    // Register user
    const user = await authService.register(email, password);

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { message: error.errors[0].message },
      });
      return;
    }

    // Check for duplicate email (Prisma unique constraint violation)
    if ((error as any).code === 'P2002') {
      res.status(409).json({
        error: { message: 'Email already registered' },
      });
      return;
    }

    next(error);
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const { email, password } = loginSchema.parse(req.body);

    // Attempt login
    const user = await authService.login(email, password);

    if (!user) {
      res.status(401).json({
        error: { message: 'Invalid email or password' },
      });
      return;
    }

    // Sign JWT with user ID
    const secret = getJwtSecret();
    const signOptions: SignOptions = {
      expiresIn: getJwtExpiresIn() as any,
    };
    const token = jwt.sign(
      { userId: user.id },
      secret,
      signOptions
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Return user without passwordHash
    res.status(200).json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { message: error.errors[0].message },
      });
      return;
    }

    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get currently authenticated user
 * Requires authMiddleware
 */
export async function me(req: Request, res: Response): Promise<void> {
  // req.user is set by authMiddleware
  res.status(200).json(req.user);
}

/**
 * POST /api/auth/logout
 * Logout (clear cookie)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.status(200).json({
    message: 'Logged out successfully',
  });
}
