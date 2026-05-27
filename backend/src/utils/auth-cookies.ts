import type { Response, Request } from 'express';
import { config } from '../config';
import type { TokensPair } from '../types/auth';

export const ACCESS_COOKIE = 'kppdf_access_token';
export const REFRESH_COOKIE = 'kppdf_refresh_token';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieFlags(): string {
  const isProd = config.nodeEnv === 'production';
  const secure = isProd ? '; Secure' : '';
  const sameSite = isProd ? '; SameSite=Strict' : '; SameSite=Lax';
  return `; HttpOnly${secure}${sameSite}; Path=`;
}

/** Прочитать значение cookie из заголовка Cookie */
export function getCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return undefined;
}

/** Установить httpOnly cookies для access + refresh токенов */
export function setAuthCookies(res: Response, tokens: TokensPair): void {
  const flags = cookieFlags();
  res.append(
    'Set-Cookie',
    `${ACCESS_COOKIE}=${encodeURIComponent(tokens.accessToken)}${flags}/; Max-Age=${Math.floor(ACCESS_MAX_AGE_MS / 1000)}`,
  );
  res.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${encodeURIComponent(tokens.refreshToken)}${flags}/api/v1/auth; Max-Age=${Math.floor(REFRESH_MAX_AGE_MS / 1000)}`,
  );
}

/** Очистить auth cookies */
export function clearAuthCookies(res: Response): void {
  const flags = cookieFlags();
  res.append('Set-Cookie', `${ACCESS_COOKIE}=;${flags}/; Max-Age=0`);
  res.append('Set-Cookie', `${REFRESH_COOKIE}=;${flags}/api/v1/auth; Max-Age=0`);
}

/** Access token из Authorization Bearer или cookie */
export function extractAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return getCookie(req, ACCESS_COOKIE);
}

/** Refresh token из body или cookie */
export function extractRefreshToken(req: Request, bodyToken?: string): string | undefined {
  if (bodyToken) return bodyToken;
  return getCookie(req, REFRESH_COOKIE);
}
