import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';

/**
 * Generate an access token for the given admin.
 */
const generateAccessToken = (admin) => {
  return jwt.sign(
    { id: admin._id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate a refresh token for the given admin.
 */
const generateRefreshToken = (admin) => {
  return jwt.sign(
    { id: admin._id, username: admin.username },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Login an admin with username and password.
 * Returns { accessToken, refreshToken, admin } on success.
 * Throws on invalid credentials.
 */
export const loginAdmin = async (username, password) => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  const admin = await Admin.findOne({ username: username.toLowerCase() });
  if (!admin) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const accessToken = generateAccessToken(admin);
  const refreshToken = generateRefreshToken(admin);

  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin._id,
      username: admin.username,
    },
  };
};

/**
 * Issue a new access token using a valid refresh token.
 * Returns { accessToken } on success.
 * Throws if the refresh token is invalid or expired.
 */
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verify admin still exists in the database
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      throw new Error('Admin no longer exists');
    }

    const accessToken = generateAccessToken(admin);

    return { accessToken };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Validate an access token and return the decoded payload.
 * Returns { valid: true, admin: { id, username } } on success.
 * Throws if the token is invalid or expired.
 */
export const validateToken = (accessToken) => {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    return {
      valid: true,
      admin: {
        id: decoded.id,
        username: decoded.username,
      },
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};
