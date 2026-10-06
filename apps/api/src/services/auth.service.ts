import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Number of bcrypt salt rounds from environment
const HASH_ROUNDS = parseInt(process.env.PASSWORD_HASH_ROUNDS || '10', 10);

// Safe user object - excludes passwordHash
const safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

export const authService = {
  /**
   * Register a new user with email and password
   * @returns User object WITHOUT passwordHash
   */
  async register(email: string, password: string) {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);

    // Create user - explicitly exclude passwordHash from response
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: safeUserSelect,
    });

    return user;
  },

  /**
   * Login with email and password
   * @returns User object WITHOUT passwordHash if credentials valid, null otherwise
   */
  async login(email: string, password: string) {
    // Find user by email - we need passwordHash only for verification
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // Return user WITHOUT passwordHash
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  /**
   * Get user by ID for token validation
   * @returns User object WITHOUT passwordHash
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });

    return user;
  },
};
