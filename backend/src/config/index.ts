import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiryDays: number;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
}

const isProd = process.env.NODE_ENV === 'production';

export const config: Config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'super-secret-access-key-mini-erp-2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-mini-erp-2026',
  accessTokenExpiry: '15m',
  refreshTokenExpiryDays: 7,
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : (isProd || true),
  cookieSameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'none',
};
