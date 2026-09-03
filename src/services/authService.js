// src/services/authService.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { UserModel } from '../models/userModel.js';
import CustomError from '../utils/CustomError.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

async function generateAndStoreRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

export const AuthService = {
  async signup(email, password) {
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw new CustomError('Email already in use', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, passwordHash });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateAndStoreRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  },

  async login(email, password) {
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new CustomError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateAndStoreRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  },

  async refresh(oldRefreshToken) {
    if (!oldRefreshToken) {
      throw new CustomError('Refresh token is required', 400);
    }

    const result = await db.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [oldRefreshToken]
    );
    const stored = result.rows[0];
    if (!stored) {
      throw new CustomError('Invalid or expired refresh token', 401);
    }

    // Token rotation: delete used refresh token
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);

    // Fetch user info for token payload
    const userResult = await db.query('SELECT id, email FROM users WHERE id = $1', [stored.user_id]);
    const user = userResult.rows[0] || { id: stored.user_id };

    const accessToken = generateAccessToken(user);
    const newRefreshToken = await generateAndStoreRefreshToken(stored.user_id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  },
};

export default AuthService;
