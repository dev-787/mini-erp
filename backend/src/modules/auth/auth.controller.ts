import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../../config/index.js';
import {
  findUserByEmail,
  findUserById,
  insertUser,
  createSession,
  findSessionByTokenHash,
  revokeSessionById,
  revokeSessionByTokenHash,
  getUserSessions,
  createInvite as dbCreateInvite,
  findInviteByTokenHash,
  updateInviteStatus,
  getAllInvites,
  getInviteById,
  findPendingInviteByEmail,
  resendInviteInDb,
} from '../../db/index.js';
import {
  AuthenticatedRequest,
  JWTRefreshPayload,
  UserRole,
  User,
  Invite,
} from '../../types/auth.js';

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearAuthCookies = (res: Response): void => {
  res.cookie('access_token', '', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    path: '/',
  });

  res.cookie('refresh_token', '', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    path: '/',
  });
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'Your account has been disabled. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000).toISOString();

    const userAgent = (req.headers['user-agent'] as string) || 'Unknown Device';
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    await createSession({
      id: sessionId,
      user_id: user.id,
      refresh_token_hash: refreshTokenHash,
      user_agent: userAgent,
      ip_address: ipAddress,
      revoked: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    const accessToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      config.jwtAccessSecret,
      { expiresIn: '15m' }
    );

    const refreshTokenJWT = jwt.sign(
      { sessionId, token: rawRefreshToken },
      config.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    setAuthCookies(res, accessToken, refreshTokenJWT);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred during login.' });
  }
};

export const refresh = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const refreshTokenJWT = req.cookies?.refresh_token;
    if (!refreshTokenJWT) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh token cookie missing.' });
    }

    let decoded: JWTRefreshPayload;
    try {
      decoded = jwt.verify(refreshTokenJWT, config.jwtRefreshSecret) as JWTRefreshPayload;
    } catch (err) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const refreshTokenHash = hashToken(decoded.token);
    const session = await findSessionByTokenHash(refreshTokenHash);

    if (!session || session.revoked) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session revoked or invalid.' });
    }

    if (new Date(session.expires_at) < new Date()) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session expired.' });
    }

    const user = await findUserById(session.user_id);
    if (!user || user.status === 'disabled') {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'User inactive.' });
    }

    await revokeSessionById(session.id);

    const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newSessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000).toISOString();

    await createSession({
      id: newSessionId,
      user_id: user.id,
      refresh_token_hash: newRefreshTokenHash,
      user_agent: (req.headers['user-agent'] as string) || 'Unknown Device',
      ip_address: req.ip || req.socket.remoteAddress || '127.0.0.1',
      revoked: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    const newAccessToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      config.jwtAccessSecret,
      { expiresIn: '15m' }
    );

    const newRefreshTokenJWT = jwt.sign(
      { sessionId: newSessionId, token: newRawRefreshToken },
      config.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    setAuthCookies(res, newAccessToken, newRefreshTokenJWT);

    return res.json({
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    clearAuthCookies(res);
    return res.status(500).json({ message: 'Failed to refresh token.' });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const refreshTokenJWT = req.cookies?.refresh_token;
    if (refreshTokenJWT) {
      try {
        const decoded = jwt.verify(refreshTokenJWT, config.jwtRefreshSecret) as JWTRefreshPayload;
        const refreshTokenHash = hashToken(decoded.token);
        await revokeSessionByTokenHash(refreshTokenHash);
      } catch (err) {
        // Ignore token verification errors during logout
      }
    }

    clearAuthCookies(res);
    return res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    clearAuthCookies(res);
    return res.status(500).json({ message: 'Logout failed.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  return res.json({ user: req.user });
};

export const createInvite = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required.' });
    }

    const validRoles: UserRole[] = ['admin', 'sales', 'warehouse', 'accounts'];
    const normRole = (role as string).toLowerCase().trim() as UserRole;
    if (!validRoles.includes(normRole)) {
      return res.status(400).json({ message: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
    }

    const normEmail = (email as string).toLowerCase().trim();
    const existingUser = await findUserByEmail(normEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const pendingInvite = await findPendingInviteByEmail(normEmail);
    if (pendingInvite) {
      return res.status(409).json({ message: 'An invite is already pending for this email' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const inviteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const newInvite: Invite = {
      id: inviteId,
      email: normEmail,
      role: normRole,
      token_hash: tokenHash,
      invited_by: req.user!.id,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    await dbCreateInvite(newInvite);

    const inviteLink = `${req.protocol}://${req.get('host')}/accept-invite?token=${rawToken}`;

    return res.status(201).json({
      message: 'Invite generated successfully',
      invite: {
        id: inviteId,
        email: normEmail,
        role: normRole,
        status: 'pending',
        expires_at: expiresAt,
      },
      rawToken,
      inviteLink,
    });
  } catch (err) {
    console.error('Create invite error:', err);
    return res.status(500).json({ message: 'Failed to create invite.' });
  }
};

export const getInviteByToken = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const token = req.params.token as string;
    if (!token) {
      return res.status(400).json({ message: 'Invite token is required.' });
    }

    const tokenHash = hashToken(token);
    const invite = await findInviteByTokenHash(tokenHash);

    if (!invite) {
      return res.status(404).json({ message: 'Invite token is invalid or not found.' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ message: `Invite is no longer pending (Status: ${invite.status}).` });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await updateInviteStatus(invite.id, 'expired');
      return res.status(400).json({ message: 'Invite link has expired.' });
    }

    return res.json({
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
    });
  } catch (err) {
    console.error('Get invite error:', err);
    return res.status(500).json({ message: 'Failed to validate invite token.' });
  }
};

export const acceptInvite = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ message: 'Token, name, and password are required.' });
    }

    if ((password as string).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const tokenHash = hashToken(token as string);
    const invite = await findInviteByTokenHash(tokenHash);

    if (!invite || invite.status !== 'pending') {
      return res.status(400).json({ message: 'Invalid or already used invite token.' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await updateInviteStatus(invite.id, 'expired');
      return res.status(400).json({ message: 'Invite token has expired.' });
    }

    const existingUser = await findUserByEmail(invite.email);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const newUser: User = {
      id: userId,
      name: (name as string).trim(),
      email: invite.email,
      password_hash: passwordHash,
      role: invite.role,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await insertUser(newUser);
    await updateInviteStatus(invite.id, 'accepted');

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000).toISOString();

    await createSession({
      id: sessionId,
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      user_agent: (req.headers['user-agent'] as string) || 'Unknown Device',
      ip_address: req.ip || req.socket.remoteAddress || '127.0.0.1',
      revoked: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    const accessToken = jwt.sign(
      { id: userId, name: newUser.name, email: newUser.email, role: newUser.role },
      config.jwtAccessSecret,
      { expiresIn: '15m' }
    );

    const refreshTokenJWT = jwt.sign(
      { sessionId, token: rawRefreshToken },
      config.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    setAuthCookies(res, accessToken, refreshTokenJWT);

    return res.status(201).json({
      message: 'Account created and logged in successfully',
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Accept invite error:', err);
    return res.status(500).json({ message: 'Failed to accept invite.' });
  }
};

export const getInvites = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const invites = await getAllInvites();
    return res.json({ invites });
  } catch (err) {
    console.error('Get invites error:', err);
    return res.status(500).json({ message: 'Failed to fetch invites.' });
  }
};

export const revokeInvite = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const invite = await getInviteById(id);

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found.' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ message: `Cannot revoke invite with status '${invite.status}'.` });
    }

    await updateInviteStatus(id, 'revoked');
    return res.json({ message: 'Invite revoked successfully.' });
  } catch (err) {
    console.error('Revoke invite error:', err);
    return res.status(500).json({ message: 'Failed to revoke invite.' });
  }
};

export const resendInvite = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const invite = await getInviteById(id);

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found.' });
    }

    if (['accepted', 'revoked'].includes(invite.status)) {
      return res.status(400).json({ message: `Cannot resend invite with status '${invite.status}'.` });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const updatedInvite = await resendInviteInDb(id, tokenHash, expiresAt);
    if (!updatedInvite) {
      return res.status(500).json({ message: 'Failed to update invite details.' });
    }

    const inviteLink = `${req.protocol}://${req.get('host')}/accept-invite?token=${rawToken}`;

    return res.json({
      message: 'Invite resent successfully',
      invite: {
        id: updatedInvite.id,
        email: updatedInvite.email,
        role: updatedInvite.role,
        status: 'pending',
        expires_at: expiresAt,
      },
      rawToken,
      inviteLink,
    });
  } catch (err) {
    console.error('Resend invite error:', err);
    return res.status(500).json({ message: 'Failed to resend invite.' });
  }
};


export const getSessions = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const sessions = await getUserSessions(req.user!.id);
    return res.json({ sessions });
  } catch (err) {
    console.error('Get sessions error:', err);
    return res.status(500).json({ message: 'Failed to fetch sessions.' });
  }
};

export const revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    await revokeSessionById(id);
    return res.json({ message: 'Session revoked successfully.' });
  } catch (err) {
    console.error('Revoke session error:', err);
    return res.status(500).json({ message: 'Failed to revoke session.' });
  }
};
