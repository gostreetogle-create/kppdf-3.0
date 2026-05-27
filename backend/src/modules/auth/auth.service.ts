import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../../config';
import { UserModel } from '../users/user.model';
import { RoleModel } from '../roles/role.model';
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

    // Загружаем permissions из Role
    const role = await RoleModel.findOne({ name: user.role });
    const permissions = role?.permissions || [];

    // Update lastLogin
    user.lastLoginAt = new Date().toISOString();
    await user.save();

    return this.generateTokens({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      permissions,
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

      // Загружаем permissions из Role
      const role = await RoleModel.findOne({ name: user.role });
      const permissions = role?.permissions || [];

      return this.generateTokens({
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        permissions,
      });
    } catch {
      return null;
    }
  }

  private generateTokens(payload: JwtPayload): TokensPair {
    // Передаём как plain object literal (а не реэкспорт payload),
    // чтобы TS однозначно выбрал object-overload, а не string-overload
    const data = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions || [],
    };

    // jsonwebtoken@9: SignOptions['expiresIn'] = number | StringValue (branded literal).
    // Значение из process.env — широкий string, требуется явный каст.
    const accessOptions: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
    const refreshOptions: SignOptions = { expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'] };

    const accessToken = jwt.sign(data, config.jwtSecret, accessOptions);
    const refreshToken = jwt.sign(data, config.jwtRefreshSecret, refreshOptions);

    return { accessToken, refreshToken };
  }

  /** Декодировать access token в профиль (без проверки — уже проверен при выдаче) */
  profileFromAccessToken(accessToken: string): JwtPayload {
    const decoded = jwt.decode(accessToken);
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid access token payload');
    }
    const p = decoded as JwtPayload;
    return {
      userId: p.userId,
      username: p.username,
      role: p.role,
      permissions: p.permissions ?? [],
    };
  }
}
