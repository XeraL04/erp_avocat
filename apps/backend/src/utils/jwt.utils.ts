import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface JwtPayload {
  id: string;
  role: 'superadmin' | 'admin' | 'assistant';
  tenantId?: string; // ← absent pour le superadmin
}

export const genererAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES,
  } as jwt.SignOptions);
};

export const genererRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
};

export const verifierAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
};

export const verifierRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as JwtPayload;
};
