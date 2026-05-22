import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface TokensPair {
  accessToken: string;
  refreshToken: string;
}
