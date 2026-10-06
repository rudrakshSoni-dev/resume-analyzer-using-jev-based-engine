import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service.js';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error: any = new Error('JWT_SECRET environment variable is missing in server configuration');
    error.statusCode = 500;
    throw error;
  }
  return secret;
};

interface JWTPayload {
  userId: string;
}

/**
 * Authentication middleware
 * Validates JWT from HTTP-only cookie and attaches user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({
        error: { message: 'Authentication required' },
      });
      return;
    }

    const secret = getJwtSecret();

    // Verify and decode JWT
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
      res.status(401).json({
        error: { message: 'Invalid or expired token' },
      });
      return;
    }

    // Fetch user from database (without passwordHash)
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({
        error: { message: 'User no longer exists' },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
