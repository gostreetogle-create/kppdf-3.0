import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { UserModel } from '../users/user.model';
import type { JwtPayload, TokensPair } from '../../types/auth';

export class AuthService {
  /**
   * Authenticate user by username + password
   */
  async login(username: string, password: string): Promise<TokensPair | null> {
    const user = await UserModel.findOne({ username: username.toLowerCase(), isActive: true });
    if (!user) return null;

    const valid = await user.comparePassword(password);
    if (!valid) return null;

    // Update lastLogin
    user.lastLoginAt = new Date().toISOString();
    await user.save();

    return this.generateTokens({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<TokensPair | null> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload;
      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.isActive) return null;

      return this.generateTokens({
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      });
    } catch {
      return null;
    }
  }

  /**
   * Generate access + refresh token pair
   */
  private generateTokens(payload: JwtPayload): TokensPair {
    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }
}
