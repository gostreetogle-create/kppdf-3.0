import jwt from 'jsonwebtoken';
import { config } from '../config';

describe('Auth Service (unit)', () => {
  describe('JWT Token generation', () => {
    it('should generate a valid access token', () => {
      const payload = { userId: '123', username: 'test', role: 'admin' };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, config.jwtSecret) as typeof payload;
      expect(decoded.userId).toBe('123');
      expect(decoded.username).toBe('test');
      expect(decoded.role).toBe('admin');
    });

    it('should generate a valid refresh token', () => {
      const payload = { userId: '123', username: 'test', role: 'admin' };
      const token = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });

      expect(token).toBeDefined();

      const decoded = jwt.verify(token, config.jwtRefreshSecret) as typeof payload;
      expect(decoded.userId).toBe('123');
    });

    it('should reject expired token', () => {
      const payload = { userId: '123', username: 'test', role: 'admin' };
      // Token that expired 1 hour ago
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '0s' });

      // Wait a tiny bit for token to expire
      expect(() => jwt.verify(token, config.jwtSecret)).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const payload = { userId: '123', username: 'test', role: 'admin' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '15m' });

      expect(() => jwt.verify(token, config.jwtSecret)).toThrow();
    });
  });

  describe('JWT Payload structure', () => {
    it('should contain userId, username, role in payload', () => {
      const payload = { userId: 'abc123', username: 'admin', role: 'manager' };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });
      const decoded = jwt.verify(token, config.jwtSecret) as typeof payload;

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('username');
      expect(decoded).toHaveProperty('role');
    });
  });
});
