import { Request } from 'express';

export type UserRole = 'admin' | 'sales' | 'warehouse' | 'accounts';
export type UserStatus = 'active' | 'disabled';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  token_hash: string;
  invited_by: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface InviteResponse {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  expires_at: string;
  invited_by_name?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  user_agent?: string;
  ip_address?: string;
  revoked: boolean;
  expires_at: string;
  created_at: string;
}

export interface SafeSession {
  id: string;
  user_agent?: string;
  ip_address?: string;
  revoked: boolean;
  expires_at: string;
  created_at: string;
}

export interface JWTAccessPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface JWTRefreshPayload {
  sessionId: string;
  token: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
