import jwt from 'jsonwebtoken';

/**
 * Authentication middleware.
 * Verifies the JWT access token from the Authorization header.
 * Attaches decoded admin info to req.admin on success.
 * Returns 401 on missing/invalid/expired tokens.
 */
export const auth = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided. Please login first.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = {
      id: decoded.id,
      username: decoded.username,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired. Please refresh your token.',
        expired: true,
      });
    }

    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid.',
    });
  }
};
